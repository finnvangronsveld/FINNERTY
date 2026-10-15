'use client';
import { useEffect, useRef, useState } from 'react';
import type { AppProps } from '../apps';
import { play } from '../wm';
import { GameOver, RunResult, useBest, useFocused, useGameKeys, useRun } from './kit';

const W = 560;
const H = 380;
const PAD_H = 70;
const PAD_W = 10;
const LIVES = 5;

/** Pong against the computer. Score as many points as you can before it gets five. */
export function Pong({ win }: AppProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const s = useRef({ py: H / 2, ay: H / 2, bx: W / 2, by: H / 2, vx: 0, vy: 0, me: 0, cpu: 0, serve: 0, keys: { up: false, down: false } });
  const [phase, setPhase] = useState<'ready' | 'play' | 'over'>('ready');
  const [hud, setHud] = useState({ me: 0, cpu: 0 });
  const [result, setResult] = useState<RunResult | null>(null);
  const focused = useFocused(win.id);
  const run = useRun('pong');
  const best = useBest('pong');

  const serve = (dir: 1 | -1) => {
    const g = s.current;
    g.bx = W / 2;
    g.by = H / 2;
    const speed = 5 + Math.min(4, g.me * 0.25);
    const angle = (Math.random() - 0.5) * 0.9;
    g.vx = Math.cos(angle) * speed * dir;
    g.vy = Math.sin(angle) * speed;
    g.serve = 50;
  };

  const start = () => {
    s.current = { py: H / 2, ay: H / 2, bx: W / 2, by: H / 2, vx: 0, vy: 0, me: 0, cpu: 0, serve: 0, keys: { up: false, down: false } };
    setHud({ me: 0, cpu: 0 });
    setResult(null);
    setPhase('play');
    run.start();
    serve(-1);
  };

  useGameKeys(win.id, (key) => {
    if (key === 'ArrowUp' || key === 'w') s.current.keys.up = true;
    if (key === 'ArrowDown' || key === 's') s.current.keys.down = true;
    if ((key === ' ' || key === 'Enter') && phase !== 'play') start();
  });

  useEffect(() => {
    const up = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') s.current.keys.up = false;
      if (e.key === 'ArrowDown' || e.key === 's') s.current.keys.down = false;
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

    const paddle = (x: number, y: number, hue: [string, string]) => {
      const grad = ctx.createLinearGradient(x, 0, x + PAD_W, 0);
      grad.addColorStop(0, hue[0]);
      grad.addColorStop(1, hue[1]);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y - PAD_H / 2, PAD_W, PAD_H, 5);
      ctx.fill();
    };

    const draw = () => {
      const g = s.current;
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#1d4fa0');
      bg.addColorStop(1, '#0d2350');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgb(255 255 255 / 0.35)';
      ctx.setLineDash([8, 10]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(W / 2, 0);
      ctx.lineTo(W / 2, H);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgb(255 255 255 / 0.2)';
      ctx.strokeRect(1, 1, W - 2, H - 2);
      ctx.font = 'bold 44px "Lucida Grande", "Segoe UI", sans-serif';
      ctx.fillStyle = 'rgb(255 255 255 / 0.3)';
      ctx.textAlign = 'center';
      ctx.fillText(String(g.me), W / 2 - 60, 56);
      ctx.fillText(String(g.cpu), W / 2 + 60, 56);
      paddle(18, g.py, ['#cfe7ff', '#3d8ce6']);
      paddle(W - 18 - PAD_W, g.ay, ['#ffd0c8', '#d6332b']);
      const ball = ctx.createRadialGradient(g.bx - 2, g.by - 2, 1, g.bx, g.by, 8);
      ball.addColorStop(0, '#fff');
      ball.addColorStop(1, '#c8d0dc');
      ctx.fillStyle = ball;
      ctx.beginPath();
      ctx.arc(g.bx, g.by, 7, 0, Math.PI * 2);
      ctx.fill();
    };

    const tick = () => {
      const g = s.current;
      if (phase === 'play' && focused) {
        if (g.keys.up) g.py -= 7;
        if (g.keys.down) g.py += 7;
        g.py = Math.max(PAD_H / 2, Math.min(H - PAD_H / 2, g.py));
        // The computer tracks the ball, but not perfectly.
        const target = g.vx > 0 ? g.by : H / 2;
        const aiSpeed = 4.2 + Math.min(2.5, g.me * 0.12);
        g.ay += Math.max(-aiSpeed, Math.min(aiSpeed, (target - g.ay) * 0.12));
        if (g.serve > 0) g.serve--;
        else {
          g.bx += g.vx;
          g.by += g.vy;
        }
        if (g.by < 7 || g.by > H - 7) {
          g.vy *= -1;
          g.by = Math.max(7, Math.min(H - 7, g.by));
        }
        const hit = (px: number, py: number, dir: 1 | -1) => {
          const t = (g.by - py) / (PAD_H / 2);
          const speed = Math.min(13, Math.hypot(g.vx, g.vy) * 1.05);
          g.vx = Math.cos(t * 0.9) * speed * dir;
          g.vy = Math.sin(t * 0.9) * speed;
          g.bx = px;
          play('tick', { gain: 0.6, rate: dir > 0 ? 1.2 : 0.9 });
        };
        if (g.vx < 0 && g.bx < 18 + PAD_W + 7 && g.bx > 10 && Math.abs(g.by - g.py) < PAD_H / 2 + 6) hit(18 + PAD_W + 7, g.py, 1);
        if (g.vx > 0 && g.bx > W - 18 - PAD_W - 7 && g.bx < W - 10 && Math.abs(g.by - g.ay) < PAD_H / 2 + 6) hit(W - 18 - PAD_W - 7, g.ay, -1);
        if (g.bx < -10) {
          g.cpu++;
          setHud({ me: g.me, cpu: g.cpu });
          play('error', { gain: 0.4 });
          if (g.cpu >= LIVES) {
            setPhase('over');
            void run.finish(g.me).then(setResult);
          } else serve(-1);
        }
        if (g.bx > W + 10) {
          g.me++;
          setHud({ me: g.me, cpu: g.cpu });
          play('drop-a', { gain: 0.6 });
          serve(1);
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
        <span className="game__stat">You <b>{hud.me}</b></span>
        <span className="game__stat">Computer <b>{hud.cpu}/{LIVES}</b></span>
        <span className="game__stat">Best <b>{best ?? '--'}</b></span>
      </div>
      <div className="game__stage">
        <canvas
          ref={canvas}
          className="game__canvas game__canvas--fit"
          style={{ aspectRatio: `${W} / ${H}` }}
          aria-label="Pong"
          onPointerMove={(e) => {
            const r = (e.target as HTMLCanvasElement).getBoundingClientRect();
            s.current.py = ((e.clientY - r.top) / r.height) * H;
          }}
        />
        {phase === 'ready' && (
          <button type="button" className="game__start" onClick={start}>
            <b>Pong</b>
            <span>Mouse or arrow keys. The computer wins at {LIVES}.</span>
            <span className="gel gel--blue">Start</span>
          </button>
        )}
        {phase === 'play' && !focused && <div className="game__paused">Paused</div>}
        {phase === 'over' && <GameOver game="pong" score={hud.me} result={result} onAgain={start} />}
      </div>
    </div>
  );
}
