'use client';
import { useEffect, useRef, useState } from 'react';
import { Crown, TwitchLogo } from '@phosphor-icons/react';
import { GAMES, GameId } from '@/lib/games';
import { logIn } from '../account';
import { getState, notify, useOS } from '../store';
import { play } from '../wm';

export type RunResult =
  | { status: 'saved'; best: number; newBest: boolean; rank: number }
  | { status: 'guest' }
  | { status: 'error'; message: string };

/** Tracks one run: asks the server for a start token, then submits the final score. */
export function useRun(game: GameId) {
  const token = useRef<string | null>(null);

  const start = () => {
    token.current = null;
    void fetch('/api/games/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game }),
    })
      .then((r) => r.json())
      .then((d: { token?: string }) => (token.current = d.token ?? null))
      .catch(() => undefined);
  };

  const finish = async (score: number): Promise<RunResult> => {
    if (!getState().player) return { status: 'guest' };
    if (!token.current) return { status: 'error', message: 'Couldn’t reach the score server.' };
    try {
      const r = await fetch('/api/games/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.current, score }),
      });
      token.current = null;
      const d = await r.json();
      if (!r.ok) return { status: 'error', message: d.error ?? 'Score not saved.' };
      if (d.newBest) {
        play('notify');
        notify('New high score!', `${GAMES[game].name}: ${score.toLocaleString('en-GB')} ${GAMES[game].unit}. Rank #${d.rank}.`, 'gamecenter');
      }
      return { status: 'saved', ...d };
    } catch {
      return { status: 'error', message: 'Couldn’t reach the score server.' };
    }
  };

  return { start, finish };
}

/** Keyboard input only while this game's window is in front. */
export function useGameKeys(winId: string, onKey: (key: string, e: KeyboardEvent) => void) {
  const handler = useRef(onKey);
  useEffect(() => {
    handler.current = onKey;
  });
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (getState().focused !== winId || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA)$/.test(t.tagName)) return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      handler.current(e.key, e);
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [winId]);
}

/** Swipe gestures for touch screens. */
export function useSwipe(onSwipe: (dir: 'up' | 'down' | 'left' | 'right') => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onTouchStart: (e: React.TouchEvent) => {
      start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (!start.current) return;
      const dx = e.changedTouches[0].clientX - start.current.x;
      const dy = e.changedTouches[0].clientY - start.current.y;
      start.current = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      onSwipe(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
    },
  };
}

/** Is this window the one in front? Games pause when it isn't. */
export function useFocused(winId: string) {
  return useOS((s) => s.focused === winId && !s.windows.find((w) => w.id === winId)?.minimized);
}

export function GameOver({
  game,
  score,
  result,
  onAgain,
  title = 'Game over',
}: {
  game: GameId;
  score: number;
  result: RunResult | null;
  onAgain: () => void;
  title?: string;
}) {
  const player = useOS((s) => s.player);
  const loginAvailable = useOS((s) => s.loginAvailable);
  const meta = GAMES[game];
  return (
    <div className="gameover">
      <div className="gameover__card">
        <p className="gameover__title">{title}</p>
        <p className="gameover__score">
          {score.toLocaleString('en-GB')} <span>{meta.unit}</span>
        </p>
        {result === null && player && <p className="gameover__note">Saving…</p>}
        {result?.status === 'saved' && (
          <p className="gameover__note">
            {result.newBest ? (
              <>
                <Crown size={14} weight="fill" /> New personal best! You’re #{result.rank}.
              </>
            ) : (
              <>Your best: {result.best.toLocaleString('en-GB')}. Rank #{result.rank}.</>
            )}
          </p>
        )}
        {result?.status === 'error' && <p className="gameover__note gameover__note--err">{result.message}</p>}
        {!player && loginAvailable && (
          <button type="button" className="twitch-btn" onClick={() => logIn(game === 'minesweeper' ? 'minesweeper' : (game as never))}>
            <TwitchLogo size={14} weight="fill" /> Log in to save scores
          </button>
        )}
        <button type="button" className="gel gel--blue" onClick={onAgain}>
          Play again
        </button>
      </div>
    </div>
  );
}

/** The current best for this game, shown in the game header. */
export function useBest(game: GameId) {
  const [best, setBest] = useState<number | null>(null);
  const player = useOS((s) => s.player);
  useEffect(() => {
    if (!player) return;
    let alive = true;
    fetch(`/api/games/leaderboard?game=${game}`)
      .then((r) => r.json())
      .then((d: { mine?: Record<string, number> }) => alive && setBest(d.mine?.[game] ?? null))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [game, player]);
  return player ? best : null;
}
