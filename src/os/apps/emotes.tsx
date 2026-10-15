'use client';
import { useEffect, useMemo, useState } from 'react';
import { Copy, MagnifyingGlass } from '@phosphor-icons/react';
import { notify } from '../store';
import { play } from '../wm';

type Emote = { name: string; url: string; source: 'Twitch' | '7TV' | 'BTTV'; tier?: string; animated?: boolean };
const SOURCES = ['All', 'Twitch', '7TV', 'BTTV'] as const;

/** The channel's emotes. Click one to see it big; the button copies its name for chat. */
export function Emotes() {
  const [emotes, setEmotes] = useState<Emote[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<(typeof SOURCES)[number]>('All');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Emote | null>(null);

  useEffect(() => {
    fetch('/api/twitch/emotes')
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setEmotes(d.emotes);
        setSel(d.emotes[0] ?? null);
      })
      .catch((e: Error) => setError(e.message || 'Couldn’t load emotes.'));
  }, []);

  const shown = useMemo(
    () => (emotes ?? []).filter((e) => (source === 'All' || e.source === source) && e.name.toLowerCase().includes(q.toLowerCase())),
    [emotes, source, q],
  );

  const copy = async (e: Emote) => {
    try {
      await navigator.clipboard.writeText(e.name);
      play('tick');
      notify('Copied', `${e.name} is on your clipboard. Paste it in chat!`, 'emotes');
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className="emotes">
      <div className="toolbar">
        <div className="seg">
          {SOURCES.map((s) => (
            <button key={s} type="button" className="seg__btn" data-on={source === s} onClick={() => setSource(s)}>
              {s}
            </button>
          ))}
        </div>
        <label className="searchfield">
          <MagnifyingGlass size={12} weight="bold" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search emotes" aria-label="Search emotes" />
        </label>
      </div>
      <div className="emotes__main">
        <div className="emotes__grid">
          {error && <p className="files__empty">{error}</p>}
          {emotes && shown.length === 0 && <p className="files__empty">No emotes here.</p>}
          {shown.map((e) => (
            <button
              key={`${e.source}:${e.name}`}
              type="button"
              className="emote"
              data-selected={sel === e}
              title={e.name}
              onClick={() => setSel(e)}
              onDoubleClick={() => copy(e)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={e.url} alt={e.name} loading="lazy" />
            </button>
          ))}
        </div>
        <aside className="emotes__info">
          {sel ? (
            <>
              <span className="emotes__big">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sel.url} alt={sel.name} />
              </span>
              <b className="emotes__name">{sel.name}</b>
              <span className="emotes__meta">
                {sel.source}
                {sel.tier ? ` · ${sel.tier}` : ''}
                {sel.animated ? ' · animated' : ''}
              </span>
              <button type="button" className="gel gel--blue" onClick={() => copy(sel)}>
                <Copy size={13} weight="bold" /> Copy name
              </button>
            </>
          ) : (
            <span className="emotes__meta">{emotes ? 'Pick an emote' : 'Loading…'}</span>
          )}
        </aside>
      </div>
    </div>
  );
}
