'use client';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  Fingerprint,
  LogOut,
  Orbit,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { useSite } from './site-provider';
import { AccountIntro } from './pages';
import { AccountAvatar } from './site-shell';
import { useSearchParams } from 'next/navigation';
import type { LedgerView } from '@/lib/contracts';
import { GAME_INFO, type GameId } from '@/lib/vault';
import { GameIcon } from './vault/shared';
export function AccountPage() {
  const searchParams = useSearchParams();
  const { account, config, logout, busy, refreshAccount, setNotice } = useSite();
  const [page, setPage] = useState(1);
  const [entries, setEntries] = useState<LedgerView[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingListed, setPendingListed] = useState<boolean | null>(null);
  useEffect(() => {
    if (!account) return;
    const abort = new AbortController();
    fetch(`/api/account/ledger?page=${page}`, { signal: abort.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const data = await response.json();
        setEntries(data.entries);
        setHasMore(data.hasMore);
      })
      .catch(() => {
        if (!abort.signal.aborted) setError('De transactiegeschiedenis kon niet worden opgehaald.');
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [account, page]);
  async function savePreference(listed: boolean) {
    setPendingListed(listed);
    setSaving(true);
    try {
      const response = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listed }),
      });
      if (!response.ok) throw new Error();
      await refreshAccount();
    } catch {
      setNotice('Je voorkeur kon niet worden opgeslagen.');
    } finally {
      setSaving(false);
      setPendingListed(null);
    }
  }
  async function requestDeletion() {
    setSaving(true);
    try {
      const response = await fetch('/api/account/deletion', { method: 'POST' });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setNotice(data.message);
      await refreshAccount();
    } catch {
      setNotice('De aanvraag kon niet worden opgeslagen.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="standard-page content-width">
      <div className="page-heading">
        <p className="eyebrow">CREW IDENTITY</p>
        <h1>
          Jouw orbit<span>.</span>
        </h1>
        <p>Je profiel, je kijktijd en jouw eigen punten.</p>
      </div>
      {searchParams.get('auth') === 'failed' && (
        <p className="connection-note" role="status">
          Twitch-login is niet voltooid. Probeer opnieuw te verbinden.
        </p>
      )}
      {!account ? (
        <AccountIntro />
      ) : (
        <>
          <div className="account-identity">
            <AccountAvatar large />
            <div>
              <p className="eyebrow">{config.demo ? 'LOKAAL DEMOACCOUNT' : 'TWITCH ACCOUNT'}</p>
              <h2>{account.displayName}</h2>
              <span>@{account.login}</span>
            </div>
            <button className="button ghost" onClick={() => void logout()} disabled={busy}>
              <LogOut size={16} />
              Uitloggen
            </button>
          </div>
          <div className="account-stats glass">
            <div>
              <Orbit size={23} />
              <span>Jouw {config.pointsName}</span>
              <strong aria-live="polite">
                {account.balance} <small>{config.pointsSymbol}</small>
              </strong>
              <p>
                Totaal verdiend: {account.totalEarned} {config.pointsSymbol}
              </p>
            </div>
            <div>
              <Clock3 size={23} />
              <span>Geregistreerde kijktijd</span>
              <strong>
                {account.watchtimeSeconds
                  ? Math.floor(Number(account.watchtimeSeconds) / 3600)
                  : '—'}{' '}
                <small>uur</small>{' '}
                {account.watchtimeSeconds && (
                  <>
                    {Math.floor((Number(account.watchtimeSeconds) % 3600) / 60)} <small>min</small>
                  </>
                )}
              </strong>
              <p>{config.demo ? 'Gesimuleerde providerdata' : 'Bron: StreamElements'}</p>
            </div>
            <div>
              <RefreshCw size={23} />
              <span>Laatste succesvolle sync</span>
              <strong className="sync-time">
                {account.lastSuccessfulSyncAt
                  ? new Date(account.lastSuccessfulSyncAt).toLocaleTimeString('nl-BE', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Nog geen sync'}
              </strong>
              <p>
                {config.demo
                  ? 'Lokale demo · geen externe verbinding'
                  : account.syncStatus === 'not_connected'
                    ? 'Kijktijdkoppeling nog niet geverifieerd'
                    : account.syncStatus === 'name_changed'
                      ? 'Naamswijziging: controle nodig'
                      : 'Koppeling controleren'}
              </p>
            </div>
          </div>
          <p className="points-note">
            <ShieldCheck size={17} />
            Eigen punten in onze database. Historische kijktijd vormt eerst een basislijn. Punten
            kun je niet kopen, overdragen of inwisselen; in The Vault speel je er alleen voor de
            eer.
          </p>
          <div className="account-columns">
            <section className="ledger-panel">
              <div className="section-caption">
                <h2>Jouw puntenjournaal</h2>
                <span>{config.demo ? 'DEMODATA' : 'VAULT POINTS'}</span>
              </div>
              <p>Elke wijziging, transparant op één plek.</p>
              {error ? (
                <div className="empty-state">
                  {error}
                  <button className="button ghost" onClick={() => void refreshAccount()}>
                    Opnieuw proberen
                  </button>
                </div>
              ) : (
                <div className="ledger-table" aria-busy={loading}>
                  <div className="ledger-header">
                    <span>Omschrijving / datum</span>
                    <span>Mutatie</span>
                  </div>
                  {entries.map((entry) => (
                    <div className="ledger-row" key={entry.id}>
                      <span className="ledger-icon">
                        {entry.type === 'game' ? (
                          <GameIcon game={entry.reason ?? ''} size={17} />
                        ) : (
                          <Clock3 size={17} />
                        )}
                      </span>
                      <div>
                        <strong>
                          {entry.type === 'watchtime'
                            ? 'Geregistreerde kijktijd'
                            : entry.type === 'game'
                              ? `The Vault · ${GAME_INFO[entry.reason as GameId]?.name ?? 'Spel'}`
                              : 'Beheercorrectie'}
                        </strong>
                        <span>
                          {new Date(entry.createdAt).toLocaleString('nl-BE')}
                          {entry.reason && entry.type !== 'game' && ` · ${entry.reason}`}
                        </span>
                      </div>
                      <strong className="ledger-amount">
                        {BigInt(entry.amount) > 0n ? '+' : ''}
                        {entry.amount} <small>{config.pointsSymbol}</small>
                      </strong>
                    </div>
                  ))}
                  {!entries.length && !loading && (
                    <p>
                      Nog geen transacties. Je eerste geldige kijktijdmeting vormt je basislijn.
                    </p>
                  )}
                </div>
              )}
              <div className="pagination">
                <button
                  aria-label="Vorige transacties"
                  disabled={page === 1 || loading}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ArrowLeft size={16} />
                </button>
                <span>Pagina {page}</span>
                <button
                  aria-label="Volgende transacties"
                  disabled={!hasMore || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ArrowRight size={16} />
                </button>
              </div>
            </section>
            <aside className="profile-settings glass">
              <Fingerprint size={24} />
              <h2>Jouw profiel</h2>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={pendingListed ?? account.listed}
                  disabled={saving}
                  onChange={(event) => void savePreference(event.target.checked)}
                />
                <span>Toon mij in de leaderboards (totaal en maand)</span>
              </label>
              <p>
                Standaard aan: je Twitch-naam en avatar staan in de ranglijst. Zet het uit om
                onzichtbaar te zijn; je punten blijven gewoon van jou.
              </p>
              <Link className="text-link" href="/privacy">
                Over je gegevens <ArrowRight size={14} />
              </Link>
              <hr />
              <h3>Accountgegevens verwijderen</h3>
              <p>
                {account.deletionRequested
                  ? 'Je aanvraag is opgeslagen. Er is nog niets verwijderd.'
                  : config.demo
                    ? 'Registreer een lokale demo-aanvraag. Er wordt geen extern verzoek verstuurd.'
                    : 'Registreer een verwijderingsverzoek voor de beheerder. Je account wordt niet direct verwijderd.'}
              </p>
              <button
                className="button outline"
                disabled={saving || account.deletionRequested}
                onClick={() => void requestDeletion()}
              >
                {account.deletionRequested
                  ? 'Aanvraag opgeslagen'
                  : config.demo
                    ? 'Demo-aanvraag registreren'
                    : 'Verwijderingsverzoek registreren'}
              </button>
            </aside>
          </div>
        </>
      )}
    </section>
  );
}
