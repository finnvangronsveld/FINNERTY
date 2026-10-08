'use client';
import { useState } from 'react';
import { ArrowClockwise, ArrowSquareOut, CaretLeft, CaretRight, House, Lock } from '@phosphor-icons/react';
import { LINKS } from '@/lib/links';
import type { AppProps } from '../apps';
import { openApp, setData, setTitle } from '../wm';

const HOME = 'finnos://top-sites';

/** Sites that refuse to be shown inside another page (X-Frame-Options / CSP). */
const BLOCKS_FRAMES = [
  'youtube.com', 'youtu.be', 'google.', 'x.com', 'twitter.com', 'instagram.com', 'tiktok.com', 'facebook.com',
  'github.com', 'reddit.com', 'discord.com', 'amazon.', 'netflix.com', 'linkedin.com', 'spotify.com', 'twitch.tv',
];

const TOP_SITES = [
  { title: 'Finnerty on Twitch', url: LINKS.twitch, color: ['#c3a4ff', '#5b2fd0'] },
  { title: 'Finnerty on YouTube', url: LINKS.youtube, color: ['#ff9a9a', '#c9161d'] },
  { title: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Special:Random', color: ['#f4f4f4', '#9a9a9a'] },
  { title: 'Internet Archive', url: 'https://web.archive.org/', color: ['#d8d0c0', '#6e6450'] },
  { title: 'OpenStreetMap', url: 'https://www.openstreetmap.org/export/embed.html?bbox=4.2,50.7,5.6,51.4', color: ['#bfe7b0', '#3f8a35'] },
  { title: 'Kenney (site sounds)', url: 'https://kenney.nl/assets', color: ['#ffd27a', '#ea5a12'] },
];

function normalize(input: string) {
  const t = input.trim();
  if (!t) return HOME;
  if (/^(https?:|finnos:)/i.test(t)) return t;
  if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(t)) return `https://${t}`;
  return `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(t)}`;
}

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

export function Browser({ win }: AppProps) {
  const url = win.data?.url ?? HOME;
  const [field, setField] = useState(url === HOME ? '' : url);
  const [hist, setHist] = useState<{ back: string[]; fwd: string[] }>({ back: [], fwd: [] });
  const [nonce, setNonce] = useState(0);
  const [loading, setLoading] = useState(false);

  const host = hostOf(url);
  const blocked = url !== HOME && BLOCKS_FRAMES.some((b) => host.includes(b));

  const go = (next: string) => {
    if (/twitch\.tv\/finnerty_/i.test(next)) {
      openApp('twitch');
      return;
    }
    setHist((h) => ({ back: [...h.back, url], fwd: [] }));
    setData(win.id, { url: next });
    setField(next === HOME ? '' : next);
    setTitle(win.id, next === HOME ? 'Top Sites' : hostOf(next) || 'Navigator');
    setLoading(next !== HOME);
  };

  const step = (dir: 'back' | 'fwd') => {
    const target = dir === 'back' ? hist.back.at(-1) : hist.fwd[0];
    if (!target) return;
    setHist((h) =>
      dir === 'back'
        ? { back: h.back.slice(0, -1), fwd: [url, ...h.fwd] }
        : { back: [...h.back, url], fwd: h.fwd.slice(1) },
    );
    setData(win.id, { url: target });
    setField(target === HOME ? '' : target);
  };

  return (
    <div className="browser">
      <div className="toolbar">
        <div className="seg">
          <button type="button" className="seg__btn" aria-label="Back" disabled={!hist.back.length} onClick={() => step('back')}>
            <CaretLeft size={13} weight="bold" />
          </button>
          <button type="button" className="seg__btn" aria-label="Forward" disabled={!hist.fwd.length} onClick={() => step('fwd')}>
            <CaretRight size={13} weight="bold" />
          </button>
        </div>
        <button type="button" className="tb-icon" aria-label="Reload" onClick={() => setNonce((n) => n + 1)}>
          <ArrowClockwise size={14} weight="bold" />
        </button>
        <button type="button" className="tb-icon" aria-label="Top Sites" onClick={() => go(HOME)}>
          <House size={14} weight="fill" />
        </button>
        <form
          className="address"
          onSubmit={(e) => {
            e.preventDefault();
            go(normalize(field));
          }}
        >
          {url.startsWith('https') && <Lock size={11} weight="fill" className="address__lock" aria-hidden />}
          <input
            className="address__input"
            value={field}
            placeholder="Search Wikipedia or type an address"
            aria-label="Address"
            onChange={(e) => setField(e.target.value)}
            onFocus={(e) => e.target.select()}
          />
          {loading && <span className="address__progress" aria-hidden />}
        </form>
        <button
          type="button"
          className="tb-icon"
          aria-label="Open in a new browser tab"
          disabled={url === HOME}
          onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
        >
          <ArrowSquareOut size={14} weight="bold" />
        </button>
      </div>
      <div className="bookmarks">
        {TOP_SITES.slice(0, 4).map((s) => (
          <button key={s.url} type="button" className="bookmarks__item" onClick={() => go(s.url)}>
            {s.title}
          </button>
        ))}
      </div>

      <div className="browser__view">
        {url === HOME ? (
          <div className="topsites">
            <h2 className="topsites__title">Top Sites</h2>
            <div className="topsites__grid">
              {TOP_SITES.map((s) => (
                <button key={s.url} type="button" className="topsite" onClick={() => go(s.url)}>
                  <span className="topsite__thumb" style={{ background: `linear-gradient(160deg, ${s.color[0]}, ${s.color[1]})` }}>
                    <span className="topsite__host">{hostOf(s.url)}</span>
                  </span>
                  <span className="topsite__name">{s.title}</span>
                </button>
              ))}
            </div>
          </div>
        ) : blocked ? (
          <div className="blocked">
            <p className="blocked__title">{host} can’t be shown inside FinnOS</p>
            <p className="blocked__text">This site doesn’t allow other pages to display it. You can open it in a real browser tab instead.</p>
            <button type="button" className="gel gel--blue" onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}>
              Open {host}
            </button>
          </div>
        ) : (
          <iframe
            key={`${url}#${nonce}`}
            className="browser__frame"
            src={url}
            title={host}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="no-referrer"
            onLoad={() => setLoading(false)}
          />
        )}
      </div>
    </div>
  );
}
