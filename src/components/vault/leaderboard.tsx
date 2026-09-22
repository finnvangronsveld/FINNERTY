'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Crown, Eye, Trophy } from 'lucide-react';
import type { LeaderboardPeriod, LeaderboardView } from '@/lib/contracts';
import { formatVp } from '@/lib/vault';
import { useSite } from '../site-provider';
import { LoginButton } from '../site-shell';

export function Leaderboard({
  refreshKey = 0,
  limit = 10,
}: {
  refreshKey?: number;
  limit?: number;
}) {
  const { account, config, refreshAccount, setNotice } = useSite();
  const [period, setPeriod] = useState<LeaderboardPeriod>('all');
  const [board, setBoard] = useState<LeaderboardView | null>(null);
  const [failed, setFailed] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(0);
  const viewerKey = account ? `${account.provider}:${account.login}:${account.listed}` : 'guest';

  useEffect(() => {
    const abort = new AbortController();
    const load = () =>
      fetch(`/api/vault/leaderboard?period=${period}`, { signal: abort.signal, cache: 'no-store' })
        .then(async (response) => {
          if (!response.ok) throw new Error();
          const data = await response.json();
          setBoard(data.leaderboard);
          setFailed(false);
        })
        .catch(() => {
          if (!abort.signal.aborted) setFailed(true);
        });
    void load();
    const interval = setInterval(load, 60_000);
    return () => {
      abort.abort();
      clearInterval(interval);
    };
  }, [period, refreshKey, viewerKey, joined]);

  async function join() {
    setJoining(true);
    try {
      const response = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listed: true }),
      });
      if (!response.ok) throw new Error();
      await refreshAccount();
      setJoined((value) => value + 1);
    } catch {
      setNotice('Je zichtbaarheid kon niet worden opgeslagen.');
    } finally {
      setJoining(false);
    }
  }

  const current = board?.period === period ? board : null;
  const since =
    current?.since &&
    new Date(current.since).toLocaleDateString('nl-BE', {
      day: 'numeric',
      month: 'long',
      timeZone: 'Europe/Brussels',
    });
  const viewer = current?.viewer;
  return (
    <section className="leaderboard glass" aria-labelledby="leaderboard-title">
      <div className="leaderboard-head">
        <Trophy size={20} />
        <div>
          <h2 id="leaderboard-title">Leaderboard</h2>
          <p>
            {period === 'all'
              ? 'Wie heeft nu de meeste Vault Points?'
              : `Grootste stijgers sinds ${since ?? 'de 1e'}.`}
          </p>
        </div>
      </div>
      <div className="period-tabs" role="tablist" aria-label="Periode">
        {(
          [
            ['all', 'Totaal'],
            ['month', 'Deze maand'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={period === value}
            className={period === value ? 'active' : ''}
            onClick={() => setPeriod(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <ol className="leaderboard-list" aria-busy={!current && !failed}>
        {failed && !current ? (
          <li className="leaderboard-empty">Het leaderboard is even niet beschikbaar.</li>
        ) : !current ? (
          Array.from({ length: 5 }, (_, index) => <li key={index} className="skeleton" />)
        ) : current.entries.length ? (
          // Names and values can tie; the list is replaced wholesale, so position is the identity.
          current.entries.slice(0, limit).map((entry, position) => (
            <li key={position} className={entry.you ? 'you' : ''}>
              <span className={`rank rank-${entry.rank}`}>
                {entry.rank === 1 ? <Crown size={14} /> : entry.rank}
              </span>
              <span className="leader-avatar">
                {entry.avatarUrl ? (
                  <Image
                    src={entry.avatarUrl}
                    alt=""
                    width={28}
                    height={28}
                    unoptimized
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  entry.name.charAt(0).toUpperCase()
                )}
              </span>
              <span className="leader-name">
                {entry.name}
                {entry.you && <small> · jij</small>}
              </span>
              <strong>
                {period === 'month' ? '+' : ''}
                {formatVp(entry.value)} <small>{config.pointsSymbol}</small>
              </strong>
            </li>
          ))
        ) : (
          <li className="leaderboard-empty">
            {period === 'all'
              ? 'Nog niemand zichtbaar. Claim de eerste plek.'
              : 'Deze maand nog geen stijgers.'}
          </li>
        )}
      </ol>
      <div className="leaderboard-viewer">
        {!account ? (
          <>
            <p>Log in om jezelf in de ranglijst te zien.</p>
            <LoginButton />
          </>
        ) : viewer && !viewer.listed ? (
          <>
            <p>
              <Eye size={14} /> Je bent onzichtbaar. Je positie en naam worden pas getoond als je
              dat zelf aanzet.
            </p>
            <button
              type="button"
              className="button outline"
              disabled={joining}
              onClick={() => void join()}
            >
              Toon mij in het leaderboard
            </button>
          </>
        ) : viewer ? (
          <p className="viewer-rank">
            {viewer.rank ? (
              <>
                Jij staat op <strong>#{viewer.rank}</strong> met{' '}
                <strong>
                  {period === 'month' && BigInt(viewer.value) > 0n ? '+' : ''}
                  {formatVp(viewer.value)} {config.pointsSymbol}
                </strong>
              </>
            ) : period === 'month' ? (
              'Nog geen stijging deze maand. Kijk mee of waag een ronde.'
            ) : (
              'Nog geen positie. Kijk mee om Vault Points te verdienen.'
            )}
          </p>
        ) : null}
      </div>
    </section>
  );
}
