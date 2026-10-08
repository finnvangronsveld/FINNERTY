'use client';
import { useState } from 'react';
import { Power, TwitchLogo } from '@phosphor-icons/react';
import { sfx } from '@/lib/sfx';
import { LINKS, TWITCH_LOGIN } from '@/lib/links';
import { useDesk } from './desk-provider';

export function Tablet() {
  const { channel } = useDesk();
  const [on, setOn] = useState(false);
  const live = channel.live === true;
  // Only rendered after a click, so this never runs on the server.
  const host = typeof window === 'undefined' ? null : window.location.hostname;

  const toggle = () => {
    sfx().play(on ? 'screen-off' : 'screen-on');
    setOn(!on);
  };

  return (
    <section id="stream" className="stream">
      <div className="stream__note drop" style={{ '--drop': 1 } as React.CSSProperties}>
        <span className="tape tape--note" aria-hidden />
        <h2 className="hand-h2">Tune in</h2>
        <p>
          {live
            ? "I'm live right now. Wake the tablet to watch here, or open the stream on Twitch."
            : "I'm not live at the moment. Follow on Twitch and you'll get a ping when I go live."}
        </p>
        <a className="sticker sticker--small" href={LINKS.twitch} target="_blank" rel="noreferrer" data-sfx="own"
          onPointerEnter={(e) => e.pointerType === 'mouse' && sfx().hover()}
          onClick={() => sfx().play('link')}>
          <TwitchLogo size={18} weight="fill" aria-hidden />
          Follow on Twitch
        </a>
      </div>

      <div className="tablet drop" data-on={on} style={{ '--drop': 2 } as React.CSSProperties}>
        <div className="tablet__screen">
          {!on && (
            <button type="button" className="tablet__wake" data-sfx="own" onClick={toggle}>
              <span className="tablet__wake-label">Tap to wake</span>
            </button>
          )}
          {on && live && host && (
            <iframe
              className="tablet__player"
              title="Finnerty live on Twitch"
              src={`https://player.twitch.tv/?channel=${TWITCH_LOGIN}&parent=${host}&autoplay=true`}
              allow="autoplay; fullscreen"
              allowFullScreen
            />
          )}
          {on && !live && (
            <div className="tablet__offline">
              <span className="tablet__moon" aria-hidden />
              <span className="tablet__offline-title">Offline for now</span>
              <span className="tablet__offline-sub">twitch.tv/{TWITCH_LOGIN}</span>
            </div>
          )}
          <span className="tablet__glare" aria-hidden />
        </div>
        <span className="tablet__camera" aria-hidden />
        <button
          type="button"
          className="tablet__power"
          data-sfx="own"
          aria-pressed={on}
          aria-label={on ? 'Put the tablet to sleep' : 'Wake the tablet'}
          onClick={toggle}
        >
          <Power size={12} weight="bold" aria-hidden />
        </button>
      </div>
    </section>
  );
}
