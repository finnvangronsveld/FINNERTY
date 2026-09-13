'use client';
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { AccountView, PublicConfig, StreamView, DemoPlayback } from '@/lib/contracts';
type Context = {
  config: PublicConfig;
  account: AccountView | null;
  stream: StreamView;
  setDemoStatus: (status: StreamView['status']) => void;
  demoPlayback: DemoPlayback;
  setDemoPlayback: (value: DemoPlayback) => void;
  refreshAccount: () => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  effects: boolean;
  toggleEffects: () => void;
  busy: boolean;
  notice: string;
  setNotice: (value: string) => void;
};
const SiteContext = createContext<Context | null>(null);
export function SiteProvider({ config, children }: { config: PublicConfig; children: ReactNode }) {
  const [account, setAccount] = useState<AccountView | null>(null);
  const [stream, setStream] = useState<StreamView>({
    status: config.demo ? 'offline' : 'unknown',
    source: config.demo ? 'demo' : 'unconfigured',
    title: null,
    category: null,
    checkedAt: null,
  });
  const [demoPlayback, setDemoPlayback] = useState<DemoPlayback>('ready');
  const [effects, setEffects] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const refreshAccount = useCallback(async () => {
    try {
      const response = await fetch('/api/account', { cache: 'no-store' });
      const data = await response.json();
      setAccount(response.ok ? data.account : null);
    } catch {
      setNotice('Je account kon niet worden opgehaald. Probeer het opnieuw.');
    }
  }, []);
  useEffect(() => {
    const initialize = requestAnimationFrame(() => {
      void refreshAccount();
      setEffects(localStorage.getItem('finnerty-effects') !== 'reduced');
    });
    if (config.demo) return () => cancelAnimationFrame(initialize);
    let active = true;
    const update = async () => {
      try {
        const response = await fetch('/api/stream');
        if (response.ok && active) {
          const next: StreamView = await response.json();
          setStream((previous) =>
            next.status === 'unknown' && previous.status === 'live'
              ? { ...previous, stale: true }
              : next,
          );
        }
      } catch {
        if (active) setStream((previous) => ({ ...previous, stale: true }));
      }
    };
    void update();
    const interval = setInterval(update, 60_000);
    return () => {
      active = false;
      cancelAnimationFrame(initialize);
      clearInterval(interval);
    };
  }, [config.demo, refreshAccount]);
  async function login() {
    setBusy(true);
    setNotice('');
    try {
      const response = await fetch(config.demo ? '/api/auth/demo' : '/api/auth/login', {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) {
        setNotice(data.error || 'Inloggen is tijdelijk niet beschikbaar.');
        return;
      }
      if (config.demo) await refreshAccount();
      else if (typeof data.url === 'string' && new URL(data.url).origin === 'https://id.twitch.tv')
        window.location.assign(data.url);
    } catch {
      setNotice('Inloggen lukte niet. Probeer het opnieuw.');
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error();
      setAccount(null);
    } catch {
      setNotice('Uitloggen lukte niet. Probeer het opnieuw.');
    } finally {
      setBusy(false);
    }
  }
  function toggleEffects() {
    setEffects((value) => {
      localStorage.setItem('finnerty-effects', value ? 'reduced' : 'full');
      return !value;
    });
  }
  return (
    <SiteContext.Provider
      value={{
        config,
        account,
        stream,
        setDemoStatus: (status) => {
          if (config.demo)
            setStream({
              status,
              source: 'demo',
              title: status === 'live' ? 'Frost Orbit · lokale playerdemo' : null,
              category: 'Demo',
              checkedAt: new Date().toISOString(),
            });
        },
        demoPlayback,
        setDemoPlayback,
        refreshAccount,
        login,
        logout,
        effects,
        toggleEffects,
        busy,
        notice,
        setNotice,
      }}
    >
      <div data-effects={effects ? 'full' : 'reduced'}>{children}</div>
    </SiteContext.Provider>
  );
}
export function useSite() {
  const context = useContext(SiteContext);
  if (!context) throw new Error('SiteProvider missing');
  return context;
}
