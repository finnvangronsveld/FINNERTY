'use client';
import { useEffect, useRef, useState } from 'react';
import {
  CaretLeft,
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
  MusicNotes,
  Rocket,
  SmileyXEyes,
  Trophy,
  TwitchLogo,
  User,
  YoutubeLogo,
} from '@phosphor-icons/react';
import { sfx, SoundName } from '@/lib/sfx';
import { LINKS } from '@/lib/links';
import { AppIcon } from './app-icon';
import { useDesk } from './desk-provider';

type Pad = { sound: SoundName; label: string; key: string; Icon: Icon; from: string; to: string };

const PADS: Pad[] = [
  { sound: 'sb-hello', label: 'Hello', key: '1', Icon: HandWaving, from: '#ffe08a', to: '#f0a412' },
  { sound: 'sb-follow', label: 'Follow', key: '2', Icon: Heart, from: '#ffb3c6', to: '#e8406e' },
  { sound: 'sb-raid', label: 'Raid', key: '3', Icon: Rocket, from: '#c7b0ff', to: '#6a3ee0' },
  { sound: 'sb-hype', label: 'Hype', key: 'q', Icon: Confetti, from: '#ffc39b', to: '#ea5f1b' },
  { sound: 'sb-gg', label: 'GG', key: 'w', Icon: Trophy, from: '#ffe08a', to: '#d68a0c' },
  { sound: 'sb-clip', label: 'Clip it', key: 'e', Icon: FilmSlate, from: '#a6f0dd', to: '#1f9f86' },
  { sound: 'sb-cozy', label: 'Cozy', key: 'a', Icon: Coffee, from: '#e8c2a0', to: '#9a5a2c' },
  { sound: 'sb-lurk', label: 'Lurk', key: 's', Icon: Eye, from: '#bcd3f5', to: '#4a72b8' },
  { sound: 'sb-brb', label: 'BRB', key: 'd', Icon: Clock, from: '#dcdde2', to: '#7d8190' },
  { sound: 'sb-oops', label: 'Oops', key: 'z', Icon: SmileyXEyes, from: '#ffb8a8', to: '#df4a32' },
  { sound: 'sb-thanks', label: 'Thanks', key: 'x', Icon: HandHeart, from: '#ffc2d4', to: '#d33f78' },
  { sound: 'sb-night', label: 'Night', key: 'c', Icon: MoonStars, from: '#b9a8ff', to: '#3b2a9c' },
];

function StatusBar() {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
  );
  useEffect(() => {
    const id = setInterval(
      () => setTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })),
      15_000,
    );
    return () => clearInterval(id);
  }, []);
  return (
    <div className="ios-status" aria-hidden>
      <span className="ios-status__carrier">
        <span className="ios-bars">
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
        Finn
      </span>
      <span className="ios-status__time">{time}</span>
      <span className="ios-battery">
        <span />
      </span>
    </div>
  );
}

function Soundboard({ onClose }: { onClose: () => void }) {
  const refs = useRef(new Map<string, HTMLButtonElement>());

  const fire = (p: Pad) => {
    sfx().play(p.sound);
    const el = refs.current.get(p.key);
    if (!el) return;
    el.dataset.lit = 'false';
    void el.offsetWidth;
    el.dataset.lit = 'true';
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const p = PADS.find((x) => x.key === e.key.toLowerCase());
      if (p) fire(p);
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, []);

  return (
    <div className="ios-app">
      <div className="ios-nav">
        <button type="button" className="ios-back" onClick={onClose}>
          <CaretLeft size={12} weight="bold" aria-hidden />
          Home
        </button>
        <span className="ios-nav__title">Soundboard</span>
      </div>
      <div className="ios-pads" role="group" aria-label="Soundboard" data-sfx="own">
        {PADS.map((p) => (
          <button
            key={p.key}
            ref={(el) => {
              if (el) refs.current.set(p.key, el);
            }}
            type="button"
            className="ios-pad"
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
            <AppIcon Icon={p.Icon} from={p.from} to={p.to} size="sm" />
            <span className="ios-pad__label">{p.label}</span>
            <kbd className="ios-pad__key">{p.key.toUpperCase()}</kbd>
          </button>
        ))}
      </div>
    </div>
  );
}

const HOME_APPS: { label: string; Icon: Icon; from: string; to: string; href?: string; app?: 'soundboard' }[] = [
  { label: 'Twitch', Icon: TwitchLogo, from: '#b48bff', to: '#5b2fd0', href: LINKS.twitch },
  { label: 'YouTube', Icon: YoutubeLogo, from: '#ff7a7a', to: '#c9161d', href: LINKS.youtube },
  { label: 'Sounds', Icon: MusicNotes, from: '#ffc36b', to: '#e2560f', app: 'soundboard' },
  { label: 'Finn', Icon: User, from: '#8fb8ff', to: '#2a5fd8', href: '#top' },
];

export function Phone() {
  const { awake } = useDesk();
  const [app, setApp] = useState<'home' | 'soundboard'>('home');

  useEffect(() => {
    const open = (e: Event) => {
      if ((e as CustomEvent).detail === 'soundboard') {
        sfx().play('screen-on', { gain: 0.6 });
        setApp('soundboard');
      }
    };
    window.addEventListener('finnerty:open-app', open);
    return () => window.removeEventListener('finnerty:open-app', open);
  }, []);

  const goHome = () => {
    sfx().play('screen-off', { gain: 0.6 });
    setApp('home');
  };

  return (
    <div className="iphone" data-awake={awake}>
      <span className="iphone__speaker" aria-hidden />
      <span className="iphone__camera" aria-hidden />
      <div className="iphone__screen">
        {awake && (
          <div className="ios" data-app={app}>
            <StatusBar />
            {app === 'home' ? (
              <div className="ios-home">
                <ul className="ios-grid">
                  {HOME_APPS.map((a) => (
                    <li key={a.label}>
                      {a.href ? (
                        <a
                          className="ios-app-link"
                          href={a.href}
                          target={a.href.startsWith('http') ? '_blank' : undefined}
                          rel="noreferrer"
                        >
                          <AppIcon Icon={a.Icon} from={a.from} to={a.to} />
                          <span>{a.label}</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          className="ios-app-link"
                          onClick={() => {
                            sfx().play('screen-on', { gain: 0.6 });
                            setApp('soundboard');
                          }}
                        >
                          <AppIcon Icon={a.Icon} from={a.from} to={a.to} />
                          <span>{a.label}</span>
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="ios-hint">Open Sounds and press a pad</p>
              </div>
            ) : (
              <Soundboard onClose={goHome} />
            )}
          </div>
        )}
        <span className="iphone__glare" aria-hidden />
      </div>
      <button type="button" className="iphone__home" aria-label="Home button" onClick={goHome} disabled={!awake}>
        <span />
      </button>
    </div>
  );
}
