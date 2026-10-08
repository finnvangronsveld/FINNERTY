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
import { engine } from '@/audio/engine';

export type LiveStatus = { live: boolean | null; uptime: string | null };

type Ctx = {
  powered: boolean;
  powerOn: (silent: boolean) => void;
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
  status: LiveStatus;
};

const ConsoleContext = createContext<Ctx | null>(null);

export function useConsole() {
  const c = useContext(ConsoleContext);
  if (!c) throw new Error('useConsole outside provider');
  return c;
}

// The theme lives on <html data-theme>, set pre-paint by the inline script in layout.
function readTheme(): 'light' | 'dark' {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}
function subscribeTheme(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => mo.disconnect();
}

const INTERACTIVE = 'a[href], button, [role="switch"], [role="slider"], summary';

export function ConsoleProvider({ children }: { children: React.ReactNode }) {
  const [powered, setPowered] = useState(false);
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => 'dark' as const);
  const [status, setStatus] = useState<LiveStatus>({ live: null, uptime: null });

  const setTheme = useCallback((t: 'light' | 'dark') => {
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem('finnerty:theme', t);
    } catch {
      /* ignore */
    }
  }, []);

  const powerOn = useCallback((silent: boolean) => {
    const e = engine();
    e.init(silent);
    e.relay();
    e.startHum();
    setPowered(true);
    document.documentElement.dataset.powered = 'true';
  }, []);

  // Live status from Twitch, refreshed every two minutes.
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch('/api/live')
        .then((r) => r.json())
        .then((d: LiveStatus) => alive && setStatus(d))
        .catch(() => alive && setStatus({ live: null, uptime: null }));
    load();
    const id = setInterval(load, 120_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // Generic interface sounds for every link and button. Components that make
  // their own sound mark themselves with data-sfx="own".
  useEffect(() => {
    let lastHover: Element | null = null;
    const target = (e: Event) => {
      const el = (e.target as Element | null)?.closest?.(INTERACTIVE);
      if (!el || el.closest('[data-sfx="own"]')) return null;
      return el;
    };
    const over = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const el = target(e);
      if (el && el !== lastHover) engine().hover();
      lastHover = el;
    };
    const down = (e: PointerEvent) => {
      if (target(e)) engine().key('down');
    };
    const up = (e: PointerEvent) => {
      if (target(e)) engine().key('up');
    };
    const keydown = (e: KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && !e.repeat && target(e)) engine().key('down');
    };
    document.addEventListener('pointerover', over);
    document.addEventListener('pointerdown', down);
    document.addEventListener('pointerup', up);
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('pointerover', over);
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('keydown', keydown);
    };
  }, []);

  const value = useMemo(
    () => ({ powered, powerOn, theme, setTheme, status }),
    [powered, powerOn, theme, setTheme, status],
  );
  return <ConsoleContext.Provider value={value}>{children}</ConsoleContext.Provider>;
}
