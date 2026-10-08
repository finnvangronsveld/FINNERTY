'use client';
import { useEffect, useRef, useState } from 'react';
import { Power, TwitchLogo } from '@phosphor-icons/react';
import { engine } from '@/audio/engine';
import { LINKS, TWITCH_LOGIN } from '@/lib/links';
import { useConsole } from './console-provider';

function Static({ active }: { active: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!active) return;
    const c = canvas.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const img = ctx.createImageData(c.width, c.height);
    let raf = 0;
    let frame = 0;
    const draw = () => {
      frame++;
      if (frame % 2 === 0) {
        const d = img.data;
        const roll = (frame * 3) % c.height;
        for (let y = 0; y < c.height; y++) {
          const band = Math.abs(y - roll) < 6 ? 60 : 0;
          for (let x = 0; x < c.width; x++) {
            const i = (y * c.width + x) * 4;
            const v = Math.random() * 200 + band;
            d[i] = v;
            d[i + 1] = v;
            d[i + 2] = v;
            d[i + 3] = 255;
          }
        }
        ctx.putImageData(img, 0, 0);
      }
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [active]);
  return <canvas ref={canvas} className="crt__static" width={160} height={120} aria-hidden />;
}

export function Monitor() {
  const { status } = useConsole();
  const [on, setOn] = useState(false);
  const live = status.live === true;
  // The player only renders after a click, so this never runs during SSR.
  const host = typeof window === 'undefined' ? null : window.location.hostname;

  useEffect(() => {
    engine().setStatic(on && !live);
  }, [on, live]);

  useEffect(() => () => engine().setStatic(false), []);

  const toggle = () => {
    const e = engine();
    e.key('down', 1.2);
    if (on) e.crtOff();
    else e.degauss();
    setOn(!on);
  };

  return (
    <section id="monitor" className="section section--monitor">
      <div className="monitor-copy">
        <h2 className="h2">Tune in.</h2>
        <p className="body">
          {live
            ? 'Finn is live right now. Switch the set on to watch here, or open the stream on Twitch.'
            : 'Nothing on air right now. Follow on Twitch and you get a ping the moment the stream starts.'}
        </p>
        <a className="key key--primary" href={LINKS.twitch} target="_blank" rel="noreferrer">
          <TwitchLogo size={20} weight="fill" aria-hidden />
          Follow on Twitch
        </a>
      </div>

      <div className="crt-stage">
        <div className="crt" data-on={on}>
          <div className="crt__face metal">
            <div className="crt__bezel">
              <div className="crt__tube">
                {on && live && host && (
                  <iframe
                    className="crt__player"
                    title="Finnerty live on Twitch"
                    src={`https://player.twitch.tv/?channel=${TWITCH_LOGIN}&parent=${host}&autoplay=true`}
                    allow="autoplay; fullscreen"
                    allowFullScreen
                  />
                )}
                {on && !live && (
                  <>
                    <Static active={on} />
                    <div className="crt__card">
                      <span>{status.live === null ? 'NO SIGNAL' : 'OFF AIR'}</span>
                      <span className="crt__card-sub">CH 1 / TWITCH</span>
                    </div>
                  </>
                )}
                <span className="crt__scan" aria-hidden />
                <span className="crt__curve" aria-hidden />
              </div>
            </div>
            <div className="crt__panel" data-sfx="own">
              <span className="silk">FNRTY VISION</span>
              <button
                type="button"
                className="key key--square crt__power"
                aria-pressed={on}
                aria-label={on ? 'Switch the monitor off' : 'Switch the monitor on'}
                onClick={toggle}
              >
                <Power size={16} weight="bold" aria-hidden />
              </button>
              <span className="led" data-on={on} aria-hidden />
            </div>
          </div>
          <span className="crt__side" aria-hidden />
          <span className="crt__top" aria-hidden />
        </div>
      </div>
    </section>
  );
}
