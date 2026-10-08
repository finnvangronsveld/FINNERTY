'use client';
import { useEffect, useState } from 'react';
import { MusicNotes, TwitchLogo, User, YoutubeLogo, type Icon } from '@phosphor-icons/react';
import { sfx } from '@/lib/sfx';
import { LINKS, TWITCH_LOGIN } from '@/lib/links';
import { AppIcon } from './app-icon';
import { useDesk } from './desk-provider';

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="menubar__clock">
      {now.toLocaleTimeString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
    </span>
  );
}

type DockItem = {
  label: string;
  Icon: Icon;
  from: string;
  to: string;
  href?: string;
  action?: 'soundboard' | 'home';
};

const DOCK: DockItem[] = [
  { label: 'Finnerty', Icon: User, from: '#8fb8ff', to: '#2a5fd8', action: 'home' },
  { label: 'Twitch', Icon: TwitchLogo, from: '#b48bff', to: '#5b2fd0', href: LINKS.twitch },
  { label: 'YouTube', Icon: YoutubeLogo, from: '#ff7a7a', to: '#c9161d', href: LINKS.youtube },
  { label: 'Soundboard', Icon: MusicNotes, from: '#ffc36b', to: '#e2560f', action: 'soundboard' },
];

function Dock() {
  const [bouncing, setBouncing] = useState<string | null>(null);

  const launch = (item: DockItem) => {
    setBouncing(item.label);
    sfx().play('drop-a', { gain: 0.6, jitter: 0.05 });
    window.setTimeout(() => setBouncing(null), 900);
    if (item.action === 'soundboard') window.dispatchEvent(new CustomEvent('finnerty:open-app', { detail: 'soundboard' }));
  };

  return (
    <nav className="dock" aria-label="Dock" data-sfx="own">
      <span className="dock__shelf" aria-hidden />
      <ul className="dock__items">
        {DOCK.map((item) => {
          const inner = (
            <>
              <AppIcon Icon={item.Icon} from={item.from} to={item.to} size="lg" />
              <span className="dock__tip">{item.label}</span>
            </>
          );
          return (
            <li key={item.label} className="dock__item" data-bounce={bouncing === item.label}>
              {item.href ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={item.label}
                  onPointerEnter={(e) => e.pointerType === 'mouse' && sfx().hover()}
                  onClick={() => launch(item)}
                >
                  {inner}
                </a>
              ) : (
                <button
                  type="button"
                  aria-label={item.label}
                  onPointerEnter={(e) => e.pointerType === 'mouse' && sfx().hover()}
                  onClick={() => launch(item)}
                >
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function MainWindow() {
  const { channel } = useDesk();
  const live = channel.live === true;
  return (
    <section className="window" aria-labelledby="window-title">
      <header className="window__bar">
        <span className="traffic" aria-hidden>
          <span className="traffic__dot traffic__dot--red" />
          <span className="traffic__dot traffic__dot--yellow" />
          <span className="traffic__dot traffic__dot--green" />
        </span>
        <span className="window__title">Finnerty</span>
      </header>
      <div className="window__body">
        <div className="window__avatar">
          {channel.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={channel.avatar} alt="" />
          ) : (
            <span className="window__avatar-fallback">F</span>
          )}
          <span className="window__avatar-gloss" aria-hidden />
        </div>
        <div className="window__info">
          <h1 id="window-title" className="window__name">
            Finnerty
          </h1>
          <p className="window__status" data-live={live}>
            <span className="window__led" aria-hidden />
            {live ? `Live now${channel.uptime ? `, ${channel.uptime}` : ''}` : channel.live === false ? 'Offline right now' : 'Checking Twitch'}
          </p>
          <p className="window__text">Streams on Twitch as {TWITCH_LOGIN}. Come hang out in chat.</p>
          <div className="window__buttons">
            <a className="gel gel--blue" href={LINKS.twitch} target="_blank" rel="noreferrer">
              {live ? 'Watch live' : 'Watch on Twitch'}
            </a>
            <a className="gel" href={LINKS.youtube} target="_blank" rel="noreferrer">
              YouTube
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export function MonitorOS() {
  const { awake, wake } = useDesk();

  return (
    <div className="screen-os" data-awake={awake}>
      {!awake ? (
        <button type="button" className="sleep" data-sfx="own" onClick={() => wake(false)}>
          <span className="sleep__label">Click to wake</span>
          <span className="sleep__hint">Sound on is nicer</span>
        </button>
      ) : (
        <div className="os">
          <div className="menubar">
            <span className="menubar__brand">Finnerty</span>
            <span className="menubar__item">Stream</span>
            <span className="menubar__item">Soundboard</span>
            <span className="menubar__spacer" />
            <Clock />
          </div>
          <div className="os__desktop">
            <MainWindow />
          </div>
          <Dock />
        </div>
      )}
      <span className="screen-os__glare" aria-hidden />
    </div>
  );
}
