'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, ChevronDown, Sparkles, Radio as Twitch, X } from 'lucide-react';
import { copy } from '@/lib/copy';
import { useSite } from './site-provider';
import { PersistentPlayer } from './stream-player';
import type { ReactNode } from 'react';
export function LoginButton({ label }: { label?: string }) {
  const { login, busy, config } = useSite();
  return (
    <button className="button login-button" onClick={() => void login()} disabled={busy}>
      <Twitch size={16} />
      {busy ? 'Even verbinden…' : label || (config.demo ? 'Demo-account' : 'Login met Twitch')}
    </button>
  );
}
export function StreamStatus() {
  const { stream } = useSite();
  return (
    <span className={`stream-status ${stream.status} ${stream.stale ? 'stale' : ''}`}>
      <span className="status-dot" />
      {stream.status === 'live'
        ? stream.source === 'demo'
          ? 'DEMO LIVE'
          : 'LIVE NOW'
        : stream.status === 'offline'
          ? stream.source === 'demo'
            ? 'DEMO OFFLINE'
            : 'OFFLINE'
          : 'STATUS ONBEKEND'}
      {stream.stale && ' · VERTRAAGD'}
    </span>
  );
}
export function AccountAvatar({ large = false }: { large?: boolean }) {
  const { account } = useSite();
  return (
    <span className={large ? 'large-avatar' : 'avatar'}>
      {account?.avatarUrl ? (
        <Image
          src={account.avatarUrl}
          alt=""
          width={large ? 65 : 30}
          height={large ? 65 : 30}
          unoptimized
          referrerPolicy="no-referrer"
        />
      ) : (
        account?.displayName.charAt(0).toUpperCase() || 'F'
      )}
    </span>
  );
}
export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const {
    account,
    config,
    effects,
    toggleEffects,
    notice,
    setNotice,
    stream,
    setDemoStatus,
    demoPlayback,
    setDemoPlayback,
  } = useSite();
  return (
    <>
      <a href="#main" className="skip-link">
        Naar de inhoud
      </a>
      <header className="site-header">
        <Link href="/" className="wordmark" aria-label="Finnerty home">
          <span className="brand-mark">F</span>FINNERTY
        </Link>
        <nav aria-label="Hoofdnavigatie">
          {copy.navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="header-account">
          <StreamStatus />
          {account ? (
            <Link className="account-link" href="/account">
              <AccountAvatar />
              <span>
                {account.balance} <small>{config.pointsSymbol}</small>
              </span>
              <ChevronDown size={14} />
            </Link>
          ) : (
            <LoginButton />
          )}
        </div>
      </header>
      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} aria-label="Melding sluiten">
            <X size={18} />
          </button>
        </div>
      )}
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <PersistentPlayer />
      <footer className="site-footer">
        <Link className="footer-brand" href="/">
          FINNERTY
        </Link>
        <span className="footer-line" />
        <span className="footer-tagline">STREAM. CONNECT. BELONG.</span>
        <div className="footer-links">
          <Link href="/privacy">Privacy</Link>
          <Link href="/account">Mijn account</Link>
          <button className="effects-toggle" onClick={toggleEffects} aria-pressed={!effects}>
            <Sparkles size={13} />
            {effects ? 'Effecten beperken' : 'Effecten beperkt'}
          </button>
        </div>
      </footer>
      {config.demo && (
        <details className="demo-tools">
          <summary>
            <span className="demo-badge">DEMO</span> Lokale preview <ChevronDown size={13} />
          </summary>
          <div>
            <p>{copy.demo}</p>
            <label>
              Streamstatus
              <select
                aria-label="Demo streamstatus"
                value={stream.status}
                onChange={(event) => setDemoStatus(event.target.value as typeof stream.status)}
              >
                <option value="offline">Offline</option>
                <option value="live">Live</option>
                <option value="unknown">Onbekend / netwerkfout</option>
              </select>
            </label>
            <label>
              Playerstatus
              <select
                aria-label="Demo playerstatus"
                value={demoPlayback}
                onChange={(event) => setDemoPlayback(event.target.value as typeof demoPlayback)}
              >
                <option value="ready">Afspelen</option>
                <option value="blocked">Autoplay geblokkeerd</option>
                <option value="unavailable">Niet beschikbaar</option>
              </select>
            </label>
            <Link href="/account">
              Bekijk je demo-account <ArrowUpRight size={14} />
            </Link>
          </div>
        </details>
      )}
    </>
  );
}
