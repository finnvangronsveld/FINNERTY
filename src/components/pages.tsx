'use client';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Clock3,
  Coins,
  MessageCircle,
  Play,
  Radio,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { GAME_IDS, GAME_INFO } from '@/lib/vault';
import { useSite } from './site-provider';
import { LoginButton, StreamStatus } from './site-shell';
import { PlayerAnchor } from './stream-player';
import { Leaderboard } from './vault/leaderboard';
import { GameArt, VaultPoster } from './game-art';

export function HomePage() {
  const { stream, config } = useSite();
  return (
    <div className="home-page">
      <section className="hero content-width">
        <div className="hero-content">
          <p className="eyebrow">
            <span className="little-cross">✳</span> FINNERTY. AANGENAAM.
          </p>
          <h1>
            Hier blijf
            <br />
            je hangen<span className="accent-dot">.</span>
          </h1>
          <p className="hero-description">
            Voor de stream. Voor een potje. Of gewoon voor de gezelligheid. Schuif aan.
          </p>
          <div className="hero-actions">
            <Link className="button primary" href="/stream">
              <Play size={17} fill="currentColor" />
              {stream.status === 'live' ? 'Kijk live mee' : 'Naar de stream'}
              <ArrowUpRight size={18} />
            </Link>
            <Link className="text-link" href="/community">
              Ontmoet de crew <ArrowRight size={17} />
            </Link>
          </div>
          <div className="hero-status">
            <StreamStatus />
            <span>
              {stream.status === 'live'
                ? 'Pak een stoel. We zijn begonnen.'
                : stream.status === 'offline'
                  ? 'Even offline. De crew blijft hangen.'
                  : 'Je vindt Finnerty ook op Twitch.'}
            </span>
          </div>
        </div>
        <Link href="/vault" className="vault-poster" aria-label="Open The Vault">
          <div className="poster-top">
            <span>DE GAMEROOM</span>
            <span>01 — 04</span>
          </div>
          <h2>
            THE VAULT<span>✳</span>
          </h2>
          <VaultPoster />
          <div className="poster-bottom">
            <span>
              Jouw punten. Jouw potje.<small>Vier spellen. Geen echt geld.</small>
            </span>
            <span className="round-arrow">
              <ArrowUpRight size={24} />
            </span>
          </div>
        </Link>
      </section>
      {stream.status === 'live' && (
        <section className="home-stream content-width">
          <div className="section-caption">
            <h2>We zijn live.</h2>
            <Link className="text-link" href="/stream">
              Open de stream <ArrowUpRight size={18} />
            </Link>
          </div>
          <PlayerAnchor />
        </section>
      )}
      <section className="games-section content-width" aria-labelledby="home-games-title">
        <div className="section-caption">
          <div>
            <p className="eyebrow">THE VAULT</p>
            <h2 id="home-games-title">Wat spelen we?</h2>
          </div>
          <Link className="text-link" href="/vault">
            Alle spellen <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="game-shelf">
          {GAME_IDS.map((game, index) => (
            <Link href={`/vault?game=${game}`} className={`game-tile tile-${game}`} key={game}>
              <span className="tile-number">0{index + 1}</span>
              <GameArt game={game} />
              <span className="tile-title">
                {GAME_INFO[game].name}
                <ArrowUpRight size={20} />
              </span>
            </Link>
          ))}
        </div>
        <p className="games-note">
          <Coins size={15} /> Je speelt met {config.pointsName} uit je kijktijd. Gratis punten, geen
          geld of prijzen.
        </p>
      </section>
      <section className="crew-invite content-width">
        <div>
          <p className="eyebrow">OOK NA DE STREAM</p>
          <h2>
            De chat gaat
            <br />
            gewoon door<span>.</span>
          </h2>
        </div>
        <div className="crew-invite-copy">
          <p>
            Deel je beste moment, praat nog even na of kom gewoon lurken. Je vindt de crew op
            Discord.
          </p>
          <Link href="/community" className="button light">
            Bij de crew <ArrowUpRight size={18} />
          </Link>
        </div>
        <span className="crew-asterisk" aria-hidden="true">
          ✳
        </span>
      </section>
      <section className="account-strip content-width">
        <UserRound size={22} />
        <div>
          <h2>Jouw plek aan tafel.</h2>
          <p>Je kijktijd, Vault Points en laatste rondes op één plek.</p>
        </div>
        <Link className="text-link" href="/account">
          Mijn account <ArrowUpRight size={18} />
        </Link>
      </section>
    </div>
  );
}

export function StreamPage() {
  const { stream, account, config } = useSite();
  return (
    <section className="standard-page content-width stream-page">
      <div className="page-heading">
        <p className="eyebrow">FINNERTY OP TWITCH</p>
        <h1>
          Schuif aan<span>.</span>
        </h1>
        <p>De stream aan. De rest komt wel.</p>
      </div>
      <div className="stream-page-grid">
        <div>
          <div className="stream-title">
            <StreamStatus />
            <span>{stream.title || 'Finnerty op Twitch'}</span>
          </div>
          {stream.status === 'live' ? (
            <PlayerAnchor />
          ) : (
            <div className="offline-stage glass">
              <span className="broadcast-mark" aria-hidden="true">
                <Radio size={42} />
              </span>
              <p className="eyebrow">
                {stream.status === 'offline' ? 'EVEN PAUZE' : 'NOG GEEN SIGNAAL'}
              </p>
              <h2>
                {stream.status === 'offline' ? 'We zijn er even niet.' : 'Is Finnerty al live?'}
              </h2>
              <p>
                {stream.status === 'offline'
                  ? 'Volg het kanaal op Twitch, dan weet je wanneer de volgende stream begint.'
                  : 'We kunnen de status nu niet ophalen. Je kunt het kanaal rechtstreeks op Twitch bekijken.'}
              </p>
              {config.channelLogin ? (
                <a
                  className="button primary"
                  href={`https://www.twitch.tv/${config.channelLogin}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Bekijk op Twitch <ArrowUpRight size={18} />
                </a>
              ) : (
                <Link href="/vault" className="button primary">
                  Ondertussen een potje? <ArrowRight size={18} />
                </Link>
              )}
              <span className="offline-wordmark" aria-hidden="true">
                finnerty.
              </span>
            </div>
          )}
          <div className="stream-account-bar">
            <div>
              <Clock3 size={20} />
              <span>
                Kijktijd
                <strong>
                  {account?.watchtimeSeconds
                    ? `${Math.floor(Number(account.watchtimeSeconds) / 60)} min`
                    : 'Log in om te bekijken'}
                </strong>
              </span>
            </div>
            <div>
              <Coins size={20} />
              <span>
                {config.pointsName}
                <strong>
                  {account
                    ? `${account.balance} ${config.pointsSymbol}`
                    : 'Kijken levert punten op'}
                </strong>
              </span>
            </div>
            <Link className="text-link" href="/account">
              Mijn account <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
        <aside className="stream-aside glass">
          <MessageCircle size={26} />
          <p className="eyebrow">IN DE CHAT</p>
          <h2>Zeg eens hallo.</h2>
          <p>De Twitch-chat vind je bij het kanaal. Kijk mee, praat mee of lurk lekker verder.</p>
          {config.channelLogin && (
            <a
              className="button outline"
              href={`https://www.twitch.tv/${config.channelLogin}`}
              target="_blank"
              rel="noreferrer"
            >
              Open op Twitch <ArrowUpRight size={17} />
            </a>
          )}
          <div className="aside-divider" />
          <p className="eyebrow">NA DE STREAM</p>
          <p>De gesprekken gaan door bij de crew.</p>
          <Link className="text-link" href="/community">
            Naar de community <ArrowRight size={17} />
          </Link>
        </aside>
      </div>
    </section>
  );
}

export function CommunityPage() {
  const { config } = useSite();
  return (
    <section className="standard-page content-width community-page">
      <div className="page-heading">
        <p className="eyebrow">DE MENSEN ACHTER DE CHAT</p>
        <h1>
          Goed volk<span>.</span>
        </h1>
        <p>Nieuw gezicht of vaste lurker. Je hoort erbij.</p>
      </div>
      <div className="community-panel">
        <div>
          <p className="eyebrow">DE FINNERTY DISCORD</p>
          <h2>
            Zelfde crew.
            <br />
            Ander tabblad.
          </h2>
          <p>
            Praat na over de stream, deel je clips en blijf hangen. Ook als de camera uit staat.
          </p>
          {config.discordUrl ? (
            <a className="button dark" href={config.discordUrl} target="_blank" rel="noreferrer">
              Open Discord <ArrowUpRight size={18} />
            </a>
          ) : (
            <p className="connection-note">De Discord-uitnodiging komt eraan.</p>
          )}
        </div>
        <div className="community-print" aria-hidden="true">
          <span>JE BENT</span>
          <b>ERBIJ.</b>
          <span>✳ FINNERTY & FRIENDS ✳</span>
        </div>
      </div>
      <section className="community-ranking">
        <div className="ranking-intro">
          <p className="eyebrow">VOOR DE EER</p>
          <h2>
            Wie staat
            <br />
            er bovenaan?
          </h2>
          <p>De punten komen van meekijken en spelen. De opscheprechten zijn helemaal van jou.</p>
          <Link href="/vault" className="text-link">
            Speel in The Vault <ArrowRight size={18} />
          </Link>
          <p className="small-note">
            Liever uit de ranglijst? Je zet je zichtbaarheid uit in je account.
          </p>
        </div>
        <Leaderboard limit={25} />
      </section>
    </section>
  );
}

export function PrivacyPage() {
  const { config } = useSite();
  return (
    <section className="standard-page content-width prose">
      <p className="eyebrow">JE GEGEVENS</p>
      <h1>
        Privacy<span>.</span>
      </h1>
      <p className="prose-intro">Wat we bewaren, waarom en wat je zelf kunt instellen.</p>
      <h2>Je account</h2>
      <p>
        We bewaren je Twitch-identiteit, profielnaam, sessie, geverifieerde kijktijdregistraties en
        je puntenjournaal. StreamElements levert uitsluitend kijktijd; bestaande
        StreamElements-punten worden niet gebruikt.
      </p>
      <h2>Je zichtbaarheid</h2>
      <p>
        Je Twitch-weergavenaam, avatar en puntenstand staan standaard in de leaderboards. In je
        account kun je dat uitzetten. Daar kun je ook een verwijderingsverzoek registreren. Dat
        verzoek wordt opgeslagen voor de beheerder en verwijdert niet direct je gegevens.
      </p>
      <h2>Externe diensten</h2>
      <p>
        {config.demo
          ? 'Je bekijkt de lokale demo. Accounts, kijktijd en de videoplayer zijn gesimuleerd; er wordt geen Twitch-embed geladen.'
          : 'De Twitch-player maakt verbinding met Twitch. Inloggen op deze website en inloggen in de Twitch-chat zijn aparte sessies.'}
      </p>
      <h2>Status van deze verklaring</h2>
      <p>
        Dit is een concept. Contactgegevens van de eigenaar, bewaartermijnen en de verdere
        afhandeling van verwijderingsverzoeken moeten nog worden vastgelegd.
      </p>
      <Link href="/account" className="button outline">
        Naar mijn account <ArrowUpRight size={18} />
      </Link>
    </section>
  );
}

export function AdminPage() {
  return (
    <section className="standard-page content-width">
      <div className="restricted-panel glass">
        <ShieldCheck size={32} />
        <p className="eyebrow">ALLEEN VOOR BEHEERDERS</p>
        <h1>
          Achter de schermen<span>.</span>
        </h1>
        <p>
          Deze plek is alleen toegankelijk voor geverifieerde beheerders. De lokale demo geeft geen
          beheertoegang.
        </p>
        <Link href="/" className="button primary">
          Terug naar home <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
}

export function AccountIntro() {
  const { config } = useSite();
  return (
    <div className="account-intro glass">
      <div className="account-intro-copy">
        <UserRound size={32} />
        <h2>
          Een vaste plek
          <br />
          voor jou.
        </h2>
        <p>Log in met Twitch en houd je kijktijd, punten en gespeelde rondes bij.</p>
        <LoginButton />
        <p className="account-explainer">
          {config.demo
            ? 'In deze preview gebruik je een demoaccount met gesimuleerde gegevens.'
            : 'Je gebruikt je bestaande Twitch-account. We vragen geen toegang tot je e-mailadres.'}
        </p>
      </div>
      <div className="member-card" aria-hidden="true">
        <span>FINNERTY CREW</span>
        <b>
          Jij bent
          <br />
          erbij.
        </b>
        <span className="member-card-bottom">
          MEMBER ACCESS <span>✳</span>
        </span>
      </div>
    </div>
  );
}
