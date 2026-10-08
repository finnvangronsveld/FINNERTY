'use client';
import { useEffect, useRef, useState } from 'react';
import { Power } from '@phosphor-icons/react';
import { engine } from '@/audio/engine';
import { useConsole } from './console-provider';

/**
 * Entrance: the site is a switched-off unit until you press power.
 * The press doubles as the user gesture browsers need before audio can play.
 */
export function BootGate() {
  const { powerOn } = useConsole();
  const [phase, setPhase] = useState<'off' | 'booting' | 'gone'>('off');
  const keyRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    keyRef.current?.focus({ preventScroll: true });
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, []);

  const start = (silent: boolean) => {
    if (phase !== 'off') return;
    powerOn(silent);
    setPhase('booting');
    const e = engine();
    for (let i = 0; i < 12; i++) e.boot(i, 0.35 + i * 0.075);
    window.setTimeout(() => {
      document.documentElement.style.overflow = '';
      setPhase('gone');
    }, 1100);
  };

  if (phase === 'gone') return null;

  return (
    <div className="gate" data-phase={phase} role="dialog" aria-modal="true" aria-labelledby="gate-title">
      <div className="gate__glow" aria-hidden />
      <div className="gate__panel">
        <h1 id="gate-title" className="gate__title">
          FINNERTY
        </h1>
        <button
          ref={keyRef}
          type="button"
          className="power"
          data-sfx="own"
          onPointerDown={() => engine().ctx && engine().key('down')}
          onClick={() => start(false)}
          aria-label="Power on with sound"
        >
          <span className="power__ring" aria-hidden />
          <span className="power__cap">
            <Power size={34} weight="bold" aria-hidden />
          </span>
        </button>
        <p className="gate__hint">Press power. Best with sound on.</p>
        <button type="button" className="gate__silent" data-sfx="own" onClick={() => start(true)}>
          Start without sound
        </button>
      </div>
    </div>
  );
}
