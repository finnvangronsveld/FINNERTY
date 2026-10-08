'use client';
import { useEffect, useRef, useState } from 'react';
import type { AppProps } from '../apps';
import { play } from '../wm';
import { GameOver, RunResult, useBest, useFocused, useGameKeys, useRun, useSwipe } from './kit';

const COLS = 10;
const ROWS = 20;
const CELL = 24;

const SHAPES: { cells: number[][]; color: [string, string] }[] = [
  { cells: [[0, 0], [1, 0], [2, 0], [3, 0]], color: ['#a6f0f5', '#1aa3b8'] }, // I
  { cells: [[0, 0], [1, 0], [0, 1], [1, 1]], color: ['#ffe08a', '#d68a0c'] }, // O
  { cells: [[0, 0], [1, 0], [2, 0], [1, 1]], color: ['#d7b8ff', '#7a3ee0'] }, // T
  { cells: [[1, 0], [2, 0], [0, 1], [1, 1]], color: ['#b8e3a0', '#3a8a2a'] }, // S
  { cells: [[0, 0], [1, 0], [1, 1], [2, 1]], color: ['#ffb3a8', '#d12a20'] }, // Z
  { cells: [[0, 0], [0, 1], [1, 1], [2, 1]], color: ['#9fd0ff', '#1f6fd6'] }, // J
  { cells: [[2, 0], [0, 1], [1, 1], [2, 1]], color: ['#ffc39b', '#ea5f1b'] }, // L
];

type Piece = { shape: number; cells: number[][]; x: number; y: number };
type Grid = (number | null)[][];

const emptyGrid = (): Grid => Array.from({ length: ROWS }, () => Array(COLS).fill(null));
const spawn = (shape: number): Piece => ({ shape, cells: SHAPES[shape].cells.map((c) => [...c]), x: 3, y: 0 });
const randomShape = () => Math.floor(Math.random() * SHAPES.length);

function fits(grid: Grid, p: Piece, dx = 0, dy = 0, cells = p.cells) {
  return cells.every(([cx, cy]) => {
    const x = p.x + cx + dx;
    const y = p.y + cy + dy;
    return x >= 0 && x < COLS && y < ROWS && (y < 0 || grid[y][x] === null);
  });
}

function rotated(cells: number[][]) {
  const size = Math.max(...cells.flat()) + 1;
  return cells.map(([x, y]) => [size - 1 - y, x]);
}

const LINE_POINTS = [0, 100, 300, 500, 800];

export function Blocks({ win }: AppProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const nextCanvas = useRef<HTMLCanvasElement>(null);
  const g = useRef({ grid: emptyGrid(), piece: spawn(randomShape()), next: randomShape(), score: 0, lines: 0, level: 1, dead: false });
  const [phase, setPhase] = useState<'ready' | 'play' | 'over'>('ready');
  const [hud, setHud] = useState({ score: 0, lines: 0, level: 1 });
  const [result, setResult] = useState<RunResult | null>(null);
  const [, redraw] = useState(0);
  const focused = useFocused(win.id);
  const run = useRun('blocks');
  const best = useBest('blocks');

  const paint = () => {
    const c = canvas.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const s = g.current;
    ctx.fillStyle = '#14172a';
    ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);
    ctx.strokeStyle = 'rgb(255 255 255 / 0.04)';
    for (let x = 1; x < COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL, 0);
      ctx.lineTo(x * CELL, ROWS * CELL);
      ctx.stroke();
    }
    const cell = (ctx2: CanvasRenderingContext2D, x: number, y: number, shape: number, alpha = 1) => {
      const [a, b] = SHAPES[shape].color;
      ctx2.globalAlpha = alpha;
      const grad = ctx2.createLinearGradient(0, y * CELL, 0, (y + 1) * CELL);
      grad.addColorStop(0, a);
      grad.addColorStop(1, b);
      ctx2.fillStyle = grad;
      ctx2.beginPath();
      ctx2.roundRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2, 4);
      ctx2.fill();
      ctx2.fillStyle = 'rgb(255 255 255 / 0.38)';
      ctx2.beginPath();
      ctx2.roundRect(x * CELL + 3, y * CELL + 2, CELL - 6, CELL * 0.36, 3);
      ctx2.fill();
      ctx2.globalAlpha = 1;
    };
    s.grid.forEach((row, y) => row.forEach((v, x) => v !== null && cell(ctx, x, y, v)));
    // Ghost piece shows where it will land.
    let drop = 0;
    while (fits(s.grid, s.piece, 0, drop + 1)) drop++;
    s.piece.cells.forEach(([cx, cy]) => cell(ctx, s.piece.x + cx, s.piece.y + cy + drop, s.piece.shape, 0.18));
    s.piece.cells.forEach(([cx, cy]) => s.piece.y + cy >= 0 && cell(ctx, s.piece.x + cx, s.piece.y + cy, s.piece.shape));

    const n = nextCanvas.current?.getContext('2d');
    if (n) {
      n.clearRect(0, 0, 4 * CELL, 3 * CELL);
      SHAPES[s.next].cells.forEach(([cx, cy]) => cell(n, cx, cy + 0.5, s.next));
    }
  };

  const lock = () => {
    const s = g.current;
    s.piece.cells.forEach(([cx, cy]) => {
      const y = s.piece.y + cy;
      if (y >= 0) s.grid[y][s.piece.x + cx] = s.piece.shape;
    });
    const full = s.grid.filter((row) => row.every((v) => v !== null)).length;
    if (full) {
      s.grid = [...Array.from({ length: full }, () => Array(COLS).fill(null)), ...s.grid.filter((row) => row.some((v) => v === null))];
      s.lines += full;
      s.score += LINE_POINTS[full] * s.level;
      s.level = 1 + Math.floor(s.lines / 10);
      setHud({ score: s.score, lines: s.lines, level: s.level });
      play(full === 4 ? 'notify' : 'drop-a', { gain: 0.6 });
    } else play('tick', { gain: 0.5 });
    s.piece = spawn(s.next);
    s.next = randomShape();
    if (!fits(s.grid, s.piece)) {
      s.dead = true;
      setPhase('over');
      play('error', { gain: 0.6 });
      void run.finish(s.score).then(setResult);
    }
  };

  const step = () => {
    const s = g.current;
    if (s.dead) return;
    if (fits(s.grid, s.piece, 0, 1)) s.piece.y++;
    else lock();
    paint();
  };

  const start = () => {
    g.current = { grid: emptyGrid(), piece: spawn(randomShape()), next: randomShape(), score: 0, lines: 0, level: 1, dead: false };
    setHud({ score: 0, lines: 0, level: 1 });
    setResult(null);
    setPhase('play');
    run.start();
    redraw((n) => n + 1);
  };

  const act = (a: 'left' | 'right' | 'down' | 'rotate' | 'drop') => {
    const s = g.current;
    if (phase !== 'play' || s.dead || !focused) return;
    if (a === 'left' && fits(s.grid, s.piece, -1)) s.piece.x--;
    if (a === 'right' && fits(s.grid, s.piece, 1)) s.piece.x++;
    if (a === 'down') {
      if (fits(s.grid, s.piece, 0, 1)) {
        s.piece.y++;
        s.score += 1;
        setHud((h) => ({ ...h, score: s.score }));
      } else lock();
    }
    if (a === 'rotate') {
      const r = rotated(s.piece.cells);
      for (const kick of [0, -1, 1, -2, 2]) {
        if (fits(s.grid, s.piece, kick, 0, r)) {
          s.piece.cells = r;
          s.piece.x += kick;
          play('tick', { gain: 0.35, rate: 1.4 });
          break;
        }
      }
    }
    if (a === 'drop') {
      let d = 0;
      while (fits(s.grid, s.piece, 0, 1)) {
        s.piece.y++;
        d++;
      }
      s.score += d * 2;
      setHud((h) => ({ ...h, score: s.score }));
      lock();
    }
    paint();
  };

  useGameKeys(win.id, (key) => {
    if (phase !== 'play') {
      if (key === ' ' || key === 'Enter') start();
      return;
    }
    const map: Record<string, Parameters<typeof act>[0]> = {
      ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ArrowDown: 'down', s: 'down',
      ArrowUp: 'rotate', w: 'rotate', x: 'rotate', ' ': 'drop',
    };
    if (map[key]) act(map[key]);
  });
  const swipe = useSwipe((d) => act(d === 'up' ? 'rotate' : d === 'down' ? 'drop' : d));

  useEffect(() => {
    const dpr = window.devicePixelRatio || 1;
    for (const [c, w, h] of [[canvas.current, COLS * CELL, ROWS * CELL], [nextCanvas.current, 4 * CELL, 3 * CELL]] as const) {
      if (!c) continue;
      c.width = w * dpr;
      c.height = h * dpr;
      c.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    paint();
  }, []);

  useEffect(() => {
    if (phase !== 'play' || !focused) return;
    const id = window.setInterval(step, Math.max(90, 650 - (hud.level - 1) * 55));
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, focused, hud.level]);

  return (
    <div className="game game--blocks" {...swipe}>
      <div className="blocks">
        <div className="game__stage blocks__well">
          <canvas
            ref={canvas}
            className="game__canvas"
            style={{ width: COLS * CELL, height: ROWS * CELL }}
            aria-label="Blocks board"
            onClick={() => act('rotate')}
          />
          {phase === 'ready' && (
            <button type="button" className="game__start" onClick={start}>
              <b>Blocks</b>
              <span>Arrows move, Up rotates, Space drops</span>
              <span className="gel gel--blue">Start</span>
            </button>
          )}
          {phase === 'play' && !focused && <div className="game__paused">Paused</div>}
          {phase === 'over' && <GameOver game="blocks" score={hud.score} result={result} onAgain={start} />}
        </div>
        <aside className="blocks__side">
          <p className="blocks__label">Next</p>
          <canvas ref={nextCanvas} style={{ width: 4 * CELL, height: 3 * CELL }} aria-hidden />
          <p className="blocks__label">Score</p>
          <p className="blocks__value">{hud.score.toLocaleString('en-GB')}</p>
          <p className="blocks__label">Lines</p>
          <p className="blocks__value">{hud.lines}</p>
          <p className="blocks__label">Level</p>
          <p className="blocks__value">{hud.level}</p>
          <p className="blocks__label">Best</p>
          <p className="blocks__value">{best?.toLocaleString('en-GB') ?? '--'}</p>
        </aside>
      </div>
    </div>
  );
}
