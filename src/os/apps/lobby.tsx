'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { TwitchLogo, X } from '@phosphor-icons/react';
import type { AppProps } from '../apps';
import { celebrate } from '../achieve';
import { logIn } from '../account';
import { useOS } from '../store';
import { play } from '../wm';

type Msg = { id: number; message: string; created_at: string; twitch_id: string; name: string; avatar: string | null };

const time = (d: string) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

/** A chat room for everyone on the site. Polls every few seconds; faster while in front. */
export function Lobby({ win }: AppProps) {
  const player = useOS((s) => s.player);
  const admin = useOS((s) => s.admin);
  const focused = useOS((s) => s.focused === win.id);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const last = useRef(0);
  const list = useRef<HTMLDivElement>(null);

  const poll = useCallback(async () => {
    try {
      const r = await fetch(`/api/chat?after=${last.current}`);
      const d = (await r.json()) as { messages: Msg[]; alive: number[] };
      setLoaded(true);
      setMsgs((prev) => {
        const alive = new Set(d.alive);
        const floor = Math.min(...d.alive, Infinity);
        // Drop messages a moderator removed, then add the new ones.
        const kept = prev.filter((m) => m.id < floor || alive.has(m.id));
        const fresh = d.messages.filter((m) => !kept.some((k) => k.id === m.id));
        if (fresh.length && last.current && fresh.some((m) => m.twitch_id !== player?.id)) play('tick', { gain: 0.6 });
        return [...kept, ...fresh].slice(-200);
      });
      if (d.messages.length) last.current = d.messages[d.messages.length - 1].id;
    } catch {
      /* try again next tick */
    }
  }, [player?.id]);

  useEffect(() => {
    const first = window.setTimeout(poll, 0);
    const id = window.setInterval(poll, focused ? 3000 : 9000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [poll, focused]);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' });
  }, [msgs.length]);

  const send = async () => {
    const message = text.trim();
    if (!message) return;
    setError(null);
    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    if (!r?.ok) {
      setError(d.error ?? 'Not sent.');
      play('error', { gain: 0.4 });
      return;
    }
    setText('');
    play('drop-a', { gain: 0.4, rate: 1.3 });
    celebrate(d.achievements);
    void poll();
  };

  const remove = async (id: number) => {
    await fetch(`/api/chat?id=${id}`, { method: 'DELETE' }).catch(() => undefined);
    setMsgs((m) => m.filter((x) => x.id !== id));
  };

  return (
    <div className="lobby">
      <div className="lobby__list" ref={list}>
        {!loaded && <p className="lobby__note">Joining the lobby…</p>}
        {loaded && msgs.length === 0 && <p className="lobby__note">It’s quiet in here. Say hi!</p>}
        {msgs.map((m, i) => {
          const mine = m.twitch_id === player?.id;
          const grouped = i > 0 && msgs[i - 1].twitch_id === m.twitch_id;
          return (
            <div key={m.id} className="bubble-row" data-mine={mine} data-grouped={grouped}>
              {!mine && (
                <span className="bubble-row__avatar" aria-hidden>
                  {!grouped &&
                    (m.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.avatar} alt="" />
                    ) : (
                      m.name[0]
                    ))}
                </span>
              )}
              <div className="bubble-wrap">
                {!grouped && !mine && <span className="bubble__name">{m.name}</span>}
                <span className="bubble" title={time(m.created_at)}>
                  {m.message}
                </span>
              </div>
              {(admin || mine) && (
                <button type="button" className="bubble__del" aria-label="Delete message" onClick={() => void remove(m.id)}>
                  <X size={10} weight="bold" />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="lobby__compose">
        {player ? (
          <form
            className="lobby__form"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <input
              className="aqua-input lobby__input"
              value={text}
              maxLength={300}
              placeholder="Type a message"
              aria-label="Message"
              onChange={(e) => setText(e.target.value)}
            />
            <button type="submit" className="gel gel--blue" disabled={!text.trim()}>
              Send
            </button>
          </form>
        ) : (
          <div className="lobby__form lobby__form--center">
            <span>Log in to chat with everyone here.</span>
            <button type="button" className="twitch-btn" onClick={() => logIn('lobby')}>
              <TwitchLogo size={14} weight="fill" /> Log in
            </button>
          </div>
        )}
        {error && <p className="lobby__error">{error}</p>}
      </div>
    </div>
  );
}
