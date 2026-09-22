'use client';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from 'react';
import { Coins, Dices, Gem, Moon, Orbit, Rocket, Star, Target } from 'lucide-react';
import {
  GAME_DURATION_MS,
  VAULT_LIMITS,
  formatVp,
  type GameId,
  type SlotSymbol,
} from '@/lib/vault';
import type { VaultRoundView } from '@/lib/contracts';
import { useSite } from '../site-provider';

export interface GameProps {
  /** Null while logged out. */
  balance: bigint | null;
  /** True while any round is being played or animated. */
  playing: boolean;
  animate: boolean;
  symbol: string;
  play: (bet: Record<string, unknown>) => Promise<VaultRoundView | null>;
}

const motionQuery = '(prefers-reduced-motion: reduce)';
function subscribeMotion(onChange: () => void) {
  const query = matchMedia(motionQuery);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}
/** Full animations unless the visitor reduced effects on the site or in their OS. */
export function useAnimate() {
  const { effects } = useSite();
  const reduced = useSyncExternalStore(
    subscribeMotion,
    () => matchMedia(motionQuery).matches,
    () => false,
  );
  return effects && !reduced;
}

/** setTimeout that is cancelled when the component unmounts. */
export function useLater() {
  const timers = useRef(new Set<number>());
  useEffect(() => {
    const active = timers.current;
    return () => active.forEach((timer) => clearTimeout(timer));
  }, []);
  return useCallback((callback: () => void, ms: number) => {
    const timer = window.setTimeout(() => {
      timers.current.delete(timer);
      callback();
    }, ms);
    timers.current.add(timer);
  }, []);
}

/** Eases a displayed number towards its target, so balance changes are felt. */
export function useCountUp(target: bigint, animate: boolean, duration = 700) {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (!animate) {
      from.current = target;
      const frame = requestAnimationFrame(() => setShown(target));
      return () => cancelAnimationFrame(frame);
    }
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      const value = origin + ((target - origin) * BigInt(Math.round(eased * 1000))) / 1000n;
      from.current = value;
      setShown(value);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, animate, duration]);
  return shown;
}

export function parseStake(value: string) {
  return /^[1-9][0-9]{0,8}$/.test(value) ? BigInt(value) : null;
}
export function stakeProblem(stake: bigint | null, balance: bigint | null) {
  if (balance === null) return 'Log in om te spelen.';
  if (stake === null) return 'Vul een geheel aantal VP in.';
  if (stake < BigInt(VAULT_LIMITS.minStake)) return `Minimum ${VAULT_LIMITS.minStake} VP.`;
  if (stake > BigInt(VAULT_LIMITS.maxStake))
    return `Maximum ${formatVp(VAULT_LIMITS.maxStake)} VP.`;
  if (stake > balance) return 'Niet genoeg VP. Kijk mee om meer te verdienen.';
  return null;
}

export function StakeInput({
  value,
  onChange,
  balance,
  disabled,
  symbol,
}: {
  value: string;
  onChange: (value: string) => void;
  balance: bigint | null;
  disabled: boolean;
  symbol: string;
}) {
  const current = parseStake(value) ?? BigInt(VAULT_LIMITS.minStake);
  const min = BigInt(VAULT_LIMITS.minStake);
  const ceiling = (() => {
    const max = BigInt(VAULT_LIMITS.maxStake);
    if (balance === null) return max;
    return balance < max ? (balance < min ? min : balance) : max;
  })();
  const clamp = (next: bigint) => (next < min ? min : next > ceiling ? ceiling : next).toString();
  return (
    <div className="stake-input">
      <label htmlFor="vault-stake">Inzet</label>
      <div className="stake-field">
        <input
          id="vault-stake"
          inputMode="numeric"
          autoComplete="off"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value.replace(/[^0-9]/g, '').slice(0, 9))}
        />
        <span>{symbol}</span>
      </div>
      <div className="stake-quick">
        <button type="button" disabled={disabled} onClick={() => onChange(clamp(current / 2n))}>
          ½
        </button>
        <button type="button" disabled={disabled} onClick={() => onChange(clamp(current * 2n))}>
          2×
        </button>
        <button type="button" disabled={disabled} onClick={() => onChange(min.toString())}>
          Min
        </button>
        <button type="button" disabled={disabled} onClick={() => onChange(ceiling.toString())}>
          Max
        </button>
      </div>
    </div>
  );
}

/** Play button that fills while the round plays out; it cannot be pressed again until then. */
export function PlayButton({
  game,
  playing,
  disabled,
  label,
  busyLabel,
  onClick,
}: {
  game: GameId;
  playing: boolean;
  disabled: boolean;
  label: string;
  busyLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`button primary play-button${playing ? ' is-playing' : ''}`}
      style={{ '--round': `${GAME_DURATION_MS[game]}ms` } as CSSProperties}
      disabled={disabled || playing}
      aria-busy={playing}
      onClick={onClick}
    >
      <span>{playing ? busyLabel : label}</span>
    </button>
  );
}

export function GameIcon({ game, size = 20 }: { game: string; size?: number }) {
  switch (game) {
    case 'coinflip':
      return <Coins size={size} />;
    case 'dice':
      return <Dices size={size} />;
    case 'slots':
      return <Star size={size} />;
    default:
      return <Target size={size} />;
  }
}

export function SlotIcon({ symbol, size = 34 }: { symbol: SlotSymbol; size?: number }) {
  switch (symbol) {
    case 'f':
      return (
        <span className="slot-f" style={{ fontSize: size * 1.15 }}>
          F
        </span>
      );
    case 'gem':
      return <Gem size={size} />;
    case 'rocket':
      return <Rocket size={size} />;
    case 'moon':
      return <Moon size={size} />;
    case 'star':
      return <Star size={size} />;
    case 'orbit':
      return <Orbit size={size} />;
  }
}

export function Net({ value, symbol }: { value: string; symbol: string }) {
  const net = BigInt(value);
  return (
    <strong className={`net ${net > 0n ? 'up' : net < 0n ? 'down' : 'even'}`}>
      {net > 0n ? '+' : ''}
      {formatVp(net)} <small>{symbol}</small>
    </strong>
  );
}
