'use client';
import { useCallback, useEffect, useState } from 'react';
import { GAMES } from '@/lib/games';
import { notify, useOS } from '../store';
import { play } from '../wm';

type Data = {
  announcements: { id: number; message: string; active: boolean; created_at: string }[];
  bans: { twitch_id: string; login: string; created_at: string }[];
  players: number;
  nowPlaying: string;
};

type Weekly = { name: string; endsAt: string; top: { name: string; score: number }[]; last: { name: string; score: number; game: string } | null };

const TABS = ['Announce', 'Moderation', 'Tournament'] as const;

/** Finn's control panel. The server checks every action, this UI is just the remote. */
export function Admin() {
  const admin = useOS((s) => s.admin);
  const [tab, setTab] = useState<(typeof TABS)[number]>('Announce');
  const [data, setData] = useState<Data | null>(null);
  const [weekly, setWeekly] = useState<Weekly | null>(null);
  const [announce, setAnnounce] = useState('');
  const [playing, setPlaying] = useState('');
  const [login, setLogin] = useState('');
  const [game, setGame] = useState<string>('snake');

  const load = useCallback(() => {
    fetch('/api/admin')
      .then((r) => r.json())
      .then((d: Data) => {
        setData(d);
        setPlaying(d.nowPlaying ?? '');
      })
      .catch(() => undefined);
    fetch('/api/weekly')
      .then((r) => r.json())
      .then(setWeekly)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!admin) return;
    const t = window.setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [admin, load]);

  const act = async (body: Record<string, string>, done: string) => {
    const r = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    if (r?.ok) {
      play('drop-a', { gain: 0.5 });
      notify('Done', done, 'admin');
      load();
    } else {
      play('error', { gain: 0.5 });
      notify('That didn’t work', d.error ?? 'Try again.', 'admin');
    }
  };

  if (!admin) return <div className="admin admin--locked">This app is for Finnerty only.</div>;

  const active = data?.announcements.find((a) => a.active);

  return (
    <div className="admin">
      <div className="prefs__tabs">
        {TABS.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className="prefs__tab prefs__tab--text" onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
        <span className="admin__stat">{data ? `${data.players} players have logged in` : ''}</span>
      </div>

      <div className="prefs__body">
        {tab === 'Announce' && (
          <div className="prefs__form">
            <p className="prefs__head">Announcement</p>
            <p className="prefs__note">Pops up once for everyone using FinnOS, now and when they next visit.</p>
            {active && (
              <p className="admin__current">
                Live now: “{active.message}”{' '}
                <button type="button" className="gel" onClick={() => void act({ action: 'end-announcement' }, 'Announcement ended.')}>
                  End
                </button>
              </p>
            )}
            <textarea className="aqua-textarea" rows={3} maxLength={200} value={announce} placeholder="Going live in 10 minutes!" onChange={(e) => setAnnounce(e.target.value)} />
            <button
              type="button"
              className="gel gel--blue"
              disabled={!announce.trim()}
              onClick={() => {
                void act({ action: 'announce', message: announce }, 'Announcement sent.');
                setAnnounce('');
              }}
            >
              Send to everyone
            </button>

            <p className="prefs__head">Now playing</p>
            <p className="prefs__note">Shown in the Twitch app and About. Leave empty to hide.</p>
            <div className="admin__row">
              <input className="aqua-input" value={playing} maxLength={80} placeholder="Minecraft" onChange={(e) => setPlaying(e.target.value)} />
              <button type="button" className="gel" onClick={() => void act({ action: 'now-playing', value: playing }, 'Now playing updated.')}>
                Save
              </button>
            </div>
          </div>
        )}

        {tab === 'Moderation' && (
          <div className="prefs__form">
            <p className="prefs__note">Delete single chat or guestbook messages right in those apps (you get an × on every message).</p>
            <p className="prefs__head">Ban a viewer</p>
            <p className="prefs__note">Removes their chat, guestbook entries and scores, and stops them posting.</p>
            <div className="admin__row">
              <input className="aqua-input" value={login} placeholder="twitch name" onChange={(e) => setLogin(e.target.value)} />
              <button type="button" className="gel" disabled={!login.trim()} onClick={() => void act({ action: 'ban', login }, `${login} is banned.`)}>
                Ban
              </button>
            </div>
            <p className="prefs__head">Remove a score</p>
            <div className="admin__row">
              <select className="aqua-select" value={game} onChange={(e) => setGame(e.target.value)}>
                {Object.entries(GAMES).map(([id, g]) => (
                  <option key={id} value={id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <input className="aqua-input" value={login} placeholder="twitch name" onChange={(e) => setLogin(e.target.value)} />
              <button type="button" className="gel" disabled={!login.trim()} onClick={() => void act({ action: 'delete-score', game, login }, 'Score removed.')}>
                Remove
              </button>
            </div>
            <p className="prefs__head">Banned</p>
            {data?.bans.length ? (
              <ul className="admin__list">
                {data.bans.map((b) => (
                  <li key={b.twitch_id}>
                    {b.login}
                    <button type="button" className="gel" onClick={() => void act({ action: 'unban', login: b.login }, `${b.login} can post again.`)}>
                      Unban
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="prefs__note">Nobody is banned.</p>
            )}
          </div>
        )}

        {tab === 'Tournament' && weekly && (
          <div className="prefs__form">
            <p className="prefs__head">This week: {weekly.name}</p>
            <p className="prefs__note">Ends {new Date(weekly.endsAt).toLocaleString('en-GB', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}.</p>
            <ol className="admin__list admin__list--ranked">
              {weekly.top.length === 0 && <li>No scores yet.</li>}
              {weekly.top.map((r, i) => (
                <li key={i}>
                  <span>
                    {i + 1}. {r.name}
                  </span>
                  <b>{r.score.toLocaleString('en-GB')}</b>
                </li>
              ))}
            </ol>
            <p className="prefs__head">Last week’s winner</p>
            <p className="prefs__note">
              {weekly.last ? `${weekly.last.name} won ${weekly.last.game} with ${weekly.last.score.toLocaleString('en-GB')}. Shout them out on stream!` : 'Nobody played last week.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
