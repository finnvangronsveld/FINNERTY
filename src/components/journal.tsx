'use client';
import { useState } from 'react';
import { TwitchLogo, YoutubeLogo } from '@phosphor-icons/react';
import { sfx } from '@/lib/sfx';
import { LINKS, TWITCH_LOGIN } from '@/lib/links';
import { useDesk } from './desk-provider';

function Polaroid() {
  const { channel } = useDesk();
  const [flipped, setFlipped] = useState(false);
  const [broken, setBroken] = useState(false);

  return (
    <button
      type="button"
      className="polaroid"
      data-flipped={flipped}
      data-sfx="own"
      aria-pressed={flipped}
      aria-label={flipped ? 'Turn the photo back over' : 'Turn the photo over'}
      onClick={() => {
        sfx().play('flip', { jitter: 0.08 });
        setFlipped(!flipped);
      }}
      onPointerEnter={(e) => e.pointerType === 'mouse' && sfx().hover()}
    >
      <span className="tape tape--polaroid" aria-hidden />
      <span className="polaroid__card">
        <span className="polaroid__front">
          <span className="polaroid__photo">
            {channel.avatar && !broken ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={channel.avatar} alt="Finnerty's Twitch avatar" onError={() => setBroken(true)} />
            ) : (
              <span className="polaroid__placeholder" aria-hidden>
                F
              </span>
            )}
          </span>
          <span className="polaroid__caption">{TWITCH_LOGIN}</span>
        </span>
        <span className="polaroid__back">
          <span className="polaroid__note">
            Thanks for stopping by.
            <br />
            See you in chat!
          </span>
          <span className="polaroid__sign">Finn</span>
        </span>
      </span>
    </button>
  );
}

function OnAir() {
  const { channel } = useDesk();
  const live = channel.live === true;
  return (
    <div className="onair" data-live={live} aria-live="polite">
      <span className="onair__glass">
        <span className="onair__word">{live ? 'On air' : 'Off air'}</span>
      </span>
      <span className="onair__note">
        {live
          ? `Live for ${channel.uptime ?? 'a bit'}`
          : channel.live === false
            ? 'Not live right now'
            : 'Checking Twitch'}
      </span>
    </div>
  );
}

export function Journal() {
  const { channel } = useDesk();
  return (
    <section id="hello" className="hello">
      <div className="journal drop" style={{ '--drop': 0 } as React.CSSProperties}>
        <div className="journal__page journal__page--left">
          <h1 className="journal__title">
            Hey, I&apos;m <em>Finn.</em>
          </h1>
          <p className="journal__lede">
            I stream on Twitch as finnerty_. Pull up a chair, grab a drink and hang out with chat.
          </p>
          <div className="journal__actions">
            <a className="sticker" href={LINKS.twitch} target="_blank" rel="noreferrer" data-sfx="own"
              onPointerEnter={(e) => e.pointerType === 'mouse' && sfx().hover()}
              onClick={() => sfx().play('link')}>
              <TwitchLogo size={20} weight="fill" aria-hidden />
              {channel.live ? 'Watch live' : 'Watch on Twitch'}
            </a>
            <a className="washi-link" href={LINKS.youtube} target="_blank" rel="noreferrer">
              <YoutubeLogo size={18} weight="fill" aria-hidden />
              YouTube
            </a>
          </div>
        </div>
        <div className="journal__spine" aria-hidden />
        <div className="journal__page journal__page--right">
          <Polaroid />
          <OnAir />
        </div>
      </div>
    </section>
  );
}
