'use client';
import { useEffect, useRef, useState } from 'react';
import { Bomb, Flag, Smiley, SmileySad, SmileyWink } from '@phosphor-icons/react';
import { play } from '../wm';

const W = 9;
const H = 9;
const MINES = 10;

type Cell = { mine: boolean; open: boolean; flag: boolean; n: number };

const around = (i: number) => {
  const x = i % W;
  const y = Math.floor(i / W);
  const out: number[] = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < W && ny < H) out.push(ny * W + nx);
    }
  return out;
};

const blank = (): Cell[] => Array.from({ length: W * H }, () => ({ mine: false, open: false, flag: false, n: 0 }));

/** Mines are placed after the first click, so the first click is always safe. */
function seedMines(cells: Cell[], safe: number) {
  const banned = new Set([safe, ...around(safe)]);
  let placed = 0;
  while (placed < MINES) {
    const i = Math.floor(Math.random() * cells.length);
    if (cells[i].mine || banned.has(i)) continue;
    cells[i].mine = true;
    placed++;
  }
  cells.forEach((c, i) => (c.n = around(i).filter((j) => cells[j].mine).length));
}

export function Minesweeper() {
  const [cells, setCells] = useState<Cell[]>(blank);
  const [state, setState] = useState<'ready' | 'play' | 'won' | 'lost'>('ready');
  const [time, setTime] = useState(0);
  // Long-press flags a cell on touch screens.
  const press = useRef<{ timer: number; fired: boolean } | null>(null);

  useEffect(() => {
    if (state !== 'play') return;
    const id = setInterval(() => setTime((t) => Math.min(999, t + 1)), 1000);
    return () => clearInterval(id);
  }, [state]);

  const reset = () => {
    setCells(blank());
    setState('ready');
    setTime(0);
  };

  const reveal = (i: number) => {
    if (state === 'won' || state === 'lost') return;
    const next = cells.map((c) => ({ ...c }));
    if (state === 'ready') {
      seedMines(next, i);
      setState('play');
    }
    if (next[i].flag || next[i].open) return;
    if (next[i].mine) {
      next.forEach((c) => c.mine && (c.open = true));
      setCells(next);
      setState('lost');
      play('error');
      return;
    }
    const stack = [i];
    while (stack.length) {
      const j = stack.pop()!;
      if (next[j].open || next[j].flag) continue;
      next[j].open = true;
      if (next[j].n === 0) stack.push(...around(j));
    }
    setCells(next);
    play('tick', { jitter: 0.15 });
    if (next.every((c) => c.open || c.mine)) {
      setState('won');
      play('sb-gg');
    }
  };

  const flag = (i: number) => {
    if (state === 'won' || state === 'lost' || cells[i].open) return;
    setCells((cs) => cs.map((c, j) => (j === i ? { ...c, flag: !c.flag } : c)));
    play('toggle', { gain: 0.5 });
  };

  const flags = cells.filter((c) => c.flag).length;
  const Face = state === 'lost' ? SmileySad : state === 'won' ? SmileyWink : Smiley;

  return (
    <div className="mines">
      <div className="mines__head">
        <span className="mines__lcd">{String(Math.max(0, MINES - flags)).padStart(3, '0')}</span>
        <button type="button" className="mines__face" aria-label="New game" onClick={reset}>
          <Face size={26} weight="fill" />
        </button>
        <span className="mines__lcd">{String(time).padStart(3, '0')}</span>
      </div>
      <div className="mines__grid" style={{ gridTemplateColumns: `repeat(${W}, 1fr)` }}>
        {cells.map((c, i) => (
          <button
            key={i}
            type="button"
            className="mcell"
            data-open={c.open}
            data-n={c.open && !c.mine ? c.n : undefined}
            data-boom={c.open && c.mine}
            aria-label={c.open ? (c.mine ? 'Mine' : `${c.n}`) : c.flag ? 'Flagged' : 'Hidden'}
            onPointerDown={(e) => {
              if (e.pointerType === 'mouse') return;
              const p = { fired: false, timer: 0 };
              p.timer = window.setTimeout(() => {
                p.fired = true;
                flag(i);
              }, 420);
              press.current = p;
            }}
            onPointerUp={() => press.current && clearTimeout(press.current.timer)}
            onPointerLeave={() => press.current && clearTimeout(press.current.timer)}
            onClick={() => {
              if (press.current?.fired) {
                press.current = null;
                return;
              }
              reveal(i);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              flag(i);
            }}
          >
            {c.open ? (c.mine ? <Bomb size={15} weight="fill" /> : c.n || '') : c.flag ? <Flag size={14} weight="fill" /> : ''}
          </button>
        ))}
      </div>
      <p className="mines__hint">
        {state === 'won' ? 'You cleared the field. GG!' : state === 'lost' ? 'Boom. Click the face to try again.' : 'Right-click (or long-press) to place a flag.'}
      </p>
    </div>
  );
}
