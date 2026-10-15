'use client';
import { useEffect, useRef, useState } from 'react';
import type { AppProps } from '../apps';
import { play } from '../wm';
import { GameOver, RunResult, useBest, useFocused, useGameKeys, useRun } from './kit';

const W = 400;
const H = 560;
const GAP = 150;
const PIPE_W = 64;
const SPEED = 2.4;

type Pipe = { x: number; gapY: number; passed: boolean };

/** Flappy Orb: tap to flap the FinnOS orb through glossy pipes. */
export function Flappy({ win }: AppProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const g = useRef({ y: H / 2, v: 0, pipes: [] as Pipe[], score: 0, t: 0, dead: false });
  const [phase, setPhase] = useState<'ready' | 'play' | 'over'>('ready');
  const [score, setScore] = useState(0);
  const [result, setResult] = useState<RunResult | null>(null);
  const focused = useFocused(win.id);
  const run = useRun('flappy');
  const best = useBest('flappy');

  const start = () => {
    g.current = { y: H / 2, v: 0, pipes: [], score: 0, t: 0, dead: false };
    setScore(0);
    setResult(null);
    setPhase('play');
    run.start();
  };

  const flap = () => {
    if (phase === 'ready' || phase === 'over') {
      if (phase === 'ready') start();
      return;
    }
    g.current.v = -7.2;
    play('tick', { gain: 0.5, rate: 1.4, jitter: 0.05 });
  };

  useGameKeys(win.id, (key) => {
    if (key === ' ' || key === 'ArrowUp' || key === 'w') flap();
  });

  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = W * dpr;
    c.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let raf = 0;

    const pipe = (x: number, y: number, h: number, top: boolean) => {
      const grad = ctx.createLinearGradient(x, 0, x + PIPE_W, 0);
      grad.addColorStop(0, '#2f8a3a');
      grad.addColorStop(0.35, '#9fe6a0');
      grad.addColorStop(0.6, '#4fbf5a');
      grad.addColorStop(1, '#1f6a2a');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, PIPE_W, h);
      // Lip
      const lipY = top ? y + h - 22 : y;
      ctx.fillRect(x - 5, lipY, PIPE_W + 10, 22);
      ctx.strokeStyle = 'rgb(0 0 0 / 0.35)';
      ctx.strokeRect(x - 5 + 0.5, lipY + 0.5, PIPE_W + 9, 21);
    };

    const draw = () => {
      const s = g.current;
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#2b4fb8');
      sky.addColorStop(0.7, '#7a46e8');
      sky.addColorStop(1, '#c86bd8');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);
      // Parallax hills
      ctx.fillStyle = 'rgb(20 10 60 / 0.35)';
      for (let i = 0; i < 5; i++) {
        const x = ((i * 140 - s.t * 0.4) % (W + 140)) - 70;
        ctx.beginPath();
        ctx.arc(x + 70, H + 40, 120, Math.PI, 0);
        ctx.fill();
      }
      for (const p of s.pipes) {
        pipe(p.x, 0, p.gapY - GAP / 2, true);
        pipe(p.x, p.gapY + GAP / 2, H - (p.gapY + GAP / 2), false);
      }
      // The orb
      const r = 15;
      const ox = 110;
      const tilt = Math.max(-0.5, Math.min(0.9, s.v / 10));
      ctx.save();
      ctx.translate(ox, s.y);
      ctx.rotate(tilt);
      const body = ctx.createRadialGradient(0, 3, 2, 0, 0, r);
      body.addColorStop(0, '#d7c2ff');
      body.addColorStop(0.6, '#7c4dff');
      body.addColorStop(1, '#3b1a9c');
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgb(255 255 255 / 0.8)';
      ctx.beginPath();
      ctx.ellipse(0, -7, 8, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // Score
      ctx.font = 'bold 40px "Lucida Grande", "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgb(0 0 0 / 0.4)';
      ctx.strokeText(String(s.score), W / 2, 70);
      ctx.fillStyle = '#fff';
      ctx.fillText(String(s.score), W / 2, 70);
    };

    const tick = () => {
      const s = g.current;
      if (phase === 'play' && focused && !s.dead) {
        s.t += 1;
        s.v = Math.min(10, s.v + 0.42);
        s.y += s.v;
        if (s.t % 95 === 1) s.pipes.push({ x: W + 10, gapY: 130 + Math.random() * (H - 260), passed: false });
        for (const p of s.pipes) {
          p.x -= SPEED + Math.min(1.6, s.score * 0.04);
          if (!p.passed && p.x + PIPE_W < 110 - 15) {
            p.passed = true;
            s.score += 1;
            setScore(s.score);
            play('drop-a', { gain: 0.45, rate: 1.3 });
          }
          const hitX = 110 + 13 > p.x - 4 && 110 - 13 < p.x + PIPE_W + 4;
          const hitY = s.y - 13 < p.gapY - GAP / 2 || s.y + 13 > p.gapY + GAP / 2;
          if (hitX && hitY) s.dead = true;
        }
        s.pipes = s.pipes.filter((p) => p.x > -PIPE_W - 10);
        if (s.y > H - 12 || s.y < -40) s.dead = true;
        if (s.dead) {
          play('error', { gain: 0.6 });
          setPhase('over');
          void run.finish(s.score).then(setResult);
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
        <span className="game__stat">Pipes <b>{score}</b></span>
        <span className="game__stat">Best <b>{best ?? '--'}</b></span>
      </div>
      <div className="game__stage" onPointerDown={(e) => phase === 'play' && (e.preventDefault(), flap())}>
        <canvas ref={canvas} className="game__canvas game__canvas--fit" style={{ aspectRatio: `${W} / ${H}`, width: 'auto', height: '100%' }} aria-label="Flappy Orb" />
        {phase === 'ready' && (
          <button type="button" className="game__start" onClick={start}>
            <b>Flappy Orb</b>
            <span>Click, tap or press Space to flap</span>
            <span className="gel gel--blue">Start</span>
          </button>
        )}
        {phase === 'play' && !focused && <div className="game__paused">Paused</div>}
        {phase === 'over' && <GameOver game="flappy" score={score} result={result} onAgain={start} />}
      </div>
    </div>
  );
}
