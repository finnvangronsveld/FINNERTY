'use client';
import { useEffect, useRef } from 'react';
import { Power } from '@phosphor-icons/react';
import { sfx } from '@/lib/sfx';
import { APPS } from './apps';
import { Desktop } from './desktop';
import { Dock } from './dock';
import { hydrateFs } from './fs';
import { MenuBar } from './menubar';
import { DialogLayer, Notifications, Spotlight } from './overlays';
import { getState, hydrateSettings, notify, setState, useOS } from './store';
import { close, focusedApp, minimize, MENU_H, openApp, play, quitApp } from './wm';
import { Window } from './window';

function Boot() {
  useEffect(() => {
    const id = window.setTimeout(() => setState({ phase: 'login' }), 2600);
    return () => clearTimeout(id);
  }, []);
  return (
    <div className="boot" aria-label="Starting up">
      <span className="logo-orb logo-orb--boot" />
      <span className="progress" aria-hidden>
        <span className="progress__bar" />
      </span>
    </div>
  );
}

function Login() {
  const avatar = useOS((s) => s.avatar);
  const wallpaper = useOS((s) => s.settings.wallpaper);
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => btn.current?.focus(), []);

  const enter = (quiet: boolean) => {
    const s = sfx();
    if (quiet) s.setMuted(true);
    s.setVolume(getState().settings.volume);
    void s.unlock().then(() => play('startup'));
    setState({ phase: 'desktop' });
    window.setTimeout(() => {
      notify('Welcome to FinnOS', 'Open Welcome.txt on the desktop for a quick tour.', 'textedit');
      if (getState().live) notify('Finnerty is live!', 'Click to watch the stream.', 'twitch');
    }, 1400);
  };

  return (
    <div className="login" data-wallpaper={wallpaper}>
      <div className="login__card">
        <button ref={btn} type="button" className="login__user" onClick={() => enter(false)} data-sfx="own">
          <span className="login__avatar">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="" />
            ) : (
              <span className="logo-orb logo-orb--big" />
            )}
          </span>
          <span className="login__name">Finn</span>
        </button>
        <button type="button" className="gel gel--blue" onClick={() => enter(false)} data-sfx="own">
          Log In
        </button>
        <button type="button" className="login__quiet" onClick={() => enter(true)} data-sfx="own">
          Log in without sound
        </button>
      </div>
      <p className="login__foot">FinnOS</p>
    </div>
  );
}

function Sleep() {
  useEffect(() => {
    const wake = () => {
      setState({ phase: 'desktop' });
      sfx().play('welcome', { gain: 0.6 });
    };
    const t = window.setTimeout(() => {
      window.addEventListener('pointerdown', wake, { once: true });
      window.addEventListener('keydown', wake, { once: true });
    }, 400);
    return () => {
      clearTimeout(t);
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('keydown', wake);
    };
  }, []);
  return (
    <div className="blackout">
      <span className="blackout__hint">Click or press a key to wake</span>
    </div>
  );
}

function Off() {
  return (
    <div className="blackout">
      <button type="button" className="powerkey" aria-label="Start up" onClick={() => setState({ phase: 'boot' })} data-sfx="own">
        <Power size={30} weight="bold" />
      </button>
    </div>
  );
}

function useLiveStatus() {
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch('/api/live')
        .then((r) => r.json())
        .then((d: { live: boolean | null; uptime: string | null; avatar: string | null }) => {
          if (!alive) return;
          const was = getState().live;
          setState({ live: d.live, uptime: d.uptime, avatar: d.avatar ?? getState().avatar });
          if (was === false && d.live === true && getState().phase === 'desktop') {
            notify('Finnerty just went live!', 'Click to watch the stream.', 'twitch');
            play('notify');
          }
        })
        .catch(() => undefined);
    load();
    const id = setInterval(load, 90_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
}

const INTERACTIVE = 'button, a[href], [role="menuitem"], [role="tab"], summary';

function useInterfaceSounds() {
  useEffect(() => {
    let last: Element | null = null;
    const pick = (e: Event) => {
      const el = (e.target as Element | null)?.closest?.(INTERACTIVE);
      if (!el || el.closest('[data-sfx="own"]') || (el as HTMLButtonElement).disabled) return null;
      return el;
    };
    const over = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !getState().settings.uiSounds) return;
      const el = pick(e);
      if (el && el !== last) sfx().hover();
      last = el;
    };
    const down = (e: PointerEvent) => pick(e) && play('press', { gain: 0.8, jitter: 0.05 });
    document.addEventListener('pointerover', over);
    document.addEventListener('pointerdown', down);
    return () => {
      document.removeEventListener('pointerover', over);
      document.removeEventListener('pointerdown', down);
    };
  }, []);
}

function useShortcuts() {
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const s = getState();
      if (s.phase !== 'desktop') return;
      const mod = e.altKey || e.ctrlKey;
      if (mod && e.code === 'Space') {
        e.preventDefault();
        setState({ spotlight: !s.spotlight });
        return;
      }
      if (e.key === 'Escape' && s.spotlight) setState({ spotlight: false });
      if (!e.altKey) return;
      const f = s.windows.find((w) => w.id === s.focused && !w.minimized);
      if (e.code === 'KeyW' && f) {
        e.preventDefault();
        close(f.id);
      }
      if (e.code === 'KeyM' && f) {
        e.preventDefault();
        minimize(f.id);
      }
      if (e.code === 'KeyQ') {
        e.preventDefault();
        const a = focusedApp();
        if (a) quitApp(a);
      }
      if (e.code === 'KeyN') {
        e.preventDefault();
        const a = focusedApp() ?? 'finder';
        openApp(a, a === 'finder' ? { path: '/Desktop' } : undefined);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
}

export function Shell() {
  const phase = useOS((s) => s.phase);
  const windows = useOS((s) => s.windows);
  useEffect(() => {
    hydrateSettings();
    hydrateFs();
    sfx().prefetch();
  }, []);
  useLiveStatus();
  useInterfaceSounds();
  useShortcuts();

  // Keep zoomed windows filling the screen when the browser window changes size.
  useEffect(() => {
    const fit = () =>
      setState((s) => {
        const dock = s.settings.dockSize + 26;
        const compact = window.innerWidth < 760;
        const w = window.innerWidth;
        const h = window.innerHeight - MENU_H - (compact ? 66 : dock);
        return {
          windows: s.windows.map((x) =>
            x.maximized || compact ? { ...x, maximized: true, x: 0, y: 0, w, h } : { ...x, x: Math.min(x.x, w - 120), y: Math.min(x.y, h - 40) },
          ),
        };
      });
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  return (
    <div className="os" data-phase={phase}>
      {phase === 'boot' && <Boot />}
      {phase === 'login' && <Login />}
      {phase === 'off' && <Off />}
      {(phase === 'desktop' || phase === 'sleep') && (
        <>
          <MenuBar />
          <div className="os__stage">
            <Desktop />
            <div className="os__windows">
              {windows.map((w) => (
                <Window key={w.id} win={w} />
              ))}
            </div>
          </div>
          <Dock />
          <Spotlight />
          <Notifications />
          <DialogLayer />
          <h1 className="sr-only">Finnerty: FinnOS, a desktop in your browser. {Object.keys(APPS).length} apps.</h1>
        </>
      )}
      {phase === 'sleep' && <Sleep />}
    </div>
  );
}
