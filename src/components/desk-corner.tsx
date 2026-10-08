'use client';
import { TwitchLogo, YoutubeLogo } from '@phosphor-icons/react';
import { sfx } from '@/lib/sfx';
import { LINKS } from '@/lib/links';

const NOTES = [
  { href: LINKS.twitch, title: 'Twitch', line: 'Live streams, chat, the good stuff', Icon: TwitchLogo, color: 'lilac', tilt: -3 },
  { href: LINKS.youtube, title: 'YouTube', line: 'Clips and older streams', Icon: YoutubeLogo, color: 'butter', tilt: 2.5 },
];

export function DeskCorner() {
  return (
    <footer id="links" className="corner">
      <div className="corner__notes" data-sfx="own">
        {NOTES.map(({ href, title, line, Icon, color, tilt }) => (
          <a
            key={title}
            href={href}
            target="_blank"
            rel="noreferrer"
            className={`sticky sticky--${color}`}
            style={{ '--tilt': `${tilt}deg` } as React.CSSProperties}
            onPointerEnter={(e) => e.pointerType === 'mouse' && sfx().play('peel', { jitter: 0.08 })}
            onFocus={() => sfx().hover()}
            onClick={() => sfx().play('link')}
          >
            <span className="sticky__title">
              <Icon size={22} weight="fill" aria-hidden />
              {title}
            </span>
            <span className="sticky__line">{line}</span>
          </a>
        ))}
      </div>

      <div className="mug" aria-hidden>
        <span className="mug__steam">
          <span />
          <span />
          <span />
        </span>
        <span className="mug__cup">
          <span className="mug__coffee" />
        </span>
        <span className="mug__handle" />
      </div>

      <p className="corner__legal">
        © {new Date().getFullYear()} Finn Vangronsveld. Sounds by Kenney (CC0).
      </p>
    </footer>
  );
}
