'use client';
import { useEffect, useState } from 'react';
import { play } from '../wm';

type Op = '+' | '−' | '×' | '÷';

const KEYS: (string | null)[] = ['C', '±', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '0', null, '.', '='];

function calc(a: number, b: number, op: Op) {
  if (op === '+') return a + b;
  if (op === '−') return a - b;
  if (op === '×') return a * b;
  return b === 0 ? NaN : a / b;
}

const fmt = (n: number) => {
  if (!Number.isFinite(n)) return 'Error';
  const s = String(Number(n.toPrecision(12)));
  return s.length > 12 ? n.toExponential(6) : s;
};

export function Calculator() {
  const [display, setDisplay] = useState('0');
  const [acc, setAcc] = useState<number | null>(null);
  const [op, setOp] = useState<Op | null>(null);
  const [fresh, setFresh] = useState(true);

  const press = (k: string) => {
    play('tick', { gain: 0.7, jitter: 0.1 });
    if (/^[0-9]$/.test(k)) {
      setDisplay((d) => (fresh || d === '0' ? k : d.length < 12 ? d + k : d));
      setFresh(false);
    } else if (k === '.') {
      setDisplay((d) => (fresh ? '0.' : d.includes('.') ? d : d + '.'));
      setFresh(false);
    } else if (k === 'C') {
      setDisplay('0');
      setAcc(null);
      setOp(null);
      setFresh(true);
    } else if (k === '±') setDisplay((d) => fmt(-Number(d)));
    else if (k === '%') setDisplay((d) => fmt(Number(d) / 100));
    else if (k === '=') {
      if (op && acc !== null) {
        setDisplay(fmt(calc(acc, Number(display), op)));
        setAcc(null);
        setOp(null);
        setFresh(true);
      }
    } else {
      const v = Number(display);
      const next = op && acc !== null && !fresh ? calc(acc, v, op) : v;
      setAcc(next);
      setDisplay(fmt(next));
      setOp(k as Op);
      setFresh(true);
    }
  };

  useEffect(() => {
    const map: Record<string, string> = { '*': '×', '/': '÷', '-': '−', '+': '+', Enter: '=', '=': '=', Escape: 'C', Backspace: 'C', ',': '.', '.': '.', '%': '%' };
    const key = (e: KeyboardEvent) => {
      const k = /^[0-9]$/.test(e.key) ? e.key : map[e.key];
      if (!k) return;
      e.preventDefault();
      press(k);
    };
    const el = document.querySelector('.calc')?.closest('.win');
    el?.addEventListener('keydown', key as EventListener);
    return () => el?.removeEventListener('keydown', key as EventListener);
  });

  return (
    <div className="calc" tabIndex={0}>
      <div className="calc__lcd" aria-live="polite">
        <span className="calc__op">{op ?? ''}</span>
        {display}
      </div>
      <div className="calc__keys">
        {KEYS.map((k, i) =>
          k === null ? null : (
            <button
              key={i}
              type="button"
              className="calc__key"
              data-kind={/[÷×−+=]/.test(k) ? 'op' : /[C±%]/.test(k) ? 'fn' : 'num'}
              data-wide={k === '0'}
              data-active={op === k && fresh}
              onClick={() => press(k)}
            >
              {k}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
