'use client';
import { useCallback, useEffect, useState } from 'react';
import { ArrowClockwise, Crown, TwitchLogo } from '@phosphor-icons/react';
import { AppIcon } from '@/components/app-icon';
import { GAMES, GameId } from '@/lib/games';
import { logIn, logOut } from '../account';
import { APPS, AppId } from '../apps';
import { useOS } from '../store';
import { openApp } from '../wm';

type Row = { name: string; login: string; avatar: string | null; score: number };
type Data = { boards: Partial<Record<GameId, Row[]>>; mine: Partial<Record<GameId, number>> };

const ORDER: GameId[] = ['snake', 'blocks', '2048', 'bricks', 'minesweeper'];

export function GameCenter() {
  const player = useOS((s) => s.player);
  const loginAvailable = useOS((s) => s.loginAvailable);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    fetch('/api/games/leaderboard', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Data) => {
        setData(d);
        setError(false);
      })
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    const first = window.setTimeout(load, 0);
    const id = window.setInterval(load, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [load, player]);

  return (
    <div className="gc">
      <header className="gc__head">
        {player ? (
          <div className="gc__me">
            <span className="gc__avatar">
              {player.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={player.avatar} alt="" />
              ) : (
                <span>{player.name[0]}</span>
              )}
            </span>
            <span className="gc__who">
              <b>{player.name}</b>
              <span>Signed in with Twitch</span>
            </span>
            <button type="button" className="gel" onClick={() => void logOut()}>
              Log Out
            </button>
          </div>
        ) : (
          <div className="gc__me">
            <span className="gc__who">
              <b>Game Center</b>
              <span>Log in with Twitch to put your name on the boards.</span>
            </span>
            {loginAvailable && (
              <button type="button" className="twitch-btn" onClick={() => logIn('gamecenter')}>
                <TwitchLogo size={15} weight="fill" /> Log in with Twitch
              </button>
            )}
          </div>
        )}
        <button type="button" className="tb-icon gc__refresh" aria-label="Refresh" onClick={load}>
          <ArrowClockwise size={14} weight="bold" />
        </button>
      </header>

      <div className="gc__felt">
        {error && <p className="gc__note">Leaderboards are unavailable right now.</p>}
        <div className="gc__games">
          {ORDER.map((g) => {
            const app = APPS[g as AppId];
            const rows = data?.boards[g] ?? [];
            const mine = data?.mine[g];
            return (
              <section key={g} className="gc__card">
                <div className="gc__card-head">
                  <AppIcon Icon={app.Icon} from={app.from} to={app.to} size="sm" />
                  <span className="gc__game">
                    <b>{GAMES[g].name}</b>
                    <span>{mine !== undefined ? `Your best: ${mine.toLocaleString('en-GB')}` : GAMES[g].lowerIsBetter ? 'Fastest times' : 'High scores'}</span>
                  </span>
                  <button type="button" className="gel gel--blue" onClick={() => openApp(g as AppId)}>
                    Play
                  </button>
                </div>
                <ol className="gc__list">
                  {!data && <li className="gc__empty">Loading…</li>}
                  {data && rows.length === 0 && <li className="gc__empty">No scores yet. Be the first!</li>}
                  {rows.map((r, i) => (
                    <li key={r.login + i} data-me={player?.login === r.login}>
                      <span className="gc__rank">{i === 0 ? <Crown size={13} weight="fill" /> : i + 1}</span>
                      <span className="gc__name">{r.name}</span>
                      <span className="gc__score">
                        {r.score.toLocaleString('en-GB')}
                        {GAMES[g].lowerIsBetter ? 's' : ''}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
