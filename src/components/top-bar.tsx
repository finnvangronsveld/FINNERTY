'use client';
import { SpeakerSimpleHigh, SpeakerSimpleSlash, Sun, MoonStars } from '@phosphor-icons/react';
import { sfx } from '@/lib/sfx';
import { useDesk } from './desk-provider';

const NAV = [
  { href: '#hello', label: 'Hello' },
  { href: '#stream', label: 'Stream' },
  { href: '#soundboard', label: 'Soundboard' },
  { href: '#links', label: 'Links' },
];

export function TopBar() {
  const { theme, setTheme, muted, channel } = useDesk();

  return (
    <header className="topbar">
      <div className="topbar__inner">
        <a href="#hello" className="nameplate" aria-label="Finnerty, back to the top">
          <span className="nameplate__text">Finnerty</span>
          <span className="nameplate__dot" data-live={channel.live === true} aria-hidden />
        </a>

        <nav className="tabs" aria-label="Sections">
          {NAV.map((n, i) => (
            <a key={n.href} href={n.href} className="tab" style={{ '--i': i } as React.CSSProperties}>
              {n.label}
            </a>
          ))}
        </nav>

        <div className="topbar__controls" data-sfx="own">
          <button
            type="button"
            role="switch"
            aria-checked={!muted}
            aria-label="Sound"
            className="pill-switch"
            onClick={() => {
              const next = !muted;
              if (!next) sfx().setMuted(false);
              sfx().play('toggle');
              if (next) sfx().setMuted(true);
            }}
          >
            <span className="pill-switch__knob">
              {muted ? (
                <SpeakerSimpleSlash size={14} weight="bold" aria-hidden />
              ) : (
                <SpeakerSimpleHigh size={14} weight="bold" aria-hidden />
              )}
            </span>
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={theme === 'night'}
            aria-label="Night mode"
            className="pill-switch pill-switch--theme"
            onClick={() => {
              sfx().play('lamp', { gain: 0.8 });
              setTheme(theme === 'night' ? 'day' : 'night');
            }}
          >
            <span className="pill-switch__knob">
              {theme === 'night' ? (
                <MoonStars size={14} weight="bold" aria-hidden />
              ) : (
                <Sun size={14} weight="bold" aria-hidden />
              )}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
