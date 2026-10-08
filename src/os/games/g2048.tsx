'use client';
import { useState } from 'react';
import type { AppProps } from '../apps';
import { play } from '../wm';
import { GameOver, RunResult, useBest, useGameKeys, useRun, useSwipe } from './kit';

type Tile = { id: number; v: number; isNew?: boolean; merged?: boolean };
type Board = (Tile | null)[];
type Dir = 'up' | 'down' | 'left' | 'right';

let nextId = 1;

function addRandom(b: Board): Board {
  const empty = b.map((t, i) => (t ? -1 : i)).filter((i) => i >= 0);
  if (!empty.length) return b;
  const n = [...b];
  n[empty[Math.floor(Math.random() * empty.length)]] = { id: nextId++, v: Math.random() < 0.9 ? 2 : 4, isNew: true };
  return n;
}

const fresh = () => addRandom(addRandom(Array(16).fill(null)));

/** Slide and merge one move. Returns the new board and the points scored. */
function slide(b: Board, dir: Dir) {
  const lines: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const idx = [0, 1, 2, 3].map((j) =>
      dir === 'left' ? i * 4 + j : dir === 'right' ? i * 4 + (3 - j) : dir === 'up' ? j * 4 + i : (3 - j) * 4 + i,
    );
    lines.push(idx);
  }
  const out: Board = Array(16).fill(null);
  let gained = 0;
  let moved = false;
  for (const idx of lines) {
    const tiles = idx.map((i) => b[i]).filter(Boolean) as Tile[];
    const merged: Tile[] = [];
    for (let k = 0; k < tiles.length; k++) {
      if (k + 1 < tiles.length && tiles[k].v === tiles[k + 1].v) {
        const v = tiles[k].v * 2;
        merged.push({ id: nextId++, v, merged: true });
        gained += v;
        k++;
      } else merged.push({ ...tiles[k], isNew: false, merged: false });
    }
    merged.forEach((t, k) => (out[idx[k]] = t));
    idx.forEach((i, k) => {
      if ((b[i]?.id ?? null) !== (out[idx[k]]?.id ?? null)) moved = true;
    });
  }
  return { board: out, gained, moved };
}

const canMove = (b: Board) => (['up', 'down', 'left', 'right'] as Dir[]).some((d) => slide(b, d).moved);

export function Game2048({ win }: AppProps) {
  const [board, setBoard] = useState<Board>(fresh);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<'play' | 'over'>('play');
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const run = useRun('2048');
  const best = useBest('2048');

  const restart = () => {
    setBoard(fresh());
    setScore(0);
    setPhase('play');
    setResult(null);
    setStarted(false);
  };

  const move = (dir: Dir) => {
    if (phase !== 'play') return;
    if (!started) {
      setStarted(true);
      run.start();
    }
    const { board: next, gained, moved } = slide(board, dir);
    if (!moved) return;
    const withNew = addRandom(next);
    const total = score + gained;
    setBoard(withNew);
    setScore(total);
    play(gained ? 'drop-a' : 'tick', { gain: gained ? 0.5 : 0.6, rate: gained ? 1 + Math.min(0.8, Math.log2(gained) / 14) : 1 });
    if (!canMove(withNew)) {
      setPhase('over');
      play('error', { gain: 0.5 });
      void run.finish(total).then(setResult);
    }
  };

  useGameKeys(win.id, (key) => {
    const map: Record<string, Dir> = { ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down', ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right' };
    if (map[key]) move(map[key]);
  });
  const swipe = useSwipe(move);

  return (
    <div className="game game--2048" {...swipe}>
      <div className="game__bar">
        <span className="game__stat">Score <b>{score.toLocaleString('en-GB')}</b></span>
        <span className="game__stat">Best <b>{best?.toLocaleString('en-GB') ?? '--'}</b></span>
        <button type="button" className="tb-btn" onClick={restart}>
          New Game
        </button>
      </div>
      <div className="game__stage">
        <div className="g2048" role="grid" aria-label="2048 board">
          {board.map((t, i) => (
            <div key={i} className="g2048__cell">
              {t && (
                <span key={t.id} className="g2048__tile" data-v={t.v > 2048 ? 'big' : t.v} data-new={t.isNew} data-merged={t.merged}>
                  {t.v}
                </span>
              )}
            </div>
          ))}
        </div>
        {phase === 'over' && <GameOver game="2048" score={score} result={result} onAgain={restart} />}
      </div>
      <p className="game__hint">Arrow keys or swipe. Join equal tiles to reach 2048.</p>
    </div>
  );
}
