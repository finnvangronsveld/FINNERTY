'use client';
import { SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react';
import { engine } from '@/audio/engine';
import { useConsole } from './console-provider';
import { Knob, Toggle } from './hardware';
import { useEngine } from './use-engine';

const NAV = [
  { href: '#console', label: 'Console' },
  { href: '#pads', label: 'Pads' },
  { href: '#monitor', label: 'Monitor' },
  { href: '#links', label: 'Links' },
];

export function RackHeader() {
  const { theme, setTheme, powered } = useConsole();
  const volume = useEngine((s) => s.volume);
  const muted = useEngine((s) => s.muted);

  return (
    <header className="rack">
      <div className="rack__inner metal">
        <a href="#console" className="wordmark" aria-label="Finnerty, back to top">
          <span className="led" data-on={powered} aria-hidden />
          FINNERTY
        </a>
        <nav className="rack__nav" aria-label="Sections">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="navkey">
              {n.label}
            </a>
          ))}
        </nav>
        <div className="rack__controls">
          <Knob
            label="Vol"
            size="sm"
            value={volume}
            valueText={`${Math.round(volume * 100)} percent`}
            onChange={(v) => engine().setVolume(v)}
          />
          <button
            type="button"
            className="key key--square"
            aria-pressed={muted}
            aria-label={muted ? 'Unmute sound' : 'Mute sound'}
            onClick={() => engine().setMuted(!muted)}
          >
            {muted ? <SpeakerSlash size={18} weight="bold" /> : <SpeakerHigh size={18} weight="bold" />}
          </button>
          <Toggle
            label="Dark mode"
            on={theme === 'dark'}
            onChange={(on) => setTheme(on ? 'dark' : 'light')}
            onLabel="Dark"
          />
        </div>
      </div>
    </header>
  );
}
