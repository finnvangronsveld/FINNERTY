'use client';
import { useEffect, useRef } from 'react';
import { sfx } from '@/lib/sfx';

// Keys as [label, code, width units]. Widths follow an aluminium Apple keyboard.
type K = [string, string, number?];
const ROWS: K[][] = [
  [['`', 'Backquote'], ['1', 'Digit1'], ['2', 'Digit2'], ['3', 'Digit3'], ['4', 'Digit4'], ['5', 'Digit5'], ['6', 'Digit6'], ['7', 'Digit7'], ['8', 'Digit8'], ['9', 'Digit9'], ['0', 'Digit0'], ['-', 'Minus'], ['=', 'Equal'], ['delete', 'Backspace', 1.6]],
  [['tab', 'Tab', 1.6], ['Q', 'KeyQ'], ['W', 'KeyW'], ['E', 'KeyE'], ['R', 'KeyR'], ['T', 'KeyT'], ['Y', 'KeyY'], ['U', 'KeyU'], ['I', 'KeyI'], ['O', 'KeyO'], ['P', 'KeyP'], ['[', 'BracketLeft'], [']', 'BracketRight'], ['\\', 'Backslash']],
  [['caps', 'CapsLock', 1.9], ['A', 'KeyA'], ['S', 'KeyS'], ['D', 'KeyD'], ['F', 'KeyF'], ['G', 'KeyG'], ['H', 'KeyH'], ['J', 'KeyJ'], ['K', 'KeyK'], ['L', 'KeyL'], [';', 'Semicolon'], ["'", 'Quote'], ['return', 'Enter', 1.8]],
  [['shift', 'ShiftLeft', 2.4], ['Z', 'KeyZ'], ['X', 'KeyX'], ['C', 'KeyC'], ['V', 'KeyV'], ['B', 'KeyB'], ['N', 'KeyN'], ['M', 'KeyM'], [',', 'Comma'], ['.', 'Period'], ['/', 'Slash'], ['shift', 'ShiftRight', 2.4]],
  [['fn', 'Fn'], ['ctrl', 'ControlLeft'], ['alt', 'AltLeft'], ['cmd', 'MetaLeft', 1.3], ['', 'Space', 5.6], ['cmd', 'MetaRight', 1.3], ['alt', 'AltRight']],
];

/** The keyboard in the foreground mirrors what you type, with a soft click per key. */
export function Keyboard() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const find = (code: string) => root.current?.querySelector<HTMLElement>(`[data-code="${code}"]`);
    const down = (e: KeyboardEvent) => {
      const el = find(e.code);
      if (!el) return;
      if (!e.repeat) sfx().play('press', { gain: 0.5, jitter: 0.08 });
      el.dataset.down = 'true';
    };
    const up = (e: KeyboardEvent) => {
      const el = find(e.code);
      if (el) delete el.dataset.down;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  return (
    <div className="keyboard" ref={root} aria-hidden>
      {ROWS.map((row, i) => (
        <div className="keyboard__row" key={i}>
          {row.map(([label, code, w = 1]) => (
            <span key={code} className="kbkey" data-code={code} style={{ flexGrow: w }}>
              {label}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
