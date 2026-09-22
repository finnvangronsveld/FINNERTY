'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Ban, Clock3, Gauge, HeartHandshake, ShieldCheck, Trophy } from 'lucide-react';
import {
  COIN_LABEL,
  GAME_DURATION_MS,
  GAME_IDS,
  GAME_INFO,
  formatVp,
  rouletteColor,
  type CoinSide,
  type GameId,
  type SlotSymbol,
} from '@/lib/vault';
import type { VaultRoundView } from '@/lib/contracts';
import { OrbitArt } from '../orbit-art';
import { useSite } from '../site-provider';
import { LoginButton } from '../site-shell';
import { CoinflipGame, DiceGame, RouletteGame, SlotsGame } from './games';
import { Leaderboard } from './leaderboard';
import { GameIcon, Net, SlotIcon, useAnimate, useCountUp } from './shared';

export function VaultPage() {
  const { account, config, setBalance, refreshAccount } = useSite();
  const animate = useAnimate();
  const [game, setGame] = useState<GameId>('coinflip');
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState('');
  const [rounds, setRounds] = useState<VaultRoundView[]>([]);
  const [boardKey, setBoardKey] = useState(0);
  const busy = useRef(false);
  const pending = useRef<{ timer: number; settle: () => void } | null>(null);
  const balance = account ? BigInt(account.balance) : null;
  const shown = useCountUp(balance ?? 0n, animate);
  const accountKey = account ? `${account.provider}:${account.login}` : null;

  useEffect(() => {
    if (!accountKey) return;
    const abort = new AbortController();
    fetch('/api/vault/rounds', { signal: abort.signal, cache: 'no-store' })
      .then(async (response) => {
        if (response.ok) setRounds((await response.json()).rounds);
      })
      .catch(() => undefined);
    return () => abort.abort();
  }, [accountKey]);
  // Leaving mid-round settles immediately so the balance never stays on the pre-payout value.
  useEffect(
    () => () => {
      if (!pending.current) return;
      clearTimeout(pending.current.timer);
      pending.current.settle();
    },
    [],
  );

  const play = useCallback(
    async (id: GameId, bet: Record<string, unknown>) => {
      if (busy.current) return null;
      busy.current = true;
      setPlaying(true);
      setError('');
      const release = (after = 0) =>
        window.setTimeout(() => {
          busy.current = false;
          setPlaying(false);
        }, after);
      try {
        const response = await fetch('/api/vault/play', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ game: id, bet, key: crypto.randomUUID() }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setError(data.error ?? 'Deze ronde kon niet worden gespeeld.');
          if (response.status === 401 || response.status === 409) void refreshAccount();
          release(Math.min(Number(data.retryAfterMs) || 0, 10_000));
          return null;
        }
        const round: VaultRoundView = data.round;
        // The stake leaves the wallet now; the payout lands when the animation ends.
        setBalance((BigInt(round.balanceAfter) - BigInt(round.payout)).toString());
        const settle = () => {
          pending.current = null;
          setBalance(round.balanceAfter);
          setRounds((current) =>
            [round, ...current.filter((item) => item.id !== round.id)].slice(0, 8),
          );
          setBoardKey((value) => value + 1);
          busy.current = false;
          setPlaying(false);
        };
        pending.current = { timer: window.setTimeout(settle, GAME_DURATION_MS[id]), settle };
        return round;
      } catch {
        setError('Geen verbinding met The Vault. Probeer het opnieuw.');
        release();
        return null;
      }
    },
    [refreshAccount, setBalance],
  );

  const props = {
    balance,
    playing,
    animate,
    symbol: config.pointsSymbol,
    play: (bet: Record<string, unknown>) => play(game, bet),
  };
  const visibleRounds = account ? rounds : [];
  return (
    <div className="vault-room">
      <section className="vault-hero content-width">
        <OrbitArt className="vault-hero-art" />
        <div className="vault-hero-copy">
          <Link href="/" className="breadcrumb">
            FINNERTYVERSE <span>/</span> THE VAULT
          </Link>
          <p className="eyebrow">THE VAULT / GAMEROOM</p>
          <h1>
            THE <span>VAULT.</span>
          </h1>
          <p>
            Speel met de {config.pointsName} die je verdient door mee te kijken. Geen echt geld,
            geen prijzen. Alleen eer en een plek op het leaderboard.
          </p>
        </div>
        <div className="vault-wallet glass" aria-live="polite">
          {account ? (
            <>
              <span>Jouw saldo</span>
              <strong>
                {formatVp(shown)} <small>{config.pointsSymbol}</small>
              </strong>
              <p>
                Verdiend met kijken: {formatVp(account.totalEarned)} {config.pointsSymbol}
              </p>
            </>
          ) : (
            <>
              <span>Klaar om te spelen?</span>
              <p>Log in met Twitch. Je punten komen van je kijktijd.</p>
              <LoginButton />
            </>
          )}
        </div>
      </section>

      <ul className="vault-pledges content-width" aria-label="Zo werkt The Vault">
        <li>
          <Clock3 size={15} /> Punten verdien je alleen door te kijken
        </li>
        <li>
          <Ban size={15} /> Niet te koop, niet in te wisselen, niet over te dragen
        </li>
        <li>
          <Trophy size={15} /> Winnen levert eer op, geen prijzen
        </li>
        <li>
          <Gauge size={15} /> Elke ronde neemt de tijd. Spammen versnelt niets
        </li>
      </ul>

      <div className="vault-layout content-width">
        <div className="vault-main">
          <div className="game-tabs" role="tablist" aria-label="Kies een spel">
            {GAME_IDS.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`tab-${id}`}
                aria-selected={game === id}
                aria-controls="game-stage"
                className={game === id ? 'active' : ''}
                disabled={playing && game !== id}
                onClick={() => {
                  setGame(id);
                  setError('');
                }}
              >
                <GameIcon game={id} size={19} />
                <span>{GAME_INFO[id].name}</span>
                <small>RTP {GAME_INFO[id].rtp}</small>
              </button>
            ))}
          </div>
          <div
            className="game-stage glass"
            id="game-stage"
            role="tabpanel"
            aria-labelledby={`tab-${game}`}
          >
            <header className="game-header">
              <div>
                <p className="eyebrow">{GAME_INFO[game].tagline.toUpperCase()}</p>
                <h2>{GAME_INFO[game].name}</h2>
              </div>
              <span className="rtp-badge">
                <ShieldCheck size={13} /> RTP {GAME_INFO[game].rtp}
              </span>
            </header>
            {game === 'coinflip' && <CoinflipGame {...props} />}
            {game === 'dice' && <DiceGame {...props} />}
            {game === 'slots' && <SlotsGame {...props} />}
            {game === 'roulette' && <RouletteGame {...props} recent={visibleRounds} />}
            {error && (
              <p className="vault-error" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>
        <aside className="vault-side">
          <Leaderboard refreshKey={boardKey} />
        </aside>
      </div>

      <div className="vault-lower content-width">
        <section className="recent-rounds">
          <div className="section-caption">
            <h2>Jouw laatste rondes</h2>
            <span>{config.demo ? 'DEMODATA' : 'THE VAULT'}</span>
          </div>
          {visibleRounds.length ? (
            <ul>
              {visibleRounds.map((round) => (
                <li key={round.id}>
                  <span className="ledger-icon">
                    <GameIcon game={round.game} size={16} />
                  </span>
                  <div>
                    <strong>{GAME_INFO[round.game as GameId]?.name ?? round.game}</strong>
                    <span>
                      <RoundDetail round={round} /> · inzet {formatVp(round.stake)}
                    </span>
                  </div>
                  <Net value={round.net} symbol={config.pointsSymbol} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounds-empty">
              {account
                ? 'Nog geen rondes gespeeld. Kies een spel en waag je kans.'
                : 'Log in om je rondes te zien.'}
            </p>
          )}
        </section>
        <section className="house-rules glass">
          <HeartHandshake size={22} />
          <h2>Huisregels</h2>
          <ul>
            <li>
              {config.pointsName} verdien je uitsluitend met geregistreerde kijktijd. Je kunt ze
              niet kopen, verkopen, overdragen, inwisselen of uitbetalen.
            </li>
            <li>Geen echt geld en geen prijzen. Het leaderboard is puur voor de eer.</li>
            <li>
              De server beslist elke ronde met een cryptografisch veilige toevalsgenerator. De
              animatie toont enkel wat al beslist is. Geen gemanipuleerde bijna-winst.
            </li>
            <li>
              Iedere ronde duurt even. Snel klikken, verversen of meerdere tabs versnellen niets.
              Minimaal 10, maximaal 5.000 {config.pointsSymbol} per ronde.
            </li>
            <li>Het leaderboard toont je alleen als je dat zelf aanzet.</li>
          </ul>
          <p className="rules-help">
            Echt gokken is iets anders. Vragen of zorgen over gokgedrag?{' '}
            <a href="https://www.druglijn.be" target="_blank" rel="noreferrer">
              DrugLijn
            </a>{' '}
            helpt anoniem.
          </p>
        </section>
      </div>
    </div>
  );
}

function RoundDetail({ round }: { round: VaultRoundView }) {
  const bet = round.bet;
  const outcome = round.outcome;
  switch (round.game) {
    case 'coinflip':
      return (
        <>
          {COIN_LABEL[bet.side as CoinSide]} gekozen, {COIN_LABEL[outcome.result as CoinSide]}{' '}
          gevallen
        </>
      );
    case 'dice': {
      const roll = ((outcome.roll as number) / 100).toLocaleString('nl-BE', {
        minimumFractionDigits: 2,
      });
      const chance = bet.chance as number;
      return (
        <>
          {bet.direction === 'under' ? `onder ${chance}` : `boven ${100 - chance}`} · rol {roll}
        </>
      );
    }
    case 'slots':
      return (
        <span className="mini-reels">
          {(outcome.reels as SlotSymbol[]).map((symbol, index) => (
            <span key={index} className={`symbol-${symbol}`}>
              <SlotIcon symbol={symbol} size={12} />
            </span>
          ))}
        </span>
      );
    case 'roulette': {
      const number = outcome.number as number;
      const color = rouletteColor(number);
      return (
        <>
          <span className={`mini-number ${color}`}>{number}</span> {(bet.bets as unknown[]).length}{' '}
          {(bet.bets as unknown[]).length === 1 ? 'vak' : 'vakken'}
        </>
      );
    }
    default:
      return null;
  }
}
