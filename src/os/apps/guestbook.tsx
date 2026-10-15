'use client';
import { useCallback, useEffect, useState } from 'react';
import { TwitchLogo, X } from '@phosphor-icons/react';
import { celebrate } from '../achieve';
import { logIn } from '../account';
import { useOS } from '../store';
import { play } from '../wm';

type Entry = { id: number; message: string; created_at: string; name: string; login: string; avatar: string | null };

const when = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export function Guestbook() {
  const player = useOS((s) => s.player);
  const admin = useOS((s) => s.admin);
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch('/api/guestbook')
      .then((r) => r.json())
      .then((d: { entries?: Entry[] }) => setEntries(d.entries ?? []))
      .catch(() => setError('The guestbook is closed right now.'));
  }, []);

  useEffect(() => {
    const t = window.setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const sign = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    const r = await fetch('/api/guestbook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
    }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    if (!r?.ok) {
      setError(d.error ?? 'That didn’t work. Try again.');
      play('error', { gain: 0.5 });
      return;
    }
    setText('');
    play('drop-a', { gain: 0.6 });
    celebrate(d.achievements);
    load();
  };

  const remove = async (id: number) => {
    await fetch(`/api/guestbook?id=${id}`, { method: 'DELETE' }).catch(() => undefined);
    play('trash', { gain: 0.5 });
    load();
  };

  return (
    <div className="guestbook">
      <div className="guestbook__sign">
        {player ? (
          <>
            <textarea
              className="aqua-textarea"
              value={text}
              maxLength={280}
              rows={3}
              placeholder={`Leave a message, ${player.name}…`}
              aria-label="Your message"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void sign();
              }}
            />
            <div className="guestbook__row">
              <span className="guestbook__count">{280 - text.length}</span>
              {error && <span className="guestbook__error">{error}</span>}
              <button type="button" className="gel gel--blue" disabled={busy || !text.trim()} onClick={() => void sign()}>
                Sign the Guestbook
              </button>
            </div>
          </>
        ) : (
          <div className="guestbook__row guestbook__row--center">
            <span>Log in with Twitch to leave a message.</span>
            <button type="button" className="twitch-btn" onClick={() => logIn('guestbook')}>
              <TwitchLogo size={14} weight="fill" /> Log in
            </button>
          </div>
        )}
      </div>
      <ol className="guestbook__list">
        {!entries && <li className="guestbook__empty">Opening the book…</li>}
        {entries?.length === 0 && <li className="guestbook__empty">Nobody has signed yet. Be the first!</li>}
        {entries?.map((e) => (
          <li key={e.id} className="gentry">
            <span className="gentry__avatar">
              {e.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={e.avatar} alt="" />
              ) : (
                e.name[0]
              )}
            </span>
            <div className="gentry__body">
              <p className="gentry__head">
                <b>{e.name}</b> <span>{when(e.created_at)}</span>
              </p>
              <p className="gentry__msg">{e.message}</p>
            </div>
            {(admin || player?.login === e.login) && (
              <button type="button" className="gentry__del" aria-label="Delete message" onClick={() => void remove(e.id)}>
                <X size={11} weight="bold" />
              </button>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
