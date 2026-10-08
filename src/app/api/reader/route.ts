import { lookup } from 'node:dns/promises';
import net from 'node:net';
import { NextResponse } from 'next/server';
import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';
import sanitizeHtml from 'sanitize-html';

/**
 * Navigator's reader proxy. Fetches a public web page on the server and returns a cleaned,
 * script-free version that FinnOS can show inside its own window.
 *
 * Safety: only http(s) on ports 80/443, no private/loopback/link-local/metadata addresses
 * (checked on every redirect hop), 3 MB and 8 s limits, a small per-IP rate limit, and the
 * output is sanitised to a short allowlist of tags with no scripts, styles, forms or iframes.
 */

export const maxDuration = 20;

const UA = 'Mozilla/5.0 (compatible; FinnOS-Reader/1.0; +https://finnerty.vercel.app)';
const MAX_BYTES = 3 * 1024 * 1024;

const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > 40;
}

function privateV4(ip: string) {
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19))
  );
}

function privateIp(ip: string) {
  if (net.isIPv4(ip)) return privateV4(ip);
  const v6 = ip.toLowerCase();
  if (v6.startsWith('::ffff:')) return privateV4(v6.slice(7));
  return v6 === '::' || v6 === '::1' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe8') || v6.startsWith('fe9') || v6.startsWith('fea') || v6.startsWith('feb');
}

async function assertPublic(url: URL) {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Only web pages can be opened.');
  if (url.port && url.port !== '80' && url.port !== '443') throw new Error('That port isn’t allowed.');
  if (url.username || url.password) throw new Error('Addresses with passwords aren’t allowed.');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (!host || host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) throw new Error('That address isn’t public.');
  const addrs = net.isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (!addrs.length || addrs.some((a) => privateIp(a.address))) throw new Error('That address isn’t public.');
}

async function fetchPage(start: URL) {
  let url = start;
  for (let hop = 0; hop < 5; hop++) {
    await assertPublic(url);
    const res = await fetch(url, {
      redirect: 'manual',
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,text/plain;q=0.8', 'Accept-Language': 'en,nl;q=0.8' },
      signal: AbortSignal.timeout(8000),
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      url = new URL(res.headers.get('location')!, url);
      continue;
    }
    if (!res.ok) throw new Error(`The site answered with error ${res.status}.`);
    const type = res.headers.get('content-type') ?? '';
    if (!/text\/html|application\/xhtml|text\/plain/i.test(type)) throw new Error('Navigator can only show web pages, not files.');
    const reader = res.body?.getReader();
    if (!reader) throw new Error('The page was empty.');
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
    const charset = /charset=([\w-]+)/i.exec(type)?.[1] ?? 'utf-8';
    let text: string;
    try {
      text = new TextDecoder(charset).decode(Buffer.concat(chunks));
    } catch {
      text = new TextDecoder().decode(Buffer.concat(chunks));
    }
    return { url, text, plain: /text\/plain/i.test(type) };
  }
  throw new Error('Too many redirects.');
}

function absolute(href: string | undefined, base: URL) {
  if (!href) return null;
  try {
    const u = new URL(href.trim(), base);
    return u.protocol === 'http:' || u.protocol === 'https:' || u.protocol === 'mailto:' ? u.href : null;
  } catch {
    return null;
  }
}

function clean(html: string, base: URL) {
  return sanitizeHtml(html, {
    allowedTags: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr', 'a', 'img', 'figure', 'figcaption', 'ul', 'ol', 'li',
      'blockquote', 'pre', 'code', 'em', 'strong', 'b', 'i', 'u', 's', 'small', 'sub', 'sup', 'mark', 'abbr', 'time',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'dl', 'dt', 'dd', 'span', 'div', 'section',
      'article', 'header', 'footer', 'main', 'nav', 'aside', 'details', 'summary',
    ],
    allowedAttributes: {
      a: ['href', 'title'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      th: ['colspan', 'rowspan'],
      td: ['colspan', 'rowspan'],
      time: ['datetime'],
      abbr: ['title'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false,
    exclusiveFilter: (frame) => frame.tag === 'img' && !frame.attribs.src,
    transformTags: {
      a: (tag, attribs) => {
        const href = absolute(attribs.href, base);
        return { tagName: 'a', attribs: href ? { href, ...(attribs.title ? { title: attribs.title } : {}) } : {} };
      },
      img: (tag, attribs) => {
        const lazy = attribs['data-src'] || attribs['data-lazy-src'] || attribs.srcset?.split(',')[0]?.trim().split(/\s+/)[0];
        const src = absolute(attribs.src && !attribs.src.startsWith('data:') ? attribs.src : lazy, base);
        const ok = src?.startsWith('https://') ? src : undefined;
        const out: Record<string, string> = ok ? { src: ok, alt: attribs.alt ?? '', loading: 'lazy' } : {};
        return { tagName: 'img', attribs: out };
      },
    },
  });
}

async function search(q: string) {
  const [wiki, ddg] = await Promise.allSettled([
    fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=8&srsearch=${encodeURIComponent(q)}`, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(6000),
    }).then((r) => r.json()),
    fetch(`https://api.duckduckgo.com/?format=json&no_html=1&skip_disambig=1&q=${encodeURIComponent(q)}`, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(6000),
    }).then((r) => r.json()),
  ]);
  const results: { title: string; url: string; snippet: string; source: string }[] = [];
  if (ddg.status === 'fulfilled' && ddg.value?.AbstractURL && ddg.value?.AbstractText) {
    results.push({ title: ddg.value.Heading || q, url: ddg.value.AbstractURL, snippet: ddg.value.AbstractText, source: ddg.value.AbstractSource || 'DuckDuckGo' });
  }
  if (wiki.status === 'fulfilled') {
    for (const r of wiki.value?.query?.search ?? []) {
      results.push({
        title: r.title,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, '_'))}`,
        snippet: String(r.snippet ?? '').replace(/<[^>]+>/g, ''),
        source: 'Wikipedia',
      });
    }
  }
  if (ddg.status === 'fulfilled') {
    for (const t of ddg.value?.RelatedTopics ?? []) {
      if (t?.FirstURL && t?.Text && results.length < 14) results.push({ title: t.Text.split(' - ')[0], url: t.FirstURL, snippet: t.Text, source: 'DuckDuckGo' });
    }
  }
  // The same page can come from both sources; keep the first.
  const seen = new Set<string>();
  return results.filter((r) => {
    const key = r.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (limited(ip)) return NextResponse.json({ error: 'Too many pages at once. Wait a moment.' }, { status: 429 });

  const params = new URL(request.url).searchParams;
  const q = params.get('q');
  if (q) {
    const results = await search(q.slice(0, 200));
    return NextResponse.json({ kind: 'search', q, results }, { headers: { 'Cache-Control': 'public, s-maxage=600' } });
  }

  let target: URL;
  try {
    target = new URL(params.get('url') ?? '');
  } catch {
    return NextResponse.json({ error: 'That isn’t a web address.' }, { status: 400 });
  }

  try {
    const page = await fetchPage(target);
    if (page.plain) {
      const html = `<pre>${page.text.slice(0, 200_000).replace(/[<&>]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]!)}</pre>`;
      return NextResponse.json({ kind: 'page', url: page.url.href, title: page.url.pathname.split('/').pop() || page.url.hostname, html, mode: 'text' });
    }
    const { document } = parseHTML(page.text);
    const title = document.querySelector('title')?.textContent?.trim() || page.url.hostname;
    const siteName = document.querySelector('meta[property="og:site_name"]')?.getAttribute('content') ?? page.url.hostname.replace(/^www\./, '');

    let html = '';
    let mode: 'article' | 'page' = 'page';
    let byline: string | null = null;
    try {
      const article = new Readability(document.cloneNode(true) as unknown as Document, { charThreshold: 400 }).parse();
      if (article?.content && (article.textContent?.length ?? 0) > 600) {
        html = clean(article.content, page.url);
        byline = article.byline ?? null;
        mode = 'article';
      }
    } catch {
      /* fall back to the simplified page */
    }
    if (!html) {
      document.querySelectorAll('script, style, noscript, iframe, svg, form, template, link, meta').forEach((n) => n.remove());
      html = clean(document.body?.innerHTML ?? '', page.url);
    }
    return NextResponse.json(
      { kind: 'page', url: page.url.href, title, siteName, byline, html: html.slice(0, 1_500_000), mode },
      { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600' } },
    );
  } catch (e) {
    const message = e instanceof Error && !/fetch failed|aborted|timeout/i.test(e.message) ? e.message : 'The site didn’t respond in time.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
