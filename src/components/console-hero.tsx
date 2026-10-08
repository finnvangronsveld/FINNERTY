'use client';
import { useEffect, useRef } from 'react';
import { TwitchLogo, YoutubeLogo } from '@phosphor-icons/react';
import { useConsole } from './console-provider';
import { Screws, VuMeter } from './hardware';
import { Turntable } from './turntable';
import { useEngine } from './use-engine';
import { LINKS } from '@/lib/links';

/** Tilts an element toward the pointer with a damped spring. */
export function useTilt<T extends HTMLElement>(max = 5) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !window.matchMedia('(hover: hover) and (pointer: fine)').matches
    )
      return;
    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;
    let raf = 0;
    const move = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const loop = () => {
      x += (tx - x) * 0.06;
      y += (ty - y) * 0.06;
      el.style.setProperty('--ry', `${(x * max).toFixed(3)}deg`);
      el.style.setProperty('--rx', `${(-y * max * 0.7).toFixed(3)}deg`);
      el.style.setProperty('--gx', `${(50 + x * 30).toFixed(1)}%`);
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener('pointermove', move, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener('pointermove', move);
      cancelAnimationFrame(raf);
    };
  }, [max]);
  return ref;
}

const NAME = 'FINNERTY'.split('');

function StatusLine() {
  const { status } = useConsole();
  const playing = useEngine((s) => s.playing);
  const bpm = useEngine((s) => s.bpm);
  const step = useEngine((s) => s.step);

  let text = 'TUNING';
  if (status.live === true) text = status.uptime ? `ON AIR ${status.uptime}` : 'ON AIR';
  else if (status.live === false) text = 'OFF AIR';
  else if (status.live === null) text = 'NO SIGNAL';

  return (
    <div className="screen__status">
      <span className="onair" data-live={status.live === true}>
        {status.live === true ? 'LIVE' : 'OFF'}
      </span>
      <span className="screen__ticker">{text}</span>
      <span className="screen__bpm" data-playing={playing}>
        {playing ? `${String(step + 1).padStart(2, '0')}/16 ` : ''}
        {bpm} BPM
      </span>
    </div>
  );
}

export function ConsoleHero() {
  const unit = useTilt<HTMLDivElement>(5);
  const { status } = useConsole();

  return (
    <section id="console" className="hero">
      <div className="stage">
        <div ref={unit} className="unit metal">
          <Screws />
          <div className="unit__main">
            <div className="screen">
              <span className="screen__ghost" aria-hidden>
                {'88888888'}
              </span>
              <h2 className="screen__name" aria-label="Finnerty">
                {NAME.map((c, i) => (
                  <span key={i} style={{ '--i': i } as React.CSSProperties} aria-hidden>
                    {c}
                  </span>
                ))}
              </h2>
              <StatusLine />
              <span className="screen__glass" aria-hidden />
            </div>

            <div className="unit__copy">
              <p className="lede">
                Streams, hardstyle sets and loud nights from Flanders. Live on Twitch as finnerty_.
              </p>
              <div className="unit__keys">
                <a className="key key--primary" href={LINKS.twitch} target="_blank" rel="noreferrer">
                  <TwitchLogo size={20} weight="fill" aria-hidden />
                  {status.live ? 'Watch live' : 'Twitch'}
                </a>
                <a className="key" href={LINKS.youtube} target="_blank" rel="noreferrer">
                  <YoutubeLogo size={20} weight="fill" aria-hidden />
                  YouTube
                </a>
              </div>
            </div>

            <div className="unit__meters">
              <VuMeter label="L" />
              <VuMeter label="R" />
            </div>
          </div>
          <div className="unit__deck">
            <Turntable />
          </div>
        </div>
      </div>
    </section>
  );
}
