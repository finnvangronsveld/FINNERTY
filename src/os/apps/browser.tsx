'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowClockwise, ArrowSquareOut, BookOpen, CaretLeft, CaretRight, House, Lock, MagnifyingGlass, TextAa } from '@phosphor-icons/react';
import { LINKS } from '@/lib/links';
import type { AppProps } from '../apps';
import { openApp, setTitle } from '../wm';

type Entry = { kind: 'home' } | { kind: 'page'; url: string } | { kind: 'search'; q: string };
type Page = { kind: 'page'; url: string; title: string; siteName?: string; byline?: string | null; html: string; mode: string };
type Results = { kind: 'search'; q: string; results: { title: string; url: string; snippet: string; source: string }[] };

/** Sites built entirely in JavaScript or behind logins: no readable text to fetch. */
const NEEDS_REAL_BROWSER = ['youtube.com', 'youtu.be', 'twitch.tv', 'x.com', 'twitter.com', 'instagram.com', 'tiktok.com', 'facebook.com', 'discord.com', 'netflix.com', 'spotify.com'];

const TOP_SITES = [
  { title: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Main_Page', color: ['#f4f4f4', '#9a9a9a'] },
  { title: 'BBC News', url: 'https://www.bbc.com/news', color: ['#ff9a9a', '#b80000'] },
  { title: 'Hacker News', url: 'https://news.ycombinator.com/', color: ['#ffc58a', '#e86a00'] },
  { title: 'VRT NWS', url: 'https://www.vrt.be/vrtnws/nl/', color: ['#9fd0ff', '#1d4fa0'] },
  { title: 'Finnerty on Twitch', url: LINKS.twitch, color: ['#c3a4ff', '#5b2fd0'] },
  { title: 'Kenney', url: 'https://kenney.nl/', color: ['#ffd27a', '#ea5a12'] },
];

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

function toEntry(input: string): Entry {
  const t = input.trim();
  if (!t) return { kind: 'home' };
  if (/^https?:\/\//i.test(t)) return { kind: 'page', url: t };
  if (/^[\w-]+(\.[\w-]+)+(:\d+)?(\/\S*)?$/.test(t)) return { kind: 'page', url: `https://${t}` };
  return { kind: 'search', q: t };
}

function initial(data?: Record<string, string>): Entry {
  if (data?.q) return { kind: 'search', q: data.q };
  if (data?.url) return toEntry(data.url);
  return { kind: 'home' };
}

export function Browser({ win }: AppProps) {
  const [hist, setHist] = useState<{ stack: Entry[]; i: number }>(() => ({ stack: [initial(win.data)], i: 0 }));
  const [content, setContent] = useState<Page | Results | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [field, setField] = useState('');
  const [big, setBig] = useState(false);
  const [nonce, setNonce] = useState(0);
  const view = useRef<HTMLDivElement>(null);
  const entry = hist.stack[hist.i];

  const go = (e: Entry) => {
    if (e.kind === 'page' && /twitch\.tv\/finnerty_/i.test(e.url)) {
      openApp('twitch');
      return;
    }
    setHist((h) => ({ stack: [...h.stack.slice(0, h.i + 1), e], i: h.i + 1 }));
  };

  // Load whatever the current history entry points at.
  useEffect(() => {
    let alive = true;
    const label = entry.kind === 'home' ? '' : entry.kind === 'search' ? entry.q : entry.url;
    const t = window.setTimeout(() => {
      setField(label);
      setError(null);
      if (entry.kind === 'home') {
        setContent(null);
        setTitle(win.id, 'Top Sites');
        return;
      }
      if (entry.kind === 'page' && NEEDS_REAL_BROWSER.some((h) => hostOf(entry.url).endsWith(h))) {
        setContent(null);
        setError(`${hostOf(entry.url)} only works in a full browser.`);
        setTitle(win.id, hostOf(entry.url));
        return;
      }
      setLoading(true);
      setContent(null);
      const qs = entry.kind === 'search' ? `q=${encodeURIComponent(entry.q)}` : `url=${encodeURIComponent(entry.url)}`;
      fetch(`/api/reader?${qs}`)
        .then(async (r) => {
          const d = await r.json();
          if (!r.ok) throw new Error(d.error ?? 'That page couldn’t be loaded.');
          return d as Page | Results;
        })
        .then((d) => {
          if (!alive) return;
          setContent(d);
          setTitle(win.id, d.kind === 'search' ? `${d.q} - Search` : d.title);
          if (d.kind === 'page') setField(d.url);
          view.current?.scrollTo(0, 0);
        })
        .catch((e: Error) => alive && setError(e.message))
        .finally(() => alive && setLoading(false));
    }, 0);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [entry, nonce, win.id]);

  // Links inside a page stay inside Navigator. Ctrl/Cmd-click opens a new Navigator window.
  const onClick = (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement).closest('a');
    if (!a) return;
    const href = a.getAttribute('href');
    e.preventDefault();
    if (!href) return;
    if (href.startsWith('mailto:')) {
      window.open(href);
      return;
    }
    const base = content?.kind === 'page' ? content.url : undefined;
    let url: URL;
    try {
      url = new URL(href, base);
    } catch {
      return;
    }
    if (base && url.href.split('#')[0] === base.split('#')[0] && url.hash) {
      view.current?.querySelector(`[id="${CSS.escape(url.hash.slice(1))}"]`)?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (e.ctrlKey || e.metaKey || e.button === 1) openApp('browser', { url: url.href });
    else go({ kind: 'page', url: url.href });
  };

  const realUrl = entry.kind === 'page' ? entry.url : null;

  return (
    <div className="browser">
      <div className="toolbar">
        <div className="seg">
          <button type="button" className="seg__btn" aria-label="Back" disabled={hist.i === 0} onClick={() => setHist((h) => ({ ...h, i: h.i - 1 }))}>
            <CaretLeft size={13} weight="bold" />
          </button>
          <button
            type="button"
            className="seg__btn"
            aria-label="Forward"
            disabled={hist.i >= hist.stack.length - 1}
            onClick={() => setHist((h) => ({ ...h, i: h.i + 1 }))}
          >
            <CaretRight size={13} weight="bold" />
          </button>
        </div>
        <button type="button" className="tb-icon" aria-label="Reload" onClick={() => setNonce((n) => n + 1)}>
          <ArrowClockwise size={14} weight="bold" />
        </button>
        <button type="button" className="tb-icon" aria-label="Top Sites" onClick={() => go({ kind: 'home' })}>
          <House size={14} weight="fill" />
        </button>
        <form
          className="address"
          onSubmit={(e) => {
            e.preventDefault();
            go(toEntry(field));
          }}
        >
          {entry.kind === 'page' && entry.url.startsWith('https') ? (
            <Lock size={11} weight="fill" className="address__lock" aria-hidden />
          ) : (
            <MagnifyingGlass size={11} weight="bold" className="address__lock" aria-hidden />
          )}
          <input
            className="address__input"
            value={field}
            placeholder="Search or type a web address"
            aria-label="Address or search"
            onChange={(e) => setField(e.target.value)}
            onFocus={(e) => e.target.select()}
          />
          {loading && <span className="address__progress" aria-hidden />}
        </form>
        <button type="button" className="tb-icon" aria-label="Text size" data-on={big} onClick={() => setBig(!big)}>
          <TextAa size={14} weight="bold" />
        </button>
        <button
          type="button"
          className="tb-icon"
          aria-label="Open the real page in a new browser tab"
          disabled={!realUrl}
          onClick={() => realUrl && window.open(realUrl, '_blank', 'noopener,noreferrer')}
        >
          <ArrowSquareOut size={14} weight="bold" />
        </button>
      </div>
      <div className="bookmarks">
        {TOP_SITES.slice(0, 5).map((s) => (
          <button key={s.url} type="button" className="bookmarks__item" onClick={() => go({ kind: 'page', url: s.url })}>
            {s.title}
          </button>
        ))}
      </div>

      <div className="browser__view" ref={view} onClick={onClick} onAuxClick={onClick} data-big={big}>
        {entry.kind === 'home' && (
          <div className="topsites">
            <h2 className="topsites__title">Top Sites</h2>
            <div className="topsites__grid">
              {TOP_SITES.map((s) => (
                <button key={s.url} type="button" className="topsite" onClick={() => go({ kind: 'page', url: s.url })}>
                  <span className="topsite__thumb" style={{ background: `linear-gradient(160deg, ${s.color[0]}, ${s.color[1]})` }}>
                    <span className="topsite__host">{hostOf(s.url)}</span>
                  </span>
                  <span className="topsite__name">{s.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {entry.kind !== 'home' && loading && !content && (
          <div className="reader reader--loading" aria-busy="true">
            <span className="skel skel--title" />
            <span className="skel" />
            <span className="skel" />
            <span className="skel skel--short" />
          </div>
        )}

        {error && (
          <div className="blocked">
            <p className="blocked__title">{error}</p>
            <p className="blocked__text">
              Navigator shows a cleaned-up version of web pages. Video sites, apps and pages behind a login need a real browser.
            </p>
            {realUrl && (
              <button type="button" className="gel gel--blue" onClick={() => window.open(realUrl, '_blank', 'noopener,noreferrer')}>
                Open {hostOf(realUrl)}
              </button>
            )}
          </div>
        )}

        {!error && content?.kind === 'search' && entry.kind === 'search' && (
          <div className="serp">
            <p className="serp__meta">Results for “{content.q}”</p>
            {content.results.length === 0 && <p className="serp__meta">No results. Try other words, or type a web address.</p>}
            {content.results.map((r) => (
              <article key={r.url} className="serp__hit">
                <a href={r.url} className="serp__title">
                  {r.title}
                </a>
                <span className="serp__url">{r.url.replace(/^https?:\/\//, '')}</span>
                <p className="serp__snippet">{r.snippet}</p>
              </article>
            ))}
          </div>
        )}

        {!error && content?.kind === 'page' && entry.kind === 'page' && (
          <article className="reader" lang="">
            <p className="reader__site">
              {content.mode === 'article' && <BookOpen size={12} weight="fill" />} {content.siteName ?? hostOf(content.url)}
              <span className="reader__badge">{content.mode === 'article' ? 'Reader' : 'Simplified'}</span>
            </p>
            {content.mode === 'article' && <h1 className="reader__title">{content.title}</h1>}
            {content.byline && <p className="reader__byline">{content.byline}</p>}
            {/* Sanitised on the server: no scripts, styles, forms or frames. */}
            <div className="reader__body" dangerouslySetInnerHTML={{ __html: content.html }} />
          </article>
        )}
      </div>
    </div>
  );
}
