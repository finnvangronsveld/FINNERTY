'use client';
import { useState } from 'react';
import { CaretLeft, CaretRight, Plus, X } from '@phosphor-icons/react';
import { play } from '../wm';

type Events = Record<string, string[]>;
const KEY = 'finnos:calendar';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function Calendar() {
  const today = new Date();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [sel, setSel] = useState(iso(today));
  const [events, setEvents] = useState<Events>(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? '{}');
    } catch {
      return {};
    }
  });
  const [draft, setDraft] = useState('');

  const save = (next: Events) => {
    setEvents(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const first = (month.getDay() + 6) % 7; // Monday first
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((first + days) / 7) * 7 }, (_, i) => {
    const d = i - first + 1;
    return d >= 1 && d <= days ? new Date(month.getFullYear(), month.getMonth(), d) : null;
  });

  const selDate = new Date(sel + 'T12:00:00');
  const list = events[sel] ?? [];

  return (
    <div className="cal">
      <div className="cal__month">
        <div className="toolbar">
          <div className="seg">
            <button type="button" className="seg__btn" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
              <CaretLeft size={13} weight="bold" />
            </button>
            <button
              type="button"
              className="seg__btn"
              onClick={() => {
                setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                setSel(iso(today));
              }}
            >
              Today
            </button>
            <button type="button" className="seg__btn" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
              <CaretRight size={13} weight="bold" />
            </button>
          </div>
          <span className="cal__title">{month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</span>
        </div>
        <div className="cal__grid">
          {DAYS.map((d) => (
            <span key={d} className="cal__dow">
              {d}
            </span>
          ))}
          {cells.map((d, i) =>
            d ? (
              <button
                key={i}
                type="button"
                className="cal__day"
                data-today={iso(d) === iso(today)}
                data-sel={iso(d) === sel}
                onClick={() => setSel(iso(d))}
              >
                <span className="cal__num">{d.getDate()}</span>
                {(events[iso(d)] ?? []).slice(0, 2).map((e, j) => (
                  <span key={j} className="cal__chip">
                    {e}
                  </span>
                ))}
              </button>
            ) : (
              <span key={i} className="cal__day cal__day--blank" />
            ),
          )}
        </div>
      </div>
      <aside className="cal__side">
        <p className="cal__sidehead">{selDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        {list.length === 0 && <p className="cal__empty">Nothing planned.</p>}
        <ul className="cal__list">
          {list.map((e, i) => (
            <li key={i}>
              <span>{e}</span>
              <button
                type="button"
                aria-label={`Remove ${e}`}
                onClick={() => save({ ...events, [sel]: list.filter((_, j) => j !== i) })}
              >
                <X size={11} weight="bold" />
              </button>
            </li>
          ))}
        </ul>
        <form
          className="cal__add"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            save({ ...events, [sel]: [...list, draft.trim()] });
            setDraft('');
            play('drop-a', { gain: 0.5 });
          }}
        >
          <input value={draft} placeholder="New event" aria-label="New event" onChange={(e) => setDraft(e.target.value)} className="aqua-input" />
          <button type="submit" className="tb-icon" aria-label="Add event">
            <Plus size={13} weight="bold" />
          </button>
        </form>
      </aside>
    </div>
  );
}
