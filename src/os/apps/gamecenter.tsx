'use client';
import { useCallback, useEffect, useState } from 'react';
import { ArrowClockwise, Crown, LockSimple, Medal, Trophy, TwitchLogo } from '@phosphor-icons/react';
import { AppIcon } from '@/components/app-icon';
import { ACHIEVEMENTS } from '@/lib/achievements';
import { GAMES, GameId } from '@/lib/games';
import { logIn, logOut } from '../account';
import { APPS, AppId } from '../apps';
import { useOS } from '../store';
import { openApp } from '../wm';

type Row = { name: string; login: string; avatar: string | null; score: number };
type Boards = { boards: Partial<Record<GameId, Row[]>>; mine: Partial<Record<GameId, number>> };
type Weekly = { game: GameId; name: string; unit: string; endsAt: string; top: Row[]; last: (Row & { game: string }) | null };
type Achieved = { counts: Record<string, number>; mine: Record<string, string> };

const ORDER = Object.keys(GAMES) as GameId[];
const TABS = ['Leaderboards', 'This Week', 'Achievements'] as const;

function timeLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  return d > 0 ? `${d}d ${h}h left` : `${h}h left`;
}

function Board({ rows, game, me }: { rows: Row[]; game: GameId; me?: string }) {
  return (
    <ol className="gc__list">
      {rows.length === 0 && <li className="gc__empty">No scores yet. Be the first!</li>}
      {rows.map((r, i) => (
        <li key={r.login + i} data-me={me === r.login}>
          <span className="gc__rank">{i === 0 ? <Crown size={13} weight="fill" /> : i + 1}</span>
          <span className="gc__name">{r.name}</span>
          <span className="gc__score">
            {r.score.toLocaleString('en-GB')}
            {GAMES[game].lowerIsBetter ? 's' : ''}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function GameCenter() {
  const player = useOS((s) => s.player);
  const loginAvailable = useOS((s) => s.loginAvailable);
  const [tab, setTab] = useState<(typeof TABS)[number]>('Leaderboards');
  const [boards, setBoards] = useState<Boards | null>(null);
  const [weekly, setWeekly] = useState<Weekly | null>(null);
  const [ach, setAch] = useState<Achieved | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    const get = <T,>(url: string, set: (d: T) => void) =>
      fetch(url, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then(set)
        .catch(() => setError(true));
    void get('/api/games/leaderboard', setBoards);
    void get('/api/weekly', setWeekly);
    void get('/api/achievements', setAch);
  }, []);

  useEffect(() => {
    const first = window.setTimeout(load, 0);
    const id = window.setInterval(load, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [load, player]);

  const earned = ach ? Object.keys(ach.mine).length : 0;

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
              <span>
                {earned} of {ACHIEVEMENTS.length} achievements
              </span>
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

      <nav className="gc__tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className="gc__tab" onClick={() => setTab(t)}>
            {t === 'Leaderboards' ? <Trophy size={14} weight="fill" /> : t === 'This Week' ? <Crown size={14} weight="fill" /> : <Medal size={14} weight="fill" />}
            {t}
          </button>
        ))}
      </nav>

      <div className="gc__felt">
        {error && <p className="gc__note">Some boards couldn’t load. They’ll retry in a moment.</p>}

        {tab === 'Leaderboards' && (
          <div className="gc__games">
            {ORDER.map((g) => {
              const app = APPS[g as AppId];
              const mine = boards?.mine[g];
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
                  {boards ? <Board rows={boards.boards[g] ?? []} game={g} me={player?.login} /> : <p className="gc__empty">Loading…</p>}
                </section>
              );
            })}
          </div>
        )}

        {tab === 'This Week' && weekly && (
          <div className="gc__week">
            <section className="gc__card gc__card--hero">
              <div className="gc__card-head">
                <AppIcon Icon={APPS[weekly.game as AppId].Icon} from={APPS[weekly.game as AppId].from} to={APPS[weekly.game as AppId].to} />
                <span className="gc__game">
                  <span>Game of the week</span>
                  <b className="gc__big">{weekly.name}</b>
                  <span>{timeLeft(weekly.endsAt)} · best score this week wins a shout-out on stream</span>
                </span>
                <button type="button" className="gel gel--blue" onClick={() => openApp(weekly.game as AppId)}>
                  Play
                </button>
              </div>
              <Board rows={weekly.top} game={weekly.game} me={player?.login} />
            </section>
            <section className="gc__card">
              <div className="gc__card-head">
                <Crown size={22} weight="fill" className="gc__crown" />
                <span className="gc__game">
                  <span>Last week’s winner</span>
                  <b>{weekly.last ? `${weekly.last.name}` : 'Nobody played'}</b>
                  {weekly.last && (
                    <span>
                      {weekly.last.game}: {weekly.last.score.toLocaleString('en-GB')}
                    </span>
                  )}
                </span>
              </div>
            </section>
          </div>
        )}

        {tab === 'Achievements' && (
          <div className="badges">
            {[...ACHIEVEMENTS].sort((x, y) => Number(!!ach?.mine[y.code]) - Number(!!ach?.mine[x.code])).map((a) => {
              const got = ach?.mine[a.code];
              const hidden = a.secret && !got;
              return (
                <div key={a.code} className="badge" data-got={!!got}>
                  <span className="badge__medal">{got ? <Medal size={26} weight="fill" /> : <LockSimple size={22} weight="fill" />}</span>
                  <span className="badge__text">
                    <b>{hidden ? 'Secret achievement' : a.name}</b>
                    <span>{hidden ? 'Keep exploring…' : a.desc}</span>
                    <span className="badge__count">
                      {got ? `Unlocked ${new Date(got).toLocaleDateString('en-GB')}` : `${ach?.counts[a.code] ?? 0} players have this`}
                    </span>
                  </span>
                </div>
              );
            })}
            {!player && <p className="gc__note">Log in with Twitch to start collecting achievements.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
