'use client';
import { useRef, useState, type CSSProperties } from 'react';
import { Asterisk, RotateCcw, Trash2 } from 'lucide-react';
import {
  COIN_LABEL,
  COINFLIP_MULTIPLIER_BP,
  DICE_CHANCE,
  GAME_DURATION_MS,
  ROULETTE_PAYOUT_BP,
  ROULETTE_WHEEL,
  SLOT_PAIR_BP,
  SLOT_SINGLE_F_BP,
  SLOT_SYMBOLS,
  SLOT_THREE_BP,
  SLOT_WEIGHT_TOTAL,
  VAULT_LIMITS,
  diceMultiplierBp,
  formatVp,
  payoutFor,
  rouletteColor,
  slotSymbolAt,
  type CoinSide,
  type DiceDirection,
  type RouletteBetType,
  type SlotLine,
  type SlotSymbol,
} from '@/lib/vault';
import type { VaultRoundView } from '@/lib/contracts';
import {
  Net,
  PlayButton,
  SlotIcon,
  StakeInput,
  parseStake,
  stakeProblem,
  useLater,
  type GameProps,
} from './shared';

const multiplier = (bp: number) =>
  `${(bp / 10_000).toLocaleString('nl-BE', { maximumFractionDigits: 4 })}×`;

function Result({
  round,
  revealed,
  playing,
  waiting,
  idle,
  symbol,
  children,
}: {
  round: VaultRoundView | null;
  revealed: boolean;
  playing: boolean;
  waiting: string;
  idle: string;
  symbol: string;
  children?: React.ReactNode;
}) {
  if (playing && !revealed)
    return (
      <p className="game-result pending" aria-live="polite">
        {waiting}
      </p>
    );
  if (!round || !revealed)
    return (
      <p className="game-result" aria-live="polite">
        {idle}
      </p>
    );
  const net = BigInt(round.net);
  return (
    <p
      className={`game-result ${net > 0n ? 'win' : net < 0n ? 'loss' : 'push'}`}
      aria-live="polite"
    >
      <span>
        {children}
        {net > 0n ? 'Gewonnen!' : net < 0n ? 'Helaas.' : 'Inzet terug.'}
      </span>
      <Net value={round.net} symbol={symbol} />
    </p>
  );
}

/* ------------------------------------------------------------------ Coinflip */

export function CoinflipGame({ balance, playing, animate, symbol, play }: GameProps) {
  const later = useLater();
  const [stake, setStake] = useState('10');
  const [side, setSide] = useState<CoinSide>('heads');
  const [rotation, setRotation] = useState(0);
  const [toss, setToss] = useState(0);
  const [round, setRound] = useState<VaultRoundView | null>(null);
  const [revealed, setRevealed] = useState(true);
  const parsed = parseStake(stake);
  const problem = stakeProblem(parsed, balance);
  const duration = GAME_DURATION_MS.coinflip;

  async function flip() {
    setRevealed(false);
    const result = await play({ stake, side });
    if (!result) return setRevealed(true);
    const landed = (result.outcome as { result: CoinSide }).result;
    const target = (current: number) =>
      current - (current % 360) + 360 * 9 + (landed === 'tails' ? 180 : 0);
    setRound(result);
    if (animate) {
      setToss((value) => value + 1);
      setRotation(target);
    }
    later(() => {
      if (!animate) setRotation(target);
      setRevealed(true);
    }, duration);
  }

  const won = revealed && round && BigInt(round.net) > 0n;
  return (
    <div className="game coinflip">
      <div
        className={`coin-stage${won ? ' celebrate' : ''}`}
        style={{ '--spin': `${duration - 250}ms` } as CSSProperties}
      >
        <div key={toss} className={`coin-toss${toss ? ' tossing' : ''}`}>
          <div className="coin" style={{ transform: `rotateY(${rotation}deg)` }}>
            <div className="coin-face heads">
              <span>F</span>
            </div>
            <div className="coin-face tails">
              <Asterisk size={64} strokeWidth={2} />
            </div>
          </div>
        </div>
        <div key={`shadow-${toss}`} className={`coin-shadow${toss ? ' tossing' : ''}`} />
      </div>
      <Result
        round={round}
        revealed={revealed}
        playing={playing}
        waiting="De munt is in de lucht…"
        idle="Kies kop of munt en gooi."
        symbol={symbol}
      >
        {round && `${COIN_LABEL[(round.outcome as { result: CoinSide }).result]}. `}
      </Result>
      <div className="game-controls">
        <div className="choice-group" role="radiogroup" aria-label="Kies een kant">
          {(['heads', 'tails'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={side === value}
              className={side === value ? 'active' : ''}
              disabled={playing}
              onClick={() => setSide(value)}
            >
              {value === 'heads' ? <span className="mini-f">F</span> : <Asterisk size={16} />}
              {COIN_LABEL[value]}
            </button>
          ))}
        </div>
        <StakeInput
          value={stake}
          onChange={setStake}
          balance={balance}
          disabled={playing}
          symbol={symbol}
        />
        <div className="game-odds">
          <span>
            Multiplier <strong>{multiplier(COINFLIP_MULTIPLIER_BP)}</strong>
          </span>
          <span>
            Uitbetaling bij winst{' '}
            <strong>
              {parsed ? formatVp(payoutFor(parsed, COINFLIP_MULTIPLIER_BP)) : '—'} {symbol}
            </strong>
          </span>
        </div>
        <PlayButton
          game="coinflip"
          playing={playing}
          disabled={!!problem}
          label="Gooi de munt"
          busyLabel="Munt draait…"
          onClick={() => void flip()}
        />
        {problem && balance !== null && <p className="stake-problem">{problem}</p>}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- Dice */

const rollLabel = (roll: number) =>
  (roll / 100).toLocaleString('nl-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function DiceGame({ balance, playing, animate, symbol, play }: GameProps) {
  const later = useLater();
  const [stake, setStake] = useState('10');
  const [chance, setChance] = useState(50);
  const [direction, setDirection] = useState<DiceDirection>('under');
  const [display, setDisplay] = useState<number | null>(null);
  const [marker, setMarker] = useState(5000);
  const [round, setRound] = useState<VaultRoundView | null>(null);
  const [revealed, setRevealed] = useState(true);
  const frame = useRef(0);
  const parsed = parseStake(stake);
  const problem = stakeProblem(parsed, balance);
  const bp = diceMultiplierBp(chance);
  const duration = GAME_DURATION_MS.dice;
  const threshold = direction === 'under' ? chance : 100 - chance;

  async function roll() {
    setRevealed(false);
    const result = await play({ stake, chance, direction });
    if (!result) return setRevealed(true);
    const value = (result.outcome as { roll: number }).roll;
    setRound(result);
    if (animate) {
      setMarker(value);
      // Scramble the readout, slowing down until it locks onto the real roll.
      const start = performance.now();
      let last = 0;
      cancelAnimationFrame(frame.current);
      const tick = (now: number) => {
        const t = (now - start) / (duration - 250);
        if (t >= 1) return setDisplay(value);
        if (now - last > 35 + 320 * t * t) {
          last = now;
          setDisplay(Math.floor(Math.random() * 10_000));
        }
        frame.current = requestAnimationFrame(tick);
      };
      frame.current = requestAnimationFrame(tick);
    }
    later(() => {
      cancelAnimationFrame(frame.current);
      setMarker(value);
      setDisplay(value);
      setRevealed(true);
    }, duration);
  }

  const outcomeClass =
    revealed && round ? ((round.outcome as { win: boolean }).win ? ' win' : ' loss') : '';
  return (
    <div className="game dice">
      <div className={`dice-readout${outcomeClass}${playing && !revealed ? ' rolling' : ''}`}>
        <span>{display === null ? '00,00' : rollLabel(display)}</span>
      </div>
      <div
        className="dice-track"
        style={
          {
            '--zone-start': direction === 'under' ? '0%' : `${100 - chance}%`,
            '--zone-width': `${chance}%`,
            '--spin': `${duration - 250}ms`,
          } as CSSProperties
        }
      >
        <div className="dice-zone" />
        <div
          className={`dice-marker${outcomeClass}`}
          style={{ left: `${marker / 100}%` }}
          aria-hidden="true"
        />
        <div className="dice-scale" aria-hidden="true">
          <span>0</span>
          <span>25</span>
          <span>50</span>
          <span>75</span>
          <span>100</span>
        </div>
      </div>
      <Result
        round={round}
        revealed={revealed}
        playing={playing}
        waiting="De dobbelsteen rolt…"
        idle={`Win als de rol ${direction === 'under' ? 'lager dan' : 'minstens'} ${threshold},00 is.`}
        symbol={symbol}
      >
        {round && `Rol ${rollLabel((round.outcome as { roll: number }).roll)}. `}
      </Result>
      <div className="game-controls">
        <div className="choice-group" role="radiogroup" aria-label="Richting">
          {(['under', 'over'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={direction === value}
              className={direction === value ? 'active' : ''}
              disabled={playing}
              onClick={() => setDirection(value)}
            >
              {value === 'under' ? `Onder ${chance},00` : `Boven ${100 - chance},00`}
            </button>
          ))}
        </div>
        <label className="chance-slider">
          <span>
            Winkans <strong>{chance}%</strong>
          </span>
          <input
            type="range"
            min={DICE_CHANCE.min}
            max={DICE_CHANCE.max}
            value={chance}
            disabled={playing}
            onChange={(event) => setChance(Number(event.target.value))}
          />
        </label>
        <StakeInput
          value={stake}
          onChange={setStake}
          balance={balance}
          disabled={playing}
          symbol={symbol}
        />
        <div className="game-odds">
          <span>
            Multiplier <strong>{multiplier(bp)}</strong>
          </span>
          <span>
            Uitbetaling bij winst{' '}
            <strong>
              {parsed ? formatVp(payoutFor(parsed, bp)) : '—'} {symbol}
            </strong>
          </span>
        </div>
        <PlayButton
          game="dice"
          playing={playing}
          disabled={!!problem}
          label="Rol de dobbelsteen"
          busyLabel="Rollen…"
          onClick={() => void roll()}
        />
        {problem && balance !== null && <p className="stake-problem">{problem}</p>}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- Slots */

/** Cosmetic filler for the spinning strips, drawn with the real reel weights (no staged near-misses). */
const fillerSymbol = () => slotSymbolAt(Math.floor(Math.random() * SLOT_WEIGHT_TOTAL));
const REEL_STOPS = [1500, 2250, 3050];
interface Reel {
  strip: SlotSymbol[];
  offset: number;
  spinning: boolean;
}
const initialReels: Reel[] = [
  ['star', 'f', 'moon'],
  ['gem', 'f', 'rocket'],
  ['moon', 'f', 'orbit'],
].map((strip) => ({ strip: strip as SlotSymbol[], offset: 0, spinning: false }));

function winningReels(reels: SlotSymbol[], line: SlotLine) {
  if (line === 'three') return [0, 1, 2];
  if (line === 'pair') return [0, 1];
  if (line === 'single_f') return reels.flatMap((symbol, index) => (symbol === 'f' ? [index] : []));
  return [];
}

export function SlotsGame({ balance, playing, animate, symbol, play }: GameProps) {
  const later = useLater();
  const [stake, setStake] = useState('10');
  const [reels, setReels] = useState(initialReels);
  const [round, setRound] = useState<VaultRoundView | null>(null);
  const [revealed, setRevealed] = useState(true);
  const parsed = parseStake(stake);
  const problem = stakeProblem(parsed, balance);
  const duration = GAME_DURATION_MS.slots;

  async function spin() {
    setRevealed(false);
    const result = await play({ stake });
    if (!result) return setRevealed(true);
    const final = (result.outcome as { reels: SlotSymbol[] }).reels;
    setRound(result);
    const landed = (index: number): Reel => ({
      strip: [fillerSymbol(), final[index], fillerSymbol()],
      offset: 0,
      spinning: false,
    });
    if (!animate) {
      later(() => {
        setReels(final.map((_, index) => landed(index)));
        setRevealed(true);
      }, duration);
      return;
    }
    // Build long strips that end on the server's result, then glide each reel into place.
    setReels((current) =>
      current.map((reel, index) => {
        const visible = reel.strip.slice(reel.offset, reel.offset + 3);
        const filler = Array.from({ length: 18 + index * 9 }, fillerSymbol);
        return {
          strip: [...visible, ...filler, fillerSymbol(), final[index], fillerSymbol()],
          offset: 0,
          spinning: false,
        };
      }),
    );
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        setReels((current) =>
          current.map((reel) => ({ ...reel, offset: reel.strip.length - 3, spinning: true })),
        ),
      ),
    );
    REEL_STOPS.forEach((stop, index) =>
      later(
        () =>
          setReels((current) =>
            current.map((reel, i) =>
              i === index ? { strip: reel.strip.slice(-3), offset: 0, spinning: false } : reel,
            ),
          ),
        stop + 60,
      ),
    );
    later(() => setRevealed(true), duration);
  }

  const outcome = round?.outcome as { reels: SlotSymbol[]; line: SlotLine } | undefined;
  const winners = revealed && outcome ? winningReels(outcome.reels, outcome.line) : [];
  return (
    <div className="game slots">
      <div
        className={`slot-machine${winners.length && outcome?.line !== 'single_f' ? ' celebrate' : ''}`}
      >
        <div className="slot-window">
          {reels.map((reel, index) => (
            <div className="slot-reel" key={index}>
              <div
                className={`slot-strip${reel.spinning ? ' spinning' : ''}`}
                style={{
                  transform: `translateY(calc(var(--cell) * ${-reel.offset}))`,
                  transition: reel.spinning
                    ? `transform ${REEL_STOPS[index]}ms cubic-bezier(0.16, 0.6, 0.22, 1.035)`
                    : 'none',
                  animationDuration: `${REEL_STOPS[index]}ms`,
                }}
              >
                {reel.strip.map((item, cell) => (
                  <div
                    key={cell}
                    className={`slot-cell symbol-${item}${
                      !reel.spinning && cell === reel.offset + 1 && winners.includes(index)
                        ? ' hit'
                        : ''
                    }`}
                  >
                    <SlotIcon symbol={item} />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="slot-payline" aria-hidden="true" />
        </div>
      </div>
      <Result
        round={round}
        revealed={revealed}
        playing={playing}
        waiting="De rollen draaien…"
        idle="Drie gelijke op de middelste lijn. Jaag op de F."
        symbol={symbol}
      />
      <div className="game-controls">
        <StakeInput
          value={stake}
          onChange={setStake}
          balance={balance}
          disabled={playing}
          symbol={symbol}
        />
        <PlayButton
          game="slots"
          playing={playing}
          disabled={!!problem}
          label="Draai de rollen"
          busyLabel="Draaien…"
          onClick={() => void spin()}
        />
        {problem && balance !== null && <p className="stake-problem">{problem}</p>}
      </div>
      <details className="paytable">
        <summary>Uitbetalingstabel</summary>
        <table>
          <thead>
            <tr>
              <th>Symbool</th>
              <th>3 op een rij</th>
              <th>2 vanaf links</th>
            </tr>
          </thead>
          <tbody>
            {SLOT_SYMBOLS.map((item) => (
              <tr key={item}>
                <td className={`symbol-${item}`}>
                  <SlotIcon symbol={item} size={18} />
                </td>
                <td>{multiplier(SLOT_THREE_BP[item])}</td>
                <td>{multiplier(SLOT_PAIR_BP[item])}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          Eén F ergens op de lijn zonder andere winst: {multiplier(SLOT_SINGLE_F_BP)} (inzet terug).
          Rollen zijn onafhankelijk; de symbolen boven en onder de lijn zijn willekeurig en nooit
          bewust als bijna-winst geplaatst.
        </p>
      </details>
    </div>
  );
}

/* ------------------------------------------------------------------ Roulette */

const CHIPS = [10, 50, 100, 500, 1000];
const SEGMENT = 360 / ROULETTE_WHEEL.length;
const spotLabel: Record<string, string> = {
  red: 'Rood',
  black: 'Zwart',
  even: 'Even',
  odd: 'Oneven',
  low: '1–18',
  high: '19–36',
  'dozen:1': '1–12',
  'dozen:2': '13–24',
  'dozen:3': '25–36',
};
const compact = (value: number) =>
  value >= 1000
    ? `${(value / 1000).toLocaleString('nl-BE', { maximumFractionDigits: 1 })}k`
    : `${value}`;

function point(radius: number, degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  return `${(radius * Math.sin(radians)).toFixed(3)} ${(-radius * Math.cos(radians)).toFixed(3)}`;
}
function Wheel() {
  const outer = 140;
  const inner = 100;
  return (
    <svg viewBox="-150 -150 300 300" className="wheel-svg" aria-hidden="true">
      <defs>
        <radialGradient id="wheel-cone" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#45483c" />
          <stop offset="70%" stopColor="#24271f" />
          <stop offset="100%" stopColor="#191b16" />
        </radialGradient>
        <linearGradient id="wheel-rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e8e4d8" />
          <stop offset="50%" stopColor="#92957e" />
          <stop offset="100%" stopColor="#d6d2c3" />
        </linearGradient>
      </defs>
      <circle r="148" fill="#161813" stroke="url(#wheel-rim)" strokeWidth="3" />
      {ROULETTE_WHEEL.map((n, index) => {
        const start = index * SEGMENT - SEGMENT / 2;
        const end = start + SEGMENT;
        return (
          <g key={n}>
            <path
              className={`pocket ${rouletteColor(n)}`}
              d={`M ${point(outer, start)} A ${outer} ${outer} 0 0 1 ${point(outer, end)} L ${point(inner, end)} A ${inner} ${inner} 0 0 0 ${point(inner, start)} Z`}
            />
            <text
              transform={`rotate(${index * SEGMENT}) translate(0 -127)`}
              className="pocket-label"
            >
              {n}
            </text>
          </g>
        );
      })}
      <circle r={inner} fill="url(#wheel-cone)" stroke="#e8e4d855" strokeWidth="1" />
      {Array.from({ length: 8 }, (_, index) => (
        <line
          key={index}
          x1="0"
          y1="-30"
          x2="0"
          y2="-92"
          transform={`rotate(${index * 45})`}
          stroke="#e8e4d833"
          strokeWidth="1.5"
        />
      ))}
    </svg>
  );
}

export function RouletteGame({
  balance,
  playing,
  animate,
  symbol,
  play,
  recent,
}: GameProps & { recent: VaultRoundView[] }) {
  const later = useLater();
  const [chip, setChip] = useState(10);
  const [bets, setBets] = useState<Record<string, number>>({});
  const [history, setHistory] = useState<[string, number][]>([]);
  const [wheel, setWheel] = useState(0);
  const [ball, setBall] = useState(0);
  const [spinKey, setSpinKey] = useState(0);
  const [round, setRound] = useState<VaultRoundView | null>(null);
  const [spunKeys, setSpunKeys] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(true);
  const [hint, setHint] = useState('');
  const duration = GAME_DURATION_MS.roulette;
  const spin = duration - 700;
  const total = Object.values(bets).reduce((sum, value) => sum + value, 0);
  const spots = Object.keys(bets).length;
  const limit = Math.min(Number(balance ?? 0n), VAULT_LIMITS.maxStake);

  function place(key: string) {
    if (playing) return;
    setHint('');
    if (balance === null) return setHint('Log in om te spelen.');
    if (!bets[key] && spots >= VAULT_LIMITS.rouletteMaxSpots)
      return setHint(`Maximaal ${VAULT_LIMITS.rouletteMaxSpots} vakken per spin.`);
    if (total + chip > limit)
      return setHint(
        total + chip > VAULT_LIMITS.maxStake
          ? `Maximaal ${formatVp(VAULT_LIMITS.maxStake)} ${symbol} per spin.`
          : 'Niet genoeg VP voor deze fiche.',
      );
    setBets((current) => ({ ...current, [key]: (current[key] ?? 0) + chip }));
    setHistory((current) => [...current, [key, chip]]);
  }
  function undo() {
    const last = history.at(-1);
    if (!last || playing) return;
    const [key, amount] = last;
    setHistory((current) => current.slice(0, -1));
    setBets((current) => {
      const next = { ...current, [key]: current[key] - amount };
      if (next[key] <= 0) delete next[key];
      return next;
    });
  }

  async function spinWheel() {
    if (!total) return setHint('Leg eerst een fiche op de tafel.');
    setHint('');
    setRevealed(false);
    const keys = Object.keys(bets);
    const payload = keys.map((key) => {
      const [type, value] = key.split(':');
      return {
        type: type as RouletteBetType,
        ...(value ? { value: Number(value) } : {}),
        amount: String(bets[key]),
      };
    });
    const result = await play({ bets: payload });
    if (!result) return setRevealed(true);
    const number = (result.outcome as { number: number }).number;
    const pocket = ROULETTE_WHEEL.indexOf(number as (typeof ROULETTE_WHEEL)[number]);
    const turn = (current: number) => {
      const target = (((-pocket * SEGMENT) % 360) + 360) % 360;
      const now = ((current % 360) + 360) % 360;
      return current + 360 * 5 + ((target - now + 360) % 360);
    };
    setRound(result);
    setSpunKeys(keys);
    if (animate) {
      setSpinKey((value) => value + 1);
      setWheel(turn);
      setBall((current) => current - (((current % 360) + 360) % 360) - 360 * 7);
    }
    later(() => {
      if (!animate) setWheel(turn);
      setRevealed(true);
    }, duration);
  }

  const outcome = round?.outcome as
    { number: number; color: string; winners: number[] } | undefined;
  const winningKeys = revealed && outcome ? outcome.winners.map((index) => spunKeys[index]) : [];
  const spot = (key: string, label: React.ReactNode, className = '', style?: CSSProperties) => (
    <button
      key={key}
      type="button"
      className={`board-spot ${className}${winningKeys.includes(key) ? ' hit' : ''}`}
      style={style}
      disabled={playing}
      onClick={() => place(key)}
      aria-label={`Inzet op ${typeof label === 'string' || typeof label === 'number' ? label : key}${
        bets[key] ? `, nu ${bets[key]} ${symbol}` : ''
      }`}
    >
      <span>{label}</span>
      {bets[key] ? <i className="chip-badge">{compact(bets[key])}</i> : null}
    </button>
  );
  const lastNumbers = recent
    .filter((item) => item.game === 'roulette')
    .map((item) => (item.outcome as { number: number }).number)
    .slice(0, 10);
  const potential = Object.entries(bets).reduce((best, [key, amount]) => {
    const type = key.split(':')[0] as RouletteBetType;
    return Math.max(best, Number(payoutFor(BigInt(amount), ROULETTE_PAYOUT_BP[type])));
  }, 0);

  return (
    <div className="game roulette">
      <div className="roulette-top">
        <div className="wheel" style={{ '--spin': `${spin}ms` } as CSSProperties}>
          <div className="wheel-pointer" aria-hidden="true" />
          <div className="wheel-rotor" style={{ transform: `rotate(${wheel}deg)` }}>
            <Wheel />
          </div>
          <div
            className="ball-rotor"
            style={{ transform: `rotate(${ball}deg)` }}
            aria-hidden="true"
          >
            <div key={spinKey} className={`wheel-ball${spinKey ? ' dropping' : ''}`} />
          </div>
          <div className={`wheel-hub${revealed && outcome ? ` show ${outcome.color}` : ''}`}>
            {revealed && outcome ? outcome.number : <span className="mini-f">F</span>}
          </div>
        </div>
        <div className="roulette-side">
          <div className="last-numbers" aria-label="Jouw laatste nummers">
            {lastNumbers.length ? (
              lastNumbers.map((n, index) => (
                <span key={index} className={rouletteColor(n)}>
                  {n}
                </span>
              ))
            ) : (
              <small>Nog geen spins</small>
            )}
          </div>
          <Result
            round={round}
            revealed={revealed}
            playing={playing}
            waiting="Rien ne va plus…"
            idle="Kies een fiche en leg in."
            symbol={symbol}
          >
            {outcome &&
              `${outcome.number} ${outcome.color === 'red' ? 'rood' : outcome.color === 'black' ? 'zwart' : 'nul'}. `}
          </Result>
          <div className="chip-rack" role="radiogroup" aria-label="Fichewaarde">
            {CHIPS.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={chip === value}
                className={`chip chip-${value}${chip === value ? ' active' : ''}`}
                disabled={playing}
                onClick={() => setChip(value)}
              >
                {compact(value)}
              </button>
            ))}
          </div>
          <div className="game-odds">
            <span>
              Totale inzet{' '}
              <strong>
                {formatVp(total)} {symbol}
              </strong>
            </span>
            <span>
              Hoogste uitbetaling{' '}
              <strong>
                {formatVp(potential)} {symbol}
              </strong>
            </span>
          </div>
          <div className="roulette-actions">
            <button
              type="button"
              className="button ghost"
              onClick={undo}
              disabled={playing || !history.length}
            >
              <RotateCcw size={15} /> Ongedaan
            </button>
            <button
              type="button"
              className="button ghost"
              onClick={() => {
                setBets({});
                setHistory([]);
              }}
              disabled={playing || !total}
            >
              <Trash2 size={15} /> Wissen
            </button>
          </div>
          <PlayButton
            game="roulette"
            playing={playing}
            disabled={balance === null || !total || total > limit}
            label="Draai het wiel"
            busyLabel="Het wiel draait…"
            onClick={() => void spinWheel()}
          />
          {hint && <p className="stake-problem">{hint}</p>}
        </div>
      </div>
      <div className="roulette-board" aria-label="Roulettetafel">
        {spot('straight:0', 0, 'zero', {
          '--r': '1 / 4',
          '--c': '1',
          '--mr': '1',
          '--mc': '1 / 4',
        } as CSSProperties)}
        {Array.from({ length: 36 }, (_, index) => {
          const n = index + 1;
          return spot(`straight:${n}`, n, rouletteColor(n), {
            '--r': `${3 - ((n - 1) % 3)}`,
            '--c': `${Math.ceil(n / 3) + 1}`,
            '--mr': `${Math.ceil(n / 3) + 1}`,
            '--mc': `${((n - 1) % 3) + 1}`,
          } as CSSProperties);
        })}
        {[1, 2, 3].map((column) =>
          spot(`column:${column}`, '2:1', 'column', {
            '--r': `${4 - column}`,
            '--c': '14',
            '--mr': '14',
            '--mc': `${column}`,
          } as CSSProperties),
        )}
      </div>
      <div className="roulette-outside">
        {['dozen:1', 'dozen:2', 'dozen:3'].map((key) => spot(key, spotLabel[key], 'dozen'))}
      </div>
      <div className="roulette-outside even-money">
        {['low', 'even', 'red', 'black', 'odd', 'high'].map((key) =>
          spot(key, spotLabel[key], key === 'red' || key === 'black' ? key : ''),
        )}
      </div>
      <p className="board-note">
        Vol nummer {multiplier(ROULETTE_PAYOUT_BP.straight)} · dozijn en kolom{' '}
        {multiplier(ROULETTE_PAYOUT_BP.dozen)} · rood/zwart, even/oneven, laag/hoog{' '}
        {multiplier(ROULETTE_PAYOUT_BP.red)}. Bij 0 verliezen alle buitenkansen.
      </p>
    </div>
  );
}
