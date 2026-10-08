'use client';
import { useEffect, useRef, useState } from 'react';
import type { AppProps } from '../apps';
import { play } from '../wm';
import { GameOver, RunResult, useBest, useFocused, useGameKeys, useRun } from './kit';

const W = 480;
const H = 360;
const COLS = 8;
const ROWS = 6;
const COLORS = [
  ['#ffb3c6', '#e8406e'],
  ['#ffc39b', '#ea5f1b'],
  ['#ffe08a', '#d68a0c'],
  ['#b8e3a0', '#3a8a2a'],
  ['#9fd0ff', '#1f6fd6'],
  ['#c7b0ff', '#6a3ee0'],
];

type State = {
  px: number;
  bx: number;
  by: number;
  vx: number;
  vy: number;
  bricks: boolean[];
  lives: number;
  level: number;
  score: number;
  stuck: boolean;
  keys: { left: boolean; right: boolean };
};

const newBricks = () => Array(COLS * ROWS).fill(true);
const brickRect = (i: number) => {
  const bw = (W - 40) / COLS;
  return { x: 20 + (i % COLS) * bw + 2, y: 40 + Math.floor(i / COLS) * 18 + 2, w: bw - 4, h: 14 };
};

export function Bricks({ win }: AppProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const s = useRef<State>({ px: W / 2, bx: W / 2, by: H - 40, vx: 0, vy: 0, bricks: newBricks(), lives: 3, level: 1, score: 0, stuck: true, keys: { left: false, right: false } });
  const [phase, setPhase] = useState<'ready' | 'play' | 'over'>('ready');
  const [hud, setHud] = useState({ score: 0, lives: 3, level: 1 });
  const [result, setResult] = useState<RunResult | null>(null);
  const focused = useFocused(win.id);
  const run = useRun('bricks');
  const best = useBest('bricks');

  const launch = () => {
    const g = s.current;
    if (!g.stuck) return;
    const speed = 4.2 + g.level * 0.5;
    g.vx = (Math.random() < 0.5 ? -1 : 1) * speed * 0.6;
    g.vy = -speed;
    g.stuck = false;
  };

  const start = () => {
    s.current = { px: W / 2, bx: W / 2, by: H - 40, vx: 0, vy: 0, bricks: newBricks(), lives: 3, level: 1, score: 0, stuck: true, keys: { left: false, right: false } };
    setHud({ score: 0, lives: 3, level: 1 });
    setResult(null);
    setPhase('play');
    run.start();
  };

  useGameKeys(win.id, (key) => {
    if (key === ' ' || key === 'ArrowUp') {
      if (phase === 'play') launch();
      else start();
    }
    if (key === 'ArrowLeft' || key === 'a') s.current.keys.left = true;
    if (key === 'ArrowRight' || key === 'd') s.current.keys.right = true;
  });

  useEffect(() => {
    const up = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') s.current.keys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd') s.current.keys.right = false;
    };
    window.addEventListener('keyup', up);
    return () => window.removeEventListener('keyup', up);
  }, []);

  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = W * dpr;
    c.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let raf = 0;

    const draw = () => {
      const g = s.current;
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#1d2340');
      bg.addColorStop(1, '#0c0f20');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      g.bricks.forEach((alive, i) => {
        if (!alive) return;
        const r = brickRect(i);
        const [a, b] = COLORS[Math.floor(i / COLS)];
        const grad = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
        grad.addColorStop(0, a);
        grad.addColorStop(1, b);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(r.x, r.y, r.w, r.h, 4);
        ctx.fill();
        ctx.fillStyle = 'rgb(255 255 255 / 0.4)';
        ctx.beginPath();
        ctx.roundRect(r.x + 2, r.y + 1, r.w - 4, r.h * 0.4, 3);
        ctx.fill();
      });
      // Paddle: a little gel capsule.
      const pw = 80;
      const pg = ctx.createLinearGradient(0, H - 22, 0, H - 10);
      pg.addColorStop(0, '#cfe7ff');
      pg.addColorStop(0.5, '#4f9ded');
      pg.addColorStop(1, '#8fd0ff');
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.roundRect(g.px - pw / 2, H - 22, pw, 12, 6);
      ctx.fill();
      // Ball.
      const bgr = ctx.createRadialGradient(g.bx - 2, g.by - 2, 1, g.bx, g.by, 7);
      bgr.addColorStop(0, '#fff');
      bgr.addColorStop(1, '#b9c3d6');
      ctx.fillStyle = bgr;
      ctx.beginPath();
      ctx.arc(g.bx, g.by, 6, 0, Math.PI * 2);
      ctx.fill();
    };

    const tick = () => {
      const g = s.current;
      if (phase === 'play' && focused) {
        if (g.keys.left) g.px -= 7;
        if (g.keys.right) g.px += 7;
        g.px = Math.max(40, Math.min(W - 40, g.px));
        if (g.stuck) {
          g.bx = g.px;
          g.by = H - 29;
        } else {
          g.bx += g.vx;
          g.by += g.vy;
          if (g.bx < 6 || g.bx > W - 6) {
            g.vx *= -1;
            g.bx = Math.max(6, Math.min(W - 6, g.bx));
          }
          if (g.by < 6) {
            g.vy = Math.abs(g.vy);
          }
          // Paddle bounce: angle depends on where it hits.
          if (g.vy > 0 && g.by > H - 28 && g.by < H - 12 && Math.abs(g.bx - g.px) < 46) {
            const speed = Math.hypot(g.vx, g.vy);
            const t = (g.bx - g.px) / 46;
            g.vx = speed * t * 0.85;
            g.vy = -Math.sqrt(Math.max(1, speed * speed - g.vx * g.vx));
            play('tick', { gain: 0.6 });
          }
          for (let i = 0; i < g.bricks.length; i++) {
            if (!g.bricks[i]) continue;
            const r = brickRect(i);
            if (g.bx > r.x - 5 && g.bx < r.x + r.w + 5 && g.by > r.y - 5 && g.by < r.y + r.h + 5) {
              g.bricks[i] = false;
              const fromSide = g.bx < r.x || g.bx > r.x + r.w;
              if (fromSide) g.vx *= -1;
              else g.vy *= -1;
              g.score += 10;
              setHud((h) => ({ ...h, score: g.score }));
              play('drop-a', { gain: 0.45, rate: 1 + Math.floor(i / COLS) * 0.08 });
              break;
            }
          }
          if (g.bricks.every((b) => !b)) {
            g.level++;
            g.bricks = newBricks();
            g.stuck = true;
            setHud((h) => ({ ...h, level: g.level }));
            play('open');
          }
          if (g.by > H + 10) {
            g.lives--;
            g.stuck = true;
            setHud((h) => ({ ...h, lives: g.lives }));
            play('error', { gain: 0.5 });
            if (g.lives <= 0) {
              setPhase('over');
              void run.finish(g.score).then(setResult);
            }
          }
        }
      }
      draw();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, focused]);

  return (
    <div className="game">
      <div className="game__bar">
        <span className="game__stat">Score <b>{hud.score}</b></span>
        <span className="game__stat">Lives <b>{'●'.repeat(Math.max(0, hud.lives)) || '0'}</b></span>
        <span className="game__stat">Level <b>{hud.level}</b></span>
        <span className="game__stat">Best <b>{best ?? '--'}</b></span>
      </div>
      <div className="game__stage">
        <canvas
          ref={canvas}
          className="game__canvas game__canvas--fit"
          style={{ aspectRatio: `${W} / ${H}` }}
          aria-label="Bricks"
          onPointerMove={(e) => {
            const r = (e.target as HTMLCanvasElement).getBoundingClientRect();
            s.current.px = ((e.clientX - r.left) / r.width) * W;
          }}
          onPointerDown={() => (phase === 'play' ? launch() : undefined)}
        />
        {phase === 'ready' && (
          <button type="button" className="game__start" onClick={start}>
            <b>Bricks</b>
            <span>Move with the mouse or arrow keys. Click or Space to launch.</span>
            <span className="gel gel--blue">Start</span>
          </button>
        )}
        {phase === 'play' && !focused && <div className="game__paused">Paused</div>}
        {phase === 'over' && <GameOver game="bricks" score={hud.score} result={result} onAgain={start} />}
      </div>
    </div>
  );
}
