'use client';
import { useState } from 'react';
import { ChatCircleText, TwitchLogo } from '@phosphor-icons/react';
import { LINKS, TWITCH_LOGIN } from '@/lib/links';
import { useOS } from '../store';

/** The stream with chat next to it. Twitch shows its own offline screen when Finn isn't live. */
export function Twitch() {
  const live = useOS((s) => s.live);
  const uptime = useOS((s) => s.uptime);
  const [chat, setChat] = useState(true);
  const host = typeof window === 'undefined' ? 'localhost' : window.location.hostname;

  return (
    <div className="twitch">
      <div className="twitch__bar">
        <span className="twitch__status" data-live={live === true}>
          <span className="twitch__dot" aria-hidden />
          {live ? `Live${uptime ? ` for ${uptime}` : ''}` : live === false ? 'Offline' : 'Checking'}
        </span>
        <span className="twitch__name">{TWITCH_LOGIN}</span>
        <div className="twitch__actions">
          <button type="button" className="tb-btn tb-btn--dark" data-on={chat} onClick={() => setChat(!chat)}>
            <ChatCircleText size={14} weight="fill" /> Chat
          </button>
          <a className="tb-btn tb-btn--dark" href={LINKS.twitch} target="_blank" rel="noreferrer">
            <TwitchLogo size={14} weight="fill" /> Follow
          </a>
        </div>
      </div>
      <div className="twitch__main" data-chat={chat}>
        <iframe
          className="twitch__player"
          title="Finnerty on Twitch"
          src={`https://player.twitch.tv/?channel=${TWITCH_LOGIN}&parent=${host}&autoplay=${live ? 'true' : 'false'}&muted=false`}
          allow="autoplay; fullscreen"
          allowFullScreen
        />
        {chat && (
          <iframe
            className="twitch__chat"
            title="Twitch chat"
            src={`https://www.twitch.tv/embed/${TWITCH_LOGIN}/chat?parent=${host}&darkpopout`}
          />
        )}
      </div>
    </div>
  );
}
