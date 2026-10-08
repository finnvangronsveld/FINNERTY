'use client';
import { TwitchLogo, YoutubeLogo } from '@phosphor-icons/react';
import { engine } from '@/audio/engine';
import { LINKS } from '@/lib/links';

const JACKS = [
  { href: LINKS.twitch, label: 'Twitch', note: 'Live streams', Icon: TwitchLogo },
  { href: LINKS.youtube, label: 'YouTube', note: 'Videos and clips', Icon: YoutubeLogo },
];

export function PatchBay() {
  return (
    <footer id="links" className="footer">
      <div className="bay metal" data-sfx="own">
        <p className="bay__title">Patch in.</p>
        <ul className="bay__jacks">
          {JACKS.map(({ href, label, note, Icon }) => (
            <li key={label}>
              <a
                className="jack"
                href={href}
                target="_blank"
                rel="noreferrer"
                onPointerEnter={(e) => e.pointerType === 'mouse' && engine().plug()}
                onFocus={() => engine().hover()}
                onPointerDown={() => engine().key('down', 1.2)}
              >
                <span className="jack__socket" aria-hidden>
                  <span className="jack__plug" />
                </span>
                <span className="jack__text">
                  <span className="jack__label">
                    <Icon size={18} weight="fill" aria-hidden />
                    {label}
                  </span>
                  <span className="jack__note">{note}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div className="footer__base">
        <span className="engrave" aria-hidden>
          FINNERTY
        </span>
        <p className="footer__legal">© {new Date().getFullYear()} Finn Vangronsveld. Every sound on this page is synthesized in your browser.</p>
      </div>
    </footer>
  );
}
