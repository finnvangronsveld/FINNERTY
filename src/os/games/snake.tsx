'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppProps } from '../apps';
import { play } from '../wm';
import { GameOver, RunResult, useBest, useFocused, useGameKeys, useRun, useSwipe } from './kit';

const N = 20;
type P = { x: number; y: number };
type Dir = 'up' | 'down' | 'left' | 'right';
const STEP: Record<Dir, P> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

function freeCell(snake: P[]): P {
  for (;;) {
    const p = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) };
    if (!snake.some((s) => s.x === p.x && s.y === p.y)) return p;
  }
}

export function Snake({ win }: AppProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const game = useRef({
    snake: [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }] as P[],
    dir: 'right' as Dir,
    queue: [] as Dir[],
    apple: { x: 14, y: 10 } as P,
    score: 0,
    dead: false,
  });
  const [phase, setPhase] = useState<'ready' | 'play' | 'over'>('ready');
  const [score, setScore] = useState(0);
  const [result, setResult] = useState<RunResult | null>(null);
  const focused = useFocused(win.id);
  const run = useRun('snake');
  const best = useBest('snake');

  const draw = useCallback(() => {
    const c = canvas.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const s = c.width / N;
    ctx.clearRect(0, 0, c.width, c.height);
    // Board: soft checker.
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        ctx.fillStyle = (x + y) % 2 ? '#a7d38a' : '#b2db96';
        ctx.fillRect(x * s, y * s, s, s);
      }
    const g = game.current;
    // Apple: glossy.
    const ax = g.apple.x * s + s / 2;
    const ay = g.apple.y * s + s / 2;
    const ag = ctx.createRadialGradient(ax - s * 0.15, ay - s * 0.2, s * 0.05, ax, ay, s * 0.45);
    ag.addColorStop(0, '#ffb3a8');
    ag.addColorStop(0.4, '#ee2b1c');
    ag.addColorStop(1, '#9a0f05');
    ctx.fillStyle = ag;
    ctx.beginPath();
    ctx.arc(ax, ay, s * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3d7a1e';
    ctx.fillRect(ax - 1, ay - s * 0.55, 3, s * 0.2);
    // Snake body.
    g.snake.forEach((p, i) => {
      const x = p.x * s + 1;
      const y = p.y * s + 1;
      const grad = ctx.createLinearGradient(x, y, x, y + s);
      grad.addColorStop(0, i === 0 ? '#8fc6ff' : '#6fb1f4');
      grad.addColorStop(0.5, i === 0 ? '#3d8ce6' : '#2f72d8');
      grad.addColorStop(1, '#1e55b0');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, s - 2, s - 2, s * 0.32);
      ctx.fill();
      ctx.fillStyle = 'rgb(255 255 255 / 0.35)';
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, s - 6, (s - 2) * 0.38, s * 0.2);
      ctx.fill();
    });
    // Eyes on the head.
    const h = g.snake[0];
    ctx.fillStyle = '#fff';
    const ex = h.x * s + s / 2;
    const ey = h.y * s + s / 2;
    const d = STEP[g.dir];
    [-1, 1].forEach((side) => {
      const ox = d.y !== 0 ? side * s * 0.18 : d.x * s * 0.15;
      const oy = d.x !== 0 ? side * s * 0.18 : d.y * s * 0.15;
      ctx.beginPath();
      ctx.arc(ex + ox, ey + oy, s * 0.11, 0, Math.PI * 2);
      ctx.fill();
    });
  }, []);

  const reset = () => {
    game.current = {
      snake: [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }],
      dir: 'right',
      queue: [],
      apple: { x: 14, y: 10 },
      score: 0,
      dead: false,
    };
    setScore(0);
    setResult(null);
    setPhase('play');
    run.start();
    draw();
  };

  const turn = (d: Dir) => {
    if (phase === 'ready' || phase === 'over') {
      if (phase === 'ready') reset();
      return;
    }
    const g = game.current;
    const last = g.queue.at(-1) ?? g.dir;
    if (d !== last && d !== OPPOSITE[last] && g.queue.length < 3) g.queue.push(d);
  };

  useGameKeys(win.id, (key) => {
    const map: Record<string, Dir> = { ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down', ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right' };
    if (map[key]) turn(map[key]);
    if ((key === ' ' || key === 'Enter') && phase !== 'play') reset();
  });
  const swipe = useSwipe(turn);

  // Fit the canvas to its box.
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ro = new ResizeObserver(() => {
      const size = Math.floor(Math.min(c.parentElement!.clientWidth, c.parentElement!.clientHeight) / N) * N;
      const dpr = window.devicePixelRatio || 1;
      c.style.width = c.style.height = `${size}px`;
      c.width = c.height = size * dpr;
      draw();
    });
    ro.observe(c.parentElement!);
    return () => ro.disconnect();
  }, [draw]);

  // Game loop: speeds up as the snake grows. Pauses when the window isn't in front.
  useEffect(() => {
    if (phase !== 'play' || !focused) return;
    const g = game.current;
    const speed = Math.max(55, 130 - g.score * 3);
    const id = window.setInterval(() => {
      if (g.dead) return;
      if (g.queue.length) g.dir = g.queue.shift()!;
      const head = { x: g.snake[0].x + STEP[g.dir].x, y: g.snake[0].y + STEP[g.dir].y };
      const hit = head.x < 0 || head.y < 0 || head.x >= N || head.y >= N || g.snake.slice(0, -1).some((p) => p.x === head.x && p.y === head.y);
      if (hit) {
        g.dead = true;
        setPhase('over');
        play('error', { gain: 0.6 });
        void run.finish(g.score).then(setResult);
        return;
      }
      g.snake.unshift(head);
      if (head.x === g.apple.x && head.y === g.apple.y) {
        g.score++;
        setScore(g.score);
        g.apple = freeCell(g.snake);
        play('tick', { rate: 1 + Math.min(1, g.score / 30), gain: 0.9 });
      } else g.snake.pop();
      draw();
    }, speed);
    return () => clearInterval(id);
    // Restart the interval when the score changes so the speed updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, focused, score, draw]);

  return (
    <div className="game" {...swipe}>
      <div className="game__bar">
        <span className="game__stat">Apples <b>{score}</b></span>
        <span className="game__stat">Best <b>{best ?? '--'}</b></span>
      </div>
      <div className="game__stage">
        <canvas ref={canvas} className="game__canvas" aria-label="Snake board" />
        {phase === 'ready' && (
          <button type="button" className="game__start" onClick={reset}>
            <b>Snake</b>
            <span>Arrow keys or WASD, swipe on touch</span>
            <span className="gel gel--blue">Start</span>
          </button>
        )}
        {phase === 'play' && !focused && <div className="game__paused">Paused</div>}
        {phase === 'over' && <GameOver game="snake" score={score} result={result} onAgain={reset} />}
      </div>
    </div>
  );
}
