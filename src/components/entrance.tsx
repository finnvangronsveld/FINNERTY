'use client';
import { useEffect, useRef, useState } from 'react';
import { useDesk } from './desk-provider';

/**
 * The room is dark until you flip the light switch. The flip is also the
 * gesture browsers need before any sound can play.
 */
export function Entrance() {
  const { wake } = useDesk();
  const [phase, setPhase] = useState<'dark' | 'on' | 'gone'>('dark');
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    btn.current?.focus({ preventScroll: true });
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, []);

  const enter = (quiet: boolean) => {
    if (phase !== 'dark') return;
    wake(quiet);
    setPhase('on');
    window.setTimeout(() => {
      document.documentElement.style.overflow = '';
      setPhase('gone');
    }, 1300);
  };

  if (phase === 'gone') return null;

  return (
    <div className="entrance" data-phase={phase} role="dialog" aria-modal="true" aria-labelledby="entrance-title">
      <div className="entrance__inner">
        <p id="entrance-title" className="entrance__title">
          Come on in.
        </p>
        <button
          ref={btn}
          type="button"
          className="wallswitch"
          data-sfx="own"
          aria-label="Switch on the light"
          onClick={() => enter(false)}
        >
          <span className="wallswitch__screw" aria-hidden />
          <span className="wallswitch__well" aria-hidden>
            <span className="wallswitch__rocker" />
          </span>
          <span className="wallswitch__screw" aria-hidden />
        </button>
        <p className="entrance__hint">Flip the switch. Sound on is nicer.</p>
        <button type="button" className="entrance__quiet" data-sfx="own" onClick={() => enter(true)}>
          Come in quietly
        </button>
      </div>
    </div>
  );
}
