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
import { sfx, SoundName } from '@/lib/sfx';

type Key = { sound: SoundName; label: string; key: string; Icon: Icon; tint: string };

const KEYS: Key[] = [
  { sound: 'sb-hello', label: 'Hello chat', key: '1', Icon: HandWaving, tint: '#f6c768' },
  { sound: 'sb-follow', label: 'New follow', key: '2', Icon: Heart, tint: '#f39ab0' },
  { sound: 'sb-raid', label: 'Raid', key: '3', Icon: Rocket, tint: '#a98bff' },
  { sound: 'sb-hype', label: 'Hype', key: '4', Icon: Confetti, tint: '#ffa36b' },
  { sound: 'sb-gg', label: 'GG', key: 'q', Icon: Trophy, tint: '#f6c768' },
  { sound: 'sb-clip', label: 'Clip it', key: 'w', Icon: FilmSlate, tint: '#8fd3c1' },
  { sound: 'sb-cozy', label: 'Cozy', key: 'e', Icon: Coffee, tint: '#d9a77c' },
  { sound: 'sb-lurk', label: 'Lurk', key: 'r', Icon: Eye, tint: '#9fb6d9' },
  { sound: 'sb-brb', label: 'BRB', key: 'a', Icon: Clock, tint: '#c7c1b6' },
  { sound: 'sb-oops', label: 'Oops', key: 's', Icon: SmileyXEyes, tint: '#ff9b8a' },
  { sound: 'sb-thanks', label: 'Thank you', key: 'd', Icon: HandHeart, tint: '#f39ab0' },
  { sound: 'sb-night', label: 'Good night', key: 'f', Icon: MoonStars, tint: '#a98bff' },
];

export function StreamDeck() {
  const refs = useRef(new Map<string, HTMLButtonElement>());

  const fire = (k: Key) => {
    sfx().play(k.sound);
    const el = refs.current.get(k.key);
    if (!el) return;
    el.dataset.lit = 'false';
    void el.offsetWidth; // restart the glow animation
    el.dataset.lit = 'true';
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      const k = KEYS.find((x) => x.key === e.key.toLowerCase());
      if (!k) return;
      fire(k);
      refs.current.get(k.key)?.setAttribute('data-down', 'true');
    };
    const up = (e: KeyboardEvent) => {
      refs.current.get(e.key.toLowerCase())?.removeAttribute('data-down');
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  return (
    <section id="soundboard" className="soundboard">
      <div className="soundboard__text">
        <h2 className="hand-h2">The soundboard</h2>
        <p>
          The little sounds from stream, on twelve keys. Tap them, or use your keyboard: 1 to 4, Q to R
          and A to F.
        </p>
      </div>
      <div className="deck drop" style={{ '--drop': 3 } as React.CSSProperties}>
        <div className="deck__keys" data-sfx="own" role="group" aria-label="Soundboard">
          {KEYS.map((k) => (
            <button
              key={k.key}
              ref={(el) => {
                if (el) refs.current.set(k.key, el);
              }}
              type="button"
              className="deckkey"
              style={{ '--tint': k.tint } as React.CSSProperties}
              onPointerEnter={(e) => e.pointerType === 'mouse' && sfx().hover()}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                sfx().play('press', { gain: 0.6 });
                fire(k);
              }}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
                  e.preventDefault();
                  fire(k);
                }
              }}
            >
              <span className="deckkey__lcd">
                <k.Icon size={30} weight="duotone" aria-hidden />
                <span className="deckkey__label">{k.label}</span>
              </span>
              <kbd className="deckkey__kbd">{k.key.toUpperCase()}</kbd>
            </button>
          ))}
        </div>
        <span className="deck__logo" aria-hidden>
          finnerty deck
        </span>
      </div>
    </section>
  );
}
