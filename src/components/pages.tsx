'use client';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CircleHelp,
  Clock3,
  Fingerprint,
  LockKeyhole,
  MessageCircle,
  Orbit,
  Play,
  ShieldCheck,
  Radio as Twitch,
} from 'lucide-react';
import { copy } from '@/lib/copy';
import { OrbitArt } from './orbit-art';
import { useSite } from './site-provider';
import { LoginButton, StreamStatus } from './site-shell';
import { PlayerAnchor } from './stream-player';
export function HomePage() {
  const { stream } = useSite();
  return (
    <div className="home-page">
      <section className="hero">
        <OrbitArt />
        <div className="hero-content">
          <p className="eyebrow">
            <span /> {copy.hero.eyebrow}
          </p>
          <h1>
            {copy.hero.line1}
            <br />
            <span>{copy.hero.line2}</span>
          </h1>
          <p className="hero-description">{copy.hero.description}</p>
          <div className="hero-actions">
            <Link className="button primary" href="/stream">
              <Play size={16} fill="currentColor" />
              {copy.hero.action}
              <ArrowUpRight size={16} />
            </Link>
            <Link className="button ghost" href="/vault">
              Explore The Vault <ArrowRight size={17} />
            </Link>
          </div>
          <div className="hero-status">
            <StreamStatus />
            <span>
              {stream.status === 'offline'
                ? 'Even offline. Altijd jouw universe.'
                : stream.status === 'live'
                  ? 'Schuif aan bij de crew.'
                  : 'De livestatus is nog niet beschikbaar.'}
            </span>
          </div>
        </div>
        <div className="hero-coordinate" aria-hidden="true">
          F / 01 <span>THE ORBIT IS YOURS</span>
        </div>
      </section>
      {stream.status === 'live' && (
        <section className="home-stream content-width">
          <div className="section-caption">
            <p className="eyebrow">LIVE FROM THE FINNERTYVERSE</p>
            <Link href="/stream">
              Naar de stream <ArrowUpRight size={16} />
            </Link>
          </div>
          <PlayerAnchor />
        </section>
      )}
      <div className="section-divider content-width">
        <span>EXPLORE YOUR UNIVERSE</span>
        <div />
        <ArrowDown size={15} />
      </div>
      <section className="feature-grid content-width" aria-label="Ontdek Finnertyverse">
        <article className="feature-card vault-card">
          <div className="card-top">
            <span className="eyebrow">01 / THE VAULT</span>
            <span className="construction-badge">
              <LockKeyhole size={11} /> UNDER CONSTRUCTION
            </span>
          </div>
          <h2>
            Something new.
            <br />
            <span>In our orbit.</span>
          </h2>
          <p>{copy.vault.description}</p>
          <div className="vault-emblem" aria-hidden="true">
            <div className="orbit-ring ring-one" />
            <div className="orbit-ring ring-two" />
            <div className="chrome-f">F</div>
            <span className="emblem-spark" />
          </div>
          <Link href="/vault" className="button outline">
            Ontdek The Vault <ArrowUpRight size={16} />
          </Link>
        </article>
        <article className="feature-card crew-card">
          <div className="card-top">
            <span className="eyebrow">02 / THE CREW</span>
            <Orbit size={19} />
          </div>
          <h2>
            Same chaos.
            <br />
            <span>Your people.</span>
          </h2>
          <p>Jouw mensen. Ook buiten de stream.</p>
          <div className="crew-emblem" aria-hidden="true">
            <MessageCircle />
            <span />
            <span />
          </div>
          <Link href="/community" className="button outline">
            Join the crew <ArrowUpRight size={16} />
          </Link>
        </article>
      </section>
      <section className="crew-strip content-width">
        <div>
          <span className="eyebrow">EEN PLEK VOOR DE CREW</span>
          <h2>Kijk mee. Blijf verbonden.</h2>
        </div>
        <p>
          Je eigen profiel, je geregistreerde kijktijd en je eigen Vault Points. Alles op één plek.
        </p>
        <Link href="/account" aria-label="Bekijk je account">
          <ArrowUpRight size={26} />
        </Link>
      </section>
    </div>
  );
}
export function VaultPage() {
  return (
    <section className="vault-page">
      <OrbitArt />
      <div className="vault-copy">
        <Link href="/" className="breadcrumb">
          FINNERTYVERSE <span>/</span> THE VAULT
        </Link>
        <span className="construction-badge">
          <LockKeyhole size={12} /> {copy.vault.status}
        </span>
        <p className="eyebrow">SOMETHING IS TAKING SHAPE</p>
        <h1>
          THE
          <br />
          <span>VAULT.</span>
        </h1>
        <p className="vault-description">{copy.vault.description}</p>
        <div className="hero-actions">
          <Link href="/stream" className="button primary">
            <Play size={16} />
            Kijk de stream
          </Link>
          <Link href="/" className="button ghost">
            Terug naar Finnertyverse <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="vault-footnote">
          <LockKeyhole size={14} />
          <span>Voor nu nog gesloten. Blijf in onze orbit.</span>
        </div>
      </div>
      <span className="vault-side-label" aria-hidden="true">
        FINNERTY / THE NEXT CHAPTER
      </span>
    </section>
  );
}
export function StreamPage() {
  const { stream, account, config } = useSite();
  return (
    <section className="standard-page content-width">
      <div className="page-heading">
        <p className="eyebrow">THE SIGNAL / FINNERTY</p>
        <h1>
          Watch stream<span>.</span>
        </h1>
        <p>Schuif aan. Je bent bij de crew.</p>
      </div>
      <div className="stream-page-grid">
        <div>
          <div className="stream-title">
            <StreamStatus />
            <span>{stream.title || 'Welkom in de Finnertyverse'}</span>
          </div>
          {stream.status === 'live' ? (
            <PlayerAnchor />
          ) : (
            <div className="offline-stage glass">
              <OrbitArt />
              <div>
                <Orbit size={38} />
                <h2>
                  {stream.status === 'offline'
                    ? 'Even tussen twee streams.'
                    : 'We wachten op een signaal.'}
                </h2>
                <p>
                  {stream.status === 'offline'
                    ? 'Ontdek de universe terwijl de stream offline is.'
                    : 'De Twitch-koppeling is nog niet beschikbaar.'}
                </p>
                <Link href="/vault" className="button outline">
                  Explore The Vault <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          )}
          <div className="stream-account-bar">
            <div>
              <Clock3 size={18} />
              <span>
                Geregistreerde kijktijd
                <strong>
                  {account?.watchtimeSeconds
                    ? `${Math.floor(Number(account.watchtimeSeconds) / 60)} min`
                    : 'Log in om te bekijken'}
                </strong>
              </span>
            </div>
            <div>
              <Orbit size={18} />
              <span>
                {config.pointsName}
                <strong>
                  {account ? `${account.balance} ${config.pointsSymbol}` : 'Jouw eigen punten'}
                </strong>
              </span>
            </div>
            <Link href="/account">
              Mijn account <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
        <aside className="stream-aside glass">
          <Twitch size={27} />
          <h2>De crew kijkt mee.</h2>
          <p>De officiële Twitch-chat krijgt hier een plek zodra het kanaal is gekoppeld.</p>
          <p className="muted">
            Inloggen op deze site meldt je niet automatisch aan in de Twitch-chat.
          </p>
          {config.channelLogin && (
            <a
              className="button outline"
              href={`https://www.twitch.tv/${config.channelLogin}`}
              target="_blank"
              rel="noreferrer"
            >
              Open op Twitch <ArrowUpRight size={16} />
            </a>
          )}
        </aside>
      </div>
    </section>
  );
}
export function CommunityPage() {
  const { config } = useSite();
  return (
    <section className="standard-page content-width">
      <div className="page-heading">
        <p className="eyebrow">02 / THE CREW</p>
        <h1>
          Same chaos.
          <br />
          <span>Your people.</span>
        </h1>
        <p>{copy.community.description}</p>
      </div>
      <div className="community-panel glass">
        <div>
          <MessageCircle size={35} />
          <h2>De crew gaat door.</h2>
          <p>Praat verder, deel je momenten en blijf verbonden.</p>
          {config.discordUrl ? (
            <a className="button primary" href={config.discordUrl} target="_blank" rel="noreferrer">
              Join Discord <ArrowUpRight size={17} />
            </a>
          ) : (
            <p className="connection-note">De Discord-uitnodiging wordt nog toegevoegd.</p>
          )}
        </div>
        <div className="community-orbit" aria-hidden="true">
          <Orbit />
          <span>THE CREW</span>
        </div>
      </div>
      <section className="leaderboard-section">
        <p className="eyebrow">CREW LEADERBOARD</p>
        <h2>Een eigen plek in de universe.</h2>
        <p>
          Het leaderboard zal totaal verdiende Vault Points tonen van geregistreerde siteaccounts
          die hun profiel zichtbaar maken.
        </p>
        <div className="empty-state">
          <ShieldCheck size={24} />
          <p>
            Er is nog geen gepubliceerd leaderboard.
            <br />
            <span>De lokale demo bevat geen echte kijkersranglijst.</span>
          </p>
        </div>
        <Link href="/account" className="text-link">
          Beheer je profiel <ArrowRight size={15} />
        </Link>
      </section>
    </section>
  );
}
export function PrivacyPage() {
  return (
    <section className="standard-page content-width prose">
      <p className="eyebrow">JOUW ACCOUNT / JOUW GEGEVENS</p>
      <h1>
        Privacy<span>.</span>
      </h1>
      <p>
        Deze versie is een lokale ontwikkelpreview. Demoaccounts en gesimuleerde kijktijd staan
        uitsluitend in de lokale ontwikkeldatabase.
      </p>
      <h2>Wat de website zal bewaren</h2>
      <p>
        Je vaste Twitch-identiteit, profielnaam, sessie, geverifieerde kijktijdregistraties en het
        eigen puntenjournaal. StreamElements levert uitsluitend kijktijd; bestaande
        StreamElements-punten worden niet gebruikt.
      </p>
      <h2>Je profiel en verwijderen</h2>
      <p>
        Profielen zijn standaard niet opgenomen in een leaderboard. In je account kun je je voorkeur
        wijzigen en een lokale demo-aanvraag voor verwijdering registreren. Deze aanvraag wordt
        opgeslagen, maar verwijdert nog geen gegevens en verstuurt niets naar een externe partij.
      </p>
      <h2>Externe diensten</h2>
      <p>
        Een echte Twitch-embed maakt verbinding met Twitch. In deze demomodus is de player lokaal
        gesimuleerd en wordt geen Twitch-embed geladen.
      </p>
      <h2>Voor publicatie nog vast te leggen</h2>
      <p>
        Contactgegevens van de eigenaar, bewaartermijnen, afhandeling van verwijderingsverzoeken en
        eventuele anonimisering van noodzakelijke journaalgegevens. Dit is nog geen definitieve
        privacyverklaring.
      </p>
      <Link href="/account" className="button outline">
        Naar mijn account <ArrowUpRight size={16} />
      </Link>
    </section>
  );
}
export function AdminPage() {
  return (
    <section className="standard-page content-width">
      <div className="restricted-panel glass">
        <ShieldCheck size={35} />
        <p className="eyebrow">BEHEER / BESCHERMD</p>
        <h1>Alleen voor beheerders.</h1>
        <p>
          Beheer wordt gekoppeld aan expliciet toegestane, geverifieerde Twitch user ID’s. De lokale
          demo geeft geen beheertoegang.
        </p>
        <Link href="/" className="button outline">
          Terug naar home <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
export function AccountIntro() {
  const { config } = useSite();
  return (
    <div className="account-intro glass">
      <Fingerprint size={36} />
      <p className="eyebrow">JOUW PLEK IN DE CREW</p>
      <h2>
        One crew.
        <br />
        Your identity.
      </h2>
      <p>
        Bekijk je geregistreerde kijktijd en eigen punten. Je profiel blijft gekoppeld aan jouw
        vaste Twitch-identiteit.
      </p>
      <LoginButton />
      <div className="account-explainer">
        <CircleHelp size={16} />
        <span>
          {config.demo
            ? 'In deze preview maak je een geïsoleerd demoaccount met gesimuleerde gegevens.'
            : 'Je Twitch-identiteit wordt veilig gekoppeld. We vragen geen toegang tot je e-mailadres.'}
        </span>
      </div>
    </div>
  );
}
