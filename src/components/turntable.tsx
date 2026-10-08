'use client';
import { useEffect, useRef } from 'react';
import { engine } from '@/audio/engine';
import { useEngine } from './use-engine';

const RPM_DEG = (100 / 3) * 6; // 33 1/3 rpm in degrees per second
const TILT = 0.94; // cos of the platter tilt, used to undo the 3D foreshortening

/** A record you can scratch. Start/stop runs the drum machine's beat. */
export function Turntable() {
  const playing = useEngine((s) => s.playing);
  const record = useRef<HTMLDivElement>(null);
  const state = useRef({ angle: 0, speed: 0, held: false, lastA: 0, lastT: 0, vel: 0 });
  const playingRef = useRef(playing);
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    let raf = 0;
    let prev = performance.now();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      const s = state.current;
      if (!s.held) {
        const target = playingRef.current ? (reduce ? RPM_DEG * 0.25 : RPM_DEG) : 0;
        // Motor torque: fast spin-up, slower coast-down.
        s.speed += (target - s.speed) * (target > s.speed ? 4 : 1.4) * dt;
        s.angle += s.speed * dt;
      }
      if (record.current) record.current.style.transform = `rotate(${s.angle}deg)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const pointerAngle = (e: React.PointerEvent) => {
    const r = record.current!.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = (e.clientY - (r.top + r.height / 2)) / TILT;
    return (Math.atan2(y, x) * 180) / Math.PI;
  };

  return (
    <div className="deck" data-sfx="own">
      <div className="deck__plinth">
        <div className="deck__platter">
          <div
            ref={record}
            className="record"
            role="img"
            aria-label="Vinyl record. Drag it to scratch."
            onPointerDown={(e) => {
              (e.target as Element).setPointerCapture(e.pointerId);
              const s = state.current;
              s.held = true;
              s.lastA = pointerAngle(e);
              s.lastT = performance.now();
              s.vel = 0;
              void engine().scratchStart();
            }}
            onPointerMove={(e) => {
              const s = state.current;
              if (!s.held) return;
              const a = pointerAngle(e);
              let d = a - s.lastA;
              if (d > 180) d -= 360;
              if (d < -180) d += 360;
              const now = performance.now();
              const dt = Math.max(1, now - s.lastT) / 1000;
              s.vel = s.vel * 0.5 + (d / 360 / dt) * 0.5;
              s.angle += d;
              s.lastA = a;
              s.lastT = now;
              engine().scratchMove(s.vel);
            }}
            onPointerUp={() => {
              const s = state.current;
              s.held = false;
              s.speed = 0;
              engine().scratchEnd();
            }}
            onPointerCancel={() => {
              state.current.held = false;
              engine().scratchEnd();
            }}
          >
            <span className="record__grooves" />
            <span className="record__label">
              <span>FINNERTY</span>
              <span className="record__sub">150 BPM</span>
            </span>
            <span className="record__spindle" />
          </div>
          <span className="record__sheen" aria-hidden />
        </div>
        <div className="tonearm" data-playing={playing} aria-hidden>
          <span className="tonearm__base" />
          <span className="tonearm__arm" />
        </div>
        <div className="deck__controls">
          <button
            type="button"
            className="key key--start"
            data-sfx="own"
            aria-pressed={playing}
            onClick={() => {
              const e = engine();
              e.key('down', 1.3);
              if (playing) e.stop();
              else e.play();
            }}
          >
            <span className="led" data-on={playing} aria-hidden />
            {playing ? 'Stop' : 'Start'}
          </button>
          <span className="silk silk--tiny">Drag the record to scratch</span>
        </div>
      </div>
    </div>
  );
}
