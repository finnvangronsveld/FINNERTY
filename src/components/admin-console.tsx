'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
interface AdminAccount {
  id: string;
  displayName: string;
  login: string;
  balance: string;
  totalEarned: string;
  deletionRequestedAt: string | null;
}
export function AdminConsole() {
  const [query, setQuery] = useState('');
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<AdminAccount | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [health, setHealth] = useState<{ mappingIssues: number; watchtime: string } | null>(null);
  async function search(event?: FormEvent) {
    event?.preventDefault();
    setBusy(true);
    try {
      const response = await fetch(`/api/admin?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      setAccounts(data.accounts);
      setHealth(data.health);
    } catch {
      setStatus('Beheer kon niet worden geladen. Controleer je toegang of probeer opnieuw.');
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const abort = new AbortController();
    fetch('/api/admin', { signal: abort.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const data = await response.json();
        setAccounts(data.accounts);
        setHealth(data.health);
      })
      .catch(() => {
        if (!abort.signal.aborted) setStatus('Beheer kon niet worden geladen.');
      });
    return () => abort.abort();
  }, []);
  async function correct(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    try {
      const response = await fetch('/api/admin/corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selected.id, amount, reason, key }),
      });
      const data = await response.json();
      if (!response.ok) {
        setStatus(data.error);
        return;
      }
      setStatus('Correctie is als nieuwe journaaltransactie opgeslagen.');
      setSelected(null);
      setAmount('');
      setReason('');
      await search();
    } catch {
      setStatus(
        'Geen bevestiging ontvangen. Probeer dezelfde correctie opnieuw; de referentie voorkomt dubbele verwerking.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="standard-page content-width admin-console">
      <p className="eyebrow">FINNERTY / BEHEER</p>
      <div className="page-heading">
        <h1>
          Crew control<span>.</span>
        </h1>
        <p>Identiteit, synchronisatie en controleerbare correcties.</p>
      </div>
      {status && (
        <p className="connection-note" role="status">
          {status}
        </p>
      )}
      <div className="glass admin-health">
        <ShieldCheck />
        <p>
          {health
            ? `${health.mappingIssues} mappings vragen aandacht. StreamElements-kijktijd wacht op een geverifieerd datacontract.`
            : 'Koppelingen controleren…'}
        </p>
      </div>
      <form onSubmit={search} className="admin-search">
        <label htmlFor="crew-search">Zoek siteaccounts op displaynaam</label>
        <div>
          <input
            id="crew-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={60}
          />
          <button className="button outline" disabled={busy}>
            Zoeken <ArrowRight size={15} />
          </button>
        </div>
      </form>
      <div className="admin-users">
        {accounts.map((account) => (
          <div className="ledger-row" key={account.id}>
            <div>
              <strong>{account.displayName}</strong>
              <span>
                @{account.login} ·{' '}
                {account.deletionRequestedAt ? 'Verwijderingsverzoek' : 'Siteaccount'}
              </span>
            </div>
            <strong className="ledger-amount">{account.balance} VP</strong>
            <button
              className="button ghost"
              onClick={() => {
                setSelected(account);
                setAmount('');
                setReason('');
                setKey(crypto.randomUUID());
              }}
            >
              Correctie
            </button>
          </div>
        ))}
      </div>
      {selected && (
        <form onSubmit={correct} className="glass correction-form">
          <h2>Correctie voor {selected.displayName}</h2>
          <p>
            Huidig saldo: {selected.balance} VP. Deze actie maakt een nieuwe journaalregel en
            auditregistratie.
          </p>
          <label>
            Mutatie in hele punten
            <input
              required
              value={amount}
              pattern="-?[1-9][0-9]{0,8}"
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label>
            Reden
            <textarea
              required
              minLength={5}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <div>
            <button className="button primary" disabled={busy}>
              Correctie vastleggen
            </button>
            <button type="button" className="button ghost" onClick={() => setSelected(null)}>
              Annuleren
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
