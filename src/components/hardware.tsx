'use client';
import { useEffect, useRef } from 'react';
import { engine } from '@/audio/engine';

/* ───────────────────────── Knob ───────────────────────── */

type KnobProps = {
  label: string;
  value: number; // 0..1
  onChange: (v: number) => void;
  steps?: number;
  size?: 'sm' | 'md' | 'lg';
  valueText?: string;
};

export function Knob({ label, value, onChange, steps = 32, size = 'md', valueText }: KnobProps) {
  const drag = useRef<{ y: number; v: number } | null>(null);
  const lastDetent = useRef(Math.round(value * steps));
  const ref = useRef<HTMLDivElement>(null);
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const commit = (raw: number) => {
    const v = Math.min(1, Math.max(0, raw));
    const d = Math.round(v * steps);
    if (d !== lastDetent.current) {
      lastDetent.current = d;
      engine().detent(v);
    }
    onChange(v);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      commit(valueRef.current - Math.sign(e.deltaY) / steps);
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
    // commit is stable enough for this listener (reads refs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps]);

  return (
    <div className={`knob knob--${size}`} data-sfx="own">
      <div
        ref={ref}
        className="knob__body"
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        aria-valuetext={valueText}
        style={{ '--angle': `${-135 + value * 270}deg` } as React.CSSProperties}
        onPointerDown={(e) => {
          (e.target as Element).setPointerCapture(e.pointerId);
          drag.current = { y: e.clientY, v: value };
          engine().key('down', 0.4);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const fine = e.shiftKey ? 0.25 : 1;
          commit(drag.current.v + ((drag.current.y - e.clientY) / 180) * fine);
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onKeyDown={(e) => {
          const step = 1 / steps;
          if (e.key === 'ArrowUp' || e.key === 'ArrowRight') commit(value + step);
          else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') commit(value - step);
          else if (e.key === 'Home') commit(0);
          else if (e.key === 'End') commit(1);
          else return;
          e.preventDefault();
        }}
      >
        <span className="knob__ticks" aria-hidden />
        <span className="knob__cap" aria-hidden>
          <span className="knob__pointer" />
        </span>
      </div>
      <span className="silk">{label}</span>
    </div>
  );
}

/* ───────────────────────── Toggle ───────────────────────── */

export function Toggle({
  label,
  on,
  onChange,
  offLabel,
  onLabel,
}: {
  label: string;
  on: boolean;
  onChange: (on: boolean) => void;
  offLabel?: string;
  onLabel?: string;
}) {
  return (
    <div className="toggle" data-sfx="own">
      {onLabel && <span className="silk silk--tiny">{onLabel}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        className="toggle__plate"
        onClick={() => {
          engine().toggle(!on);
          onChange(!on);
        }}
      >
        <span className="toggle__bat" data-on={on} />
      </button>
      {offLabel && <span className="silk silk--tiny">{offLabel}</span>}
    </div>
  );
}

/* ───────────────────────── VU meter ───────────────────────── */

export function VuMeter({ label = 'VU' }: { label?: string }) {
  const needle = useRef<HTMLSpanElement>(null);
  const peak = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    let angle = -48;
    let hold = 0;
    const loop = () => {
      const lvl = engine().level();
      // Map RMS (roughly -40..0 dBFS) onto the needle sweep with VU ballistics.
      const db = lvl > 0 ? 20 * Math.log10(lvl) : -60;
      const target = -48 + Math.min(1, Math.max(0, (db + 38) / 36)) * 96;
      angle += (target - angle) * (target > angle ? 0.28 : 0.09);
      if (needle.current) needle.current.style.transform = `rotate(${angle}deg)`;
      if (peak.current) {
        if (db > -4) hold = 18;
        peak.current.dataset.on = hold-- > 0 ? 'true' : 'false';
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="vu" aria-hidden>
      <div className="vu__face">
        <span className="vu__scale" />
        <span className="vu__label">{label}</span>
        <span className="vu__needle" ref={needle} />
        <span className="vu__pivot" />
        <span className="vu__peak" ref={peak} />
      </div>
    </div>
  );
}

/* ───────────────────────── Screws ───────────────────────── */

export function Screws() {
  // Deterministic "random" slot angles so SSR and client match.
  const angles = [23, -41, 67, 8];
  return (
    <>
      {angles.map((a, i) => (
        <span
          key={i}
          className={`screw screw--${i}`}
          style={{ '--slot': `${a}deg` } as React.CSSProperties}
          aria-hidden
        />
      ))}
    </>
  );
}
