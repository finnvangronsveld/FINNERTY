'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowUpRight, Maximize2, Minimize2, Play, X } from 'lucide-react';
import Link from 'next/link';
import { useSite } from './site-provider';
import type { CSSProperties } from 'react';

type TwitchPlayer = {
  addEventListener: (event: string, listener: () => void) => void;
  play: () => void;
  pause: () => void;
};
type TwitchConstructor = {
  new (host: string, options: Record<string, unknown>): TwitchPlayer;
  READY: string;
  PLAYING: string;
  PLAYBACK_BLOCKED: string;
  PAUSE: string;
  OFFLINE: string;
  ONLINE: string;
};
declare global {
  interface Window {
    Twitch?: { Player: TwitchConstructor };
  }
}

export function PlayerAnchor() {
  return <div id="stream-anchor" className="player-anchor" aria-hidden="true" />;
}
export function PersistentPlayer() {
  const { config, stream, demoPlayback, setDemoPlayback } = useSite();
  const pathname = usePathname();
  const router = useRouter();
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<TwitchPlayer | null>(null);
  const [mounted, setMounted] = useState(false);
  const [narrow, setNarrow] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [manualDock, setManualDock] = useState(false);
  const [geometry, setGeometry] = useState<CSSProperties>({});
  const [expanded, setExpanded] = useState(false);
  const [playback, setPlayback] = useState('loading');
  const live = stream.status === 'live';
  const playerVisible = live && !dismissed && !narrow;
  useEffect(() => {
    function position() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const small = width < 432 || height < 420;
      setNarrow(small);
      if (live && !small) setMounted(true);
      const anchor = document.getElementById('stream-anchor');
      const bounds = anchor?.getBoundingClientRect();
      const inAnchor =
        !!bounds &&
        bounds.width >= 400 &&
        bounds.top >= 96 &&
        bounds.top + Math.max(300, (bounds.width * 9) / 16) + 44 <= height - 16 &&
        !manualDock &&
        !small;
      setExpanded(inAnchor);
      if (inAnchor && bounds)
        setGeometry({
          top: bounds.top,
          left: bounds.left,
          width: bounds.width,
          height: Math.max(300, (bounds.width * 9) / 16) + 44,
        });
      else {
        const dockWidth = Math.min(544, width - 32);
        setGeometry({
          bottom: 20,
          right: 16,
          width: dockWidth,
          height: Math.max(300, (dockWidth * 9) / 16) + 44,
        });
      }
    }
    let frame = requestAnimationFrame(position);
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(position);
    };
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, { passive: true });
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule);
    };
  }, [pathname, manualDock, live]);
  useEffect(() => {
    if (config.demo || !mounted || !config.channelLogin || player.current || !host.current) return;
    let cancelled = false;
    const create = () => {
      if (cancelled || player.current || !host.current || !window.Twitch) return;
      if (!config.embedParents.includes(window.location.hostname)) {
        setPlayback('unavailable');
        return;
      }
      const api = window.Twitch.Player;
      const instance = new api('finnerty-twitch-host', {
        channel: config.channelLogin,
        parent: config.embedParents,
        width: '100%',
        height: '100%',
        autoplay: true,
        muted: true,
      });
      player.current = instance;
      instance.addEventListener(api.READY, () => {
        const iframe = host.current?.querySelector('iframe');
        if (iframe) iframe.title = 'Finnerty Twitch livestream';
        setPlayback('ready');
      });
      instance.addEventListener(api.PLAYING, () => setPlayback('playing'));
      instance.addEventListener(api.PLAYBACK_BLOCKED, () => setPlayback('blocked'));
      instance.addEventListener(api.PAUSE, () => setPlayback('paused'));
      instance.addEventListener(api.OFFLINE, () => setPlayback('offline'));
      instance.addEventListener(api.ONLINE, () => setPlayback('ready'));
    };
    let script = document.querySelector<HTMLScriptElement>('script[data-twitch-sdk]');
    if (window.Twitch) create();
    else {
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://player.twitch.tv/js/embed/v1.js';
        script.dataset.twitchSdk = 'true';
        document.body.appendChild(script);
      }
      script.addEventListener('load', create);
      script.addEventListener('error', failed);
    }
    function failed() {
      setPlayback('unavailable');
    }
    const timeout = setTimeout(() => {
      if (!player.current) setPlayback('unavailable');
    }, 15000);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      script?.removeEventListener('load', create);
      script?.removeEventListener('error', failed);
    };
  }, [mounted, config.demo, config.channelLogin, config.embedParents]);
  useEffect(() => {
    if (!playerVisible) player.current?.pause();
  }, [playerVisible]);
  const start = useCallback(() => {
    setDemoPlayback('ready');
    player.current?.play();
  }, [setDemoPlayback]);
  const state = config.demo ? demoPlayback : playback;
  return (
    <>
      {/* Permanent DOM host: never keyed by route, never portalled, never reparented. */}
      <aside
        className={`persistent-player ${expanded ? 'expanded' : 'docked'}`}
        style={{ ...geometry, display: playerVisible ? 'flex' : 'none' }}
        aria-label="Livestream"
        data-testid="persistent-player"
      >
        <div className="player-toolbar">
          <span>
            <span className="status-dot" />
            {config.demo ? 'DEMO STREAM' : 'LIVE · FINNERTY'}
          </span>
          <div>
            {(['blocked', 'paused', 'ready'].includes(state) && !config.demo) ||
            state === 'blocked' ? (
              <button onClick={start}>
                <Play size={14} />
                Start stream
              </button>
            ) : null}
            {state === 'loading' && <span>Verbinden…</span>}
            {state === 'offline' && <span>Stream offline</span>}
            {state === 'unavailable' && <span>Player niet beschikbaar</span>}
            <button
              onClick={() => {
                if (expanded) setManualDock(true);
                else {
                  setManualDock(false);
                  if (pathname !== '/stream') router.push('/stream');
                  else
                    document.getElementById('stream-anchor')?.scrollIntoView({ block: 'center' });
                }
              }}
              aria-label={expanded ? 'Player verkleinen' : 'Player vergroten'}
            >
              {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
            <button onClick={() => setDismissed(true)} aria-label="Stream sluiten">
              <X size={17} />
            </button>
          </div>
        </div>
        <div
          className="player-video"
          id="finnerty-twitch-host"
          ref={host}
          data-testid="player-host"
        >
          {mounted && config.demo && (
            <iframe
              title="Lokale demo livestream"
              src="/demo/player"
              data-testid="demo-player-frame"
            />
          )}
        </div>
      </aside>
      {live && (narrow || dismissed) && (
        <div className="live-bar">
          <span>
            <span className="status-dot" />
            {config.demo ? 'Demo livestream' : 'Finnerty is live'}
          </span>
          {narrow ? (
            config.channelLogin ? (
              <a
                href={`https://www.twitch.tv/${config.channelLogin}`}
                target="_blank"
                rel="noreferrer"
              >
                Open op Twitch <ArrowUpRight size={14} />
              </a>
            ) : (
              <span>Kanaallink nog niet ingesteld</span>
            )
          ) : (
            <button
              onClick={() => {
                setDismissed(false);
                player.current?.play();
              }}
            >
              Stream heropenen <Play size={14} />
            </button>
          )}
        </div>
      )}
      {live && narrow && (
        <p className="mobile-player-note">Op dit scherm openen we de stream op Twitch.</p>
      )}
      {live && !dismissed && !narrow && state === 'unavailable' && (
        <div className="player-recovery">
          De player is niet beschikbaar.{' '}
          {config.channelLogin ? (
            <a href={`https://www.twitch.tv/${config.channelLogin}`}>Open op Twitch</a>
          ) : (
            <Link href="/stream">Bekijk streamstatus</Link>
          )}
        </div>
      )}
    </>
  );
}
