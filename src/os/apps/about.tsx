'use client';
import { LINKS, TWITCH_LOGIN } from '@/lib/links';
import { useOS } from '../store';
import { openApp } from '../wm';

export function About() {
  const avatar = useOS((s) => s.avatar);
  const live = useOS((s) => s.live);
  return (
    <div className="about">
      <div className="about__avatar">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="Finnerty's avatar" />
        ) : (
          <span className="logo-orb logo-orb--big" />
        )}
      </div>
      <h1 className="about__name">Finnerty</h1>
      <p className="about__version">FinnOS Version 10.6 Aqua</p>
      <p className="about__text">
        Streamer from Flanders. Live on Twitch as {TWITCH_LOGIN}. Pull up a chair and hang out in chat.
      </p>
      <dl className="about__specs">
        <dt>Twitch</dt>
        <dd>{live ? 'Live now' : live === false ? 'Offline' : 'Checking'}</dd>
        <dt>Channel</dt>
        <dd>twitch.tv/{TWITCH_LOGIN}</dd>
        <dt>YouTube</dt>
        <dd>@xfinnerty</dd>
      </dl>
      <div className="about__buttons">
        <button type="button" className="gel gel--blue" onClick={() => openApp('twitch')}>
          Watch on Twitch
        </button>
        <a className="gel" href={LINKS.youtube} target="_blank" rel="noreferrer">
          YouTube
        </a>
      </div>
    </div>
  );
}
