'use client';
import { useEffect, useRef } from 'react';
import {
  Clock,
  Coffee,
  Confetti,
  Eye,
  FilmSlate,
  HandHeart,
  HandWaving,
  Heart,
  type Icon,
  MoonStars,
  Rocket,
  SmileyXEyes,
  Trophy,
} from '@phosphor-icons/react';
import { AppIcon } from '@/components/app-icon';
import type { SoundName } from '@/lib/sfx';
import type { AppProps } from '../apps';
import { getState } from '../store';
import { play } from '../wm';

type Pad = { sound: SoundName; label: string; key: string; Icon: Icon; from: string; to: string };

const PADS: Pad[] = [
  { sound: 'sb-hello', label: 'Hello chat', key: '1', Icon: HandWaving, from: '#ffe08a', to: '#f0a412' },
  { sound: 'sb-follow', label: 'New follow', key: '2', Icon: Heart, from: '#ffb3c6', to: '#e8406e' },
  { sound: 'sb-raid', label: 'Raid', key: '3', Icon: Rocket, from: '#c7b0ff', to: '#6a3ee0' },
  { sound: 'sb-hype', label: 'Hype', key: '4', Icon: Confetti, from: '#ffc39b', to: '#ea5f1b' },
  { sound: 'sb-gg', label: 'GG', key: 'q', Icon: Trophy, from: '#ffe08a', to: '#d68a0c' },
  { sound: 'sb-clip', label: 'Clip it', key: 'w', Icon: FilmSlate, from: '#a6f0dd', to: '#1f9f86' },
  { sound: 'sb-cozy', label: 'Cozy', key: 'e', Icon: Coffee, from: '#e8c2a0', to: '#9a5a2c' },
  { sound: 'sb-lurk', label: 'Lurk', key: 'r', Icon: Eye, from: '#bcd3f5', to: '#4a72b8' },
  { sound: 'sb-brb', label: 'BRB', key: 'a', Icon: Clock, from: '#dcdde2', to: '#7d8190' },
  { sound: 'sb-oops', label: 'Oops', key: 's', Icon: SmileyXEyes, from: '#ffb8a8', to: '#df4a32' },
  { sound: 'sb-thanks', label: 'Thank you', key: 'd', Icon: HandHeart, from: '#ffc2d4', to: '#d33f78' },
  { sound: 'sb-night', label: 'Good night', key: 'f', Icon: MoonStars, from: '#b9a8ff', to: '#3b2a9c' },
];

export function Soundboard({ win }: AppProps) {
  const refs = useRef(new Map<string, HTMLButtonElement>());

  const fire = (p: Pad) => {
    play(p.sound);
    const el = refs.current.get(p.key);
    if (!el) return;
    el.dataset.lit = 'false';
    void el.offsetWidth;
    el.dataset.lit = 'true';
  };

  // Keyboard shortcuts work while the Soundboard is the front window.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || getState().focused !== win.id) return;
      const t = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA)$/.test(t.tagName)) return;
      const p = PADS.find((x) => x.key === e.key.toLowerCase());
      if (p) fire(p);
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [win.id]);

  return (
    <div className="soundboard">
      <div className="soundboard__pads" role="group" aria-label="Soundboard" data-sfx="own">
        {PADS.map((p) => (
          <button
            key={p.key}
            ref={(el) => {
              if (el) refs.current.set(p.key, el);
            }}
            type="button"
            className="sbpad"
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.preventDefault();
              fire(p);
            }}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
                e.preventDefault();
                fire(p);
              }
            }}
          >
            <AppIcon Icon={p.Icon} from={p.from} to={p.to} size="lg" />
            <span className="sbpad__label">{p.label}</span>
            <kbd className="sbpad__key">{p.key.toUpperCase()}</kbd>
          </button>
        ))}
      </div>
      <p className="soundboard__hint">Keys 1 to 4, Q to R and A to F play the pads while this window is in front.</p>
    </div>
  );
}
