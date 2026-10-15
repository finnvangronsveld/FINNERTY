'use client';
import { useEffect, useState } from 'react';
import { ArrowCounterClockwise, MagicWand } from '@phosphor-icons/react';
import { play } from '../wm';
import { GameOver, RunResult, useBest, useRun } from './kit';

type Card = { suit: number; rank: number; up: boolean; id: number };
type Pile = { kind: 'waste' } | { kind: 'tab'; i: number; at: number } | { kind: 'found'; i: number };
type Game = { stock: Card[]; waste: Card[]; found: Card[][]; tab: Card[][] };

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const red = (c: Card) => c.suit === 1 || c.suit === 2;

function deal(): Game {
  const deck: Card[] = [];
  for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) deck.push({ suit: s, rank: r, up: false, id: s * 13 + r });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  const tab: Card[][] = [];
  for (let i = 0; i < 7; i++) {
    tab.push(deck.splice(0, i + 1).map((c, k) => ({ ...c, up: k === i })));
  }
  return { stock: deck, waste: [], found: [[], [], [], []], tab };
}

const clone = (g: Game): Game => ({
  stock: g.stock.map((c) => ({ ...c })),
  waste: g.waste.map((c) => ({ ...c })),
  found: g.found.map((p) => p.map((c) => ({ ...c }))),
  tab: g.tab.map((p) => p.map((c) => ({ ...c }))),
});

function canFound(card: Card, pile: Card[]) {
  const top = pile.at(-1);
  return top ? top.suit === card.suit && top.rank === card.rank - 1 : card.rank === 1;
}

function canTab(card: Card, pile: Card[]) {
  const top = pile.at(-1);
  return top ? top.up && red(top) !== red(card) && top.rank === card.rank + 1 : card.rank === 13;
}

/** The cards picked up from a pile (a run for tableau, one card otherwise). */
function picked(g: Game, from: Pile): Card[] {
  if (from.kind === 'waste') return g.waste.slice(-1);
  if (from.kind === 'found') return g.found[from.i].slice(-1);
  return g.tab[from.i].slice(from.at);
}

function take(g: Game, from: Pile) {
  if (from.kind === 'waste') g.waste.pop();
  else if (from.kind === 'found') g.found[from.i].pop();
  else {
    g.tab[from.i].splice(from.at);
    const top = g.tab[from.i].at(-1);
    if (top) top.up = true;
  }
}

function CardView({ card, selected }: { card: Card; selected?: boolean }) {
  if (!card.up) return <span className="card card--back" />;
  return (
    <span className="card" data-red={red(card)} data-selected={selected}>
      <span className="card__corner">
        {RANKS[card.rank]}
        <br />
        {SUITS[card.suit]}
      </span>
      <span className="card__pip">{SUITS[card.suit]}</span>
    </span>
  );
}

export function Solitaire() {
  const [g, setG] = useState<Game>(deal);
  const [sel, setSel] = useState<Pile | null>(null);
  const [history, setHistory] = useState<Game[]>([]);
  const [started, setStarted] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [won, setWon] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const run = useRun('solitaire');
  const best = useBest('solitaire');

  useEffect(() => {
    if (!started || won) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [started, won]);

  const seconds = started && now ? Math.max(0, Math.floor((now - started) / 1000)) : 0;

  const commit = (next: Game, sound: 'tick' | 'drop-a' = 'tick') => {
    if (!started) {
      const t = Date.now();
      setStarted(t);
      setNow(t);
      run.start();
    }
    setHistory((h) => [...h.slice(-50), g]);
    setG(next);
    setSel(null);
    play(sound, { gain: 0.5, jitter: 0.1 });
    if (next.found.every((p) => p.length === 13)) {
      const t = Math.max(30, Math.floor((Date.now() - (started ?? Date.now())) / 1000));
      setNow(Date.now());
      setWon(true);
      play('welcome');
      void run.finish(t).then(setResult);
    }
  };

  const tryMove = (from: Pile, to: Pile) => {
    const cards = picked(g, from);
    if (!cards.length || !cards[0].up) return false;
    if (to.kind === 'found') {
      if (cards.length !== 1 || !canFound(cards[0], g.found[to.i])) return false;
      const n = clone(g);
      take(n, from);
      n.found[to.i].push({ ...cards[0] });
      commit(n, 'drop-a');
      return true;
    }
    if (to.kind === 'tab') {
      if (from.kind === 'tab' && from.i === to.i) return false;
      if (!canTab(cards[0], g.tab[to.i])) return false;
      const n = clone(g);
      take(n, from);
      n.tab[to.i].push(...cards.map((c) => ({ ...c })));
      commit(n);
      return true;
    }
    return false;
  };

  const autoFound = (from: Pile) => {
    const [card] = picked(g, from).slice(-1);
    if (!card) return false;
    if (from.kind === 'tab' && from.at !== g.tab[from.i].length - 1) return false;
    const i = g.found.findIndex((p) => canFound(card, p));
    return i >= 0 && tryMove(from, { kind: 'found', i });
  };

  const click = (p: Pile) => {
    if (won) return;
    if (sel) {
      if (tryMove(sel, p)) return;
      setSel(null);
    }
    const cards = picked(g, p);
    if (cards.length && cards[0].up) setSel(p);
    else if (p.kind === 'tab' && g.tab[p.i].length && !g.tab[p.i].at(-1)!.up) {
      const n = clone(g);
      n.tab[p.i].at(-1)!.up = true;
      commit(n);
    }
  };

  const draw = () => {
    if (won) return;
    const n = clone(g);
    if (n.stock.length) n.waste.push({ ...n.stock.pop()!, up: true });
    else {
      n.stock = n.waste.reverse().map((c) => ({ ...c, up: false }));
      n.waste = [];
    }
    commit(n);
  };

  const auto = () => {
    // Move everything that can go up to the foundations, one card at a time.
    let n = clone(g);
    let moved = true;
    while (moved) {
      moved = false;
      const sources: Pile[] = [{ kind: 'waste' }, ...n.tab.map((p, i) => ({ kind: 'tab' as const, i, at: p.length - 1 }))];
      for (const s of sources) {
        const [card] = picked(n, s);
        if (!card?.up) continue;
        const f = n.found.findIndex((p) => canFound(card, p));
        if (f >= 0) {
          const m = clone(n);
          take(m, s);
          m.found[f].push({ ...card });
          n = m;
          moved = true;
        }
      }
    }
    commit(n, 'drop-a');
  };

  const newGame = () => {
    setG(deal());
    setSel(null);
    setHistory([]);
    setStarted(null);
    setNow(0);
    setWon(false);
    setResult(null);
  };

  const isSel = (p: Pile) =>
    !!sel &&
    sel.kind === p.kind &&
    (sel.kind !== 'tab' || (p.kind === 'tab' && sel.i === p.i && p.at >= sel.at)) &&
    (sel.kind !== 'found' || (p.kind === 'found' && sel.i === p.i));

  return (
    <div className="game solitaire">
      <div className="game__bar">
        <span className="game__stat">Time <b>{seconds}s</b></span>
        <span className="game__stat">Best <b>{best !== null ? `${best}s` : '--'}</b></span>
        <button type="button" className="tb-btn" disabled={!history.length || won} onClick={() => { setG(history.at(-1)!); setHistory((h) => h.slice(0, -1)); setSel(null); }}>
          <ArrowCounterClockwise size={13} weight="bold" /> Undo
        </button>
        <button type="button" className="tb-btn" style={{ marginLeft: 0 }} disabled={won} onClick={auto}>
          <MagicWand size={13} weight="fill" /> Auto
        </button>
        <button type="button" className="tb-btn" style={{ marginLeft: 0 }} onClick={newGame}>
          New Game
        </button>
      </div>
      <div className="sol">
        <div className="sol__top">
          <button type="button" className="sol__slot" onClick={draw} aria-label="Draw a card">
            {g.stock.length ? <span className="card card--back" /> : <span className="sol__recycle">↺</span>}
          </button>
          <button type="button" className="sol__slot" onClick={() => click({ kind: 'waste' })} onDoubleClick={() => autoFound({ kind: 'waste' })} aria-label="Waste pile">
            {g.waste.length > 0 && <CardView card={g.waste.at(-1)!} selected={isSel({ kind: 'waste' })} />}
          </button>
          <span className="sol__gap" />
          {g.found.map((p, i) => (
            <button key={i} type="button" className="sol__slot sol__slot--found" onClick={() => click({ kind: 'found', i })} aria-label={`Foundation ${i + 1}`}>
              {p.length ? <CardView card={p.at(-1)!} selected={isSel({ kind: 'found', i })} /> : <span className="sol__ace">A</span>}
            </button>
          ))}
        </div>
        <div className="sol__tab">
          {g.tab.map((pile, i) => (
            <div key={i} className="sol__col" onClick={(e) => e.target === e.currentTarget && click({ kind: 'tab', i, at: pile.length })}>
              {pile.length === 0 && <button type="button" className="sol__slot" onClick={() => click({ kind: 'tab', i, at: 0 })} aria-label="Empty column" />}
              {pile.map((c, at) => (
                <button
                  key={c.id}
                  type="button"
                  className="sol__card"
                  style={{ top: pile.slice(0, at).reduce((y, x) => y + (x.up ? 24 : 9), 0) }}
                  onClick={() => click({ kind: 'tab', i, at })}
                  onDoubleClick={() => autoFound({ kind: 'tab', i, at })}
                  aria-label={c.up ? `${RANKS[c.rank]} of ${['spades', 'hearts', 'diamonds', 'clubs'][c.suit]}` : 'Face-down card'}
                >
                  <CardView card={c} selected={isSel({ kind: 'tab', i, at })} />
                </button>
              ))}
            </div>
          ))}
        </div>
        {won && <GameOver game="solitaire" score={seconds} result={result} onAgain={newGame} title="You won!" />}
      </div>
    </div>
  );
}
