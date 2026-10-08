'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import { sfx } from '@/lib/sfx';

export type Channel = { live: boolean | null; uptime: string | null; avatar: string | null };
type Theme = 'day' | 'night';

type Ctx = {
  awake: boolean;
  wake: (quiet: boolean) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  muted: boolean;
  channel: Channel;
};

const DeskContext = createContext<Ctx | null>(null);

export function useDesk() {
  const c = useContext(DeskContext);
  if (!c) throw new Error('useDesk outside DeskProvider');
  return c;
}

function readTheme(): Theme {
  return document.documentElement.dataset.theme === 'night' ? 'night' : 'day';
}
function subscribeTheme(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => mo.disconnect();
}

const INTERACTIVE = 'a[href], button, [role="switch"], summary';

export function DeskProvider({ children }: { children: React.ReactNode }) {
  const [awake, setAwake] = useState(false);
  const [channel, setChannel] = useState<Channel>({ live: null, uptime: null, avatar: null });
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => 'day' as const);
  const muted = useSyncExternalStore(
    (cb) => sfx().subscribe(cb),
    () => sfx().state.muted,
    () => false,
  );

  const setTheme = useCallback((t: Theme) => {
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem('finnerty:theme', t);
    } catch {
      /* ignore */
    }
  }, []);

  const wake = useCallback((quiet: boolean) => {
    const s = sfx();
    if (quiet) s.setMuted(true);
    void s.unlock().then(() => {
      s.play('screen-on', { gain: 0.8 });
      s.play('welcome', { delay: 0.5, gain: 0.7 });
    });
    setAwake(true);
    document.documentElement.dataset.awake = 'true';
  }, []);

  useEffect(() => sfx().prefetch(), []);

  // Live status and avatar from Twitch, refreshed every two minutes.
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch('/api/live')
        .then((r) => r.json())
        .then((d: Channel) => alive && setChannel(d))
        .catch(() => undefined);
    load();
    const id = setInterval(load, 120_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // Soft hover ticks and key clicks for every link and button.
  // Components with their own sound mark themselves data-sfx="own".
  useEffect(() => {
    let last: Element | null = null;
    const pick = (e: Event) => {
      const el = (e.target as Element | null)?.closest?.(INTERACTIVE);
      if (!el || el.closest('[data-sfx="own"]')) return null;
      return el;
    };
    const over = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const el = pick(e);
      if (el && el !== last) sfx().hover();
      last = el;
    };
    const down = (e: PointerEvent) => pick(e) && sfx().play('press', { jitter: 0.05 });
    const up = (e: PointerEvent) => pick(e) && sfx().play('release', { jitter: 0.05 });
    document.addEventListener('pointerover', over);
    document.addEventListener('pointerdown', down);
    document.addEventListener('pointerup', up);
    return () => {
      document.removeEventListener('pointerover', over);
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('pointerup', up);
    };
  }, []);

  // Light follows the pointer a little: shadows shift and objects tilt (see --lx/--ly in CSS).
  useEffect(() => {
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !window.matchMedia('(hover: hover) and (pointer: fine)').matches
    )
      return;
    const root = document.documentElement;
    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;
    let raf = 0;
    const move = (e: PointerEvent) => {
      tx = e.clientX / window.innerWidth - 0.5;
      ty = e.clientY / window.innerHeight - 0.5;
    };
    const loop = () => {
      x += (tx - x) * 0.07;
      y += (ty - y) * 0.07;
      root.style.setProperty('--lx', x.toFixed(4));
      root.style.setProperty('--ly', y.toFixed(4));
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener('pointermove', move, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener('pointermove', move);
      cancelAnimationFrame(raf);
    };
  }, []);

  const value = useMemo(
    () => ({ awake, wake, theme, setTheme, muted, channel }),
    [awake, wake, theme, setTheme, muted, channel],
  );
  return <DeskContext.Provider value={value}>{children}</DeskContext.Provider>;
}
