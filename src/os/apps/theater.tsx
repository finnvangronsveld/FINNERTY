'use client';
import { useEffect, useState } from 'react';
import { ArrowLeft, Eye, FilmSlate, Play, Television } from '@phosphor-icons/react';

type Clip = { id: string; title: string; thumb: string; views: number; date: string; duration: number; by: string };
type Video = { id: string; title: string; thumb: string | null; views: number; date: string; duration: string };
type Data = { clips: Clip[]; videos: Video[] };

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtViews = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

/** Clips and past broadcasts from Twitch, played inside FinnOS. */
export function Theater() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'clips' | 'videos'>('clips');
  const [playing, setPlaying] = useState<{ kind: 'clip' | 'video'; id: string; title: string } | null>(null);
  const host = typeof window === 'undefined' ? 'localhost' : window.location.hostname;

  useEffect(() => {
    fetch('/api/twitch/media')
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setData(d);
      })
      .catch((e: Error) => setError(e.message || 'Couldn’t load clips.'));
  }, []);

  if (playing) {
    const src =
      playing.kind === 'clip'
        ? `https://clips.twitch.tv/embed?clip=${playing.id}&parent=${host}&autoplay=true`
        : `https://player.twitch.tv/?video=${playing.id}&parent=${host}&autoplay=true`;
    return (
      <div className="theater theater--playing">
        <div className="toolbar toolbar--dark">
          <button type="button" className="tb-btn tb-btn--dark" onClick={() => setPlaying(null)}>
            <ArrowLeft size={13} weight="bold" /> Library
          </button>
          <span className="theater__now">{playing.title}</span>
        </div>
        <iframe className="theater__player" src={src} title={playing.title} allow="autoplay; fullscreen" allowFullScreen />
      </div>
    );
  }

  const items = tab === 'clips' ? data?.clips : data?.videos;

  return (
    <div className="theater">
      <div className="toolbar toolbar--dark">
        <div className="seg seg--dark">
          <button type="button" className="seg__btn" data-on={tab === 'clips'} onClick={() => setTab('clips')}>
            <FilmSlate size={13} weight="fill" /> Clips
          </button>
          <button type="button" className="seg__btn" data-on={tab === 'videos'} onClick={() => setTab('videos')}>
            <Television size={13} weight="fill" /> Past streams
          </button>
        </div>
      </div>
      <div className="theater__shelf">
        {error && <p className="theater__note">{error}</p>}
        {!data && !error && (
          <div className="theater__grid">
            {Array.from({ length: 8 }, (_, i) => (
              <span key={i} className="theater__skel" />
            ))}
          </div>
        )}
        {data && items?.length === 0 && (
          <p className="theater__note">{tab === 'clips' ? 'No clips yet. Clip something on stream!' : 'No past broadcasts saved right now.'}</p>
        )}
        <div className="theater__grid">
          {items?.map((it) => (
            <button
              key={it.id}
              type="button"
              className="tcard"
              onClick={() => setPlaying({ kind: tab === 'clips' ? 'clip' : 'video', id: it.id, title: it.title })}
            >
              <span className="tcard__thumb">
                {it.thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.thumb} alt="" loading="lazy" />
                ) : null}
                <span className="tcard__len">{typeof it.duration === 'number' ? `${it.duration}s` : it.duration}</span>
                <span className="tcard__play" aria-hidden>
                  <Play size={22} weight="fill" />
                </span>
              </span>
              <span className="tcard__title">{it.title}</span>
              <span className="tcard__meta">
                <Eye size={11} weight="fill" /> {fmtViews(it.views)} · {fmtDate(it.date)}
                {'by' in it ? ` · clipped by ${it.by}` : ''}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
