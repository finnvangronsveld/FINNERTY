'use client';
import { useEffect, useMemo, useState } from 'react';
import { ArrowCounterClockwise } from '@phosphor-icons/react';
import { Chess, type Move, type Square } from 'chess.js';
import { claim } from '../achieve';
import { play } from '../wm';

const GLYPH: Record<string, string> = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const VALUE: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const FILES = 'abcdefgh';

// Small positional bonuses (white's view; mirrored for black): centre control and pawn advance.
const CENTER = [0, 1, 2, 3, 3, 2, 1, 0];

function evaluate(game: Chess) {
  if (game.isCheckmate()) return game.turn() === 'w' ? -100_000 : 100_000;
  if (game.isDraw()) return 0;
  let score = 0;
  const board = game.board();
  for (let r = 0; r < 8; r++)
    for (let f = 0; f < 8; f++) {
      const p = board[r][f];
      if (!p) continue;
      let v = VALUE[p.type] + (p.type === 'n' || p.type === 'b' ? (CENTER[r] + CENTER[f]) * 4 : 0);
      if (p.type === 'p') v += (p.color === 'w' ? 6 - r : r - 1) * 6 + (CENTER[f] > 2 ? 8 : 0);
      score += p.color === 'w' ? v : -v;
    }
  return score;
}

function order(moves: Move[]) {
  return moves.sort((a, b) => (b.captured ? VALUE[b.captured] : 0) - (a.captured ? VALUE[a.captured] : 0) + (b.promotion ? 800 : 0) - (a.promotion ? 800 : 0));
}

function search(game: Chess, depth: number, alpha: number, beta: number, maximizing: boolean): number {
  if (depth === 0 || game.isGameOver()) return evaluate(game);
  const moves = order(game.moves({ verbose: true }));
  if (maximizing) {
    let best = -Infinity;
    for (const m of moves) {
      game.move(m);
      best = Math.max(best, search(game, depth - 1, alpha, beta, false));
      game.undo();
      alpha = Math.max(alpha, best);
      if (alpha >= beta) break;
    }
    return best;
  }
  let best = Infinity;
  for (const m of moves) {
    game.move(m);
    best = Math.min(best, search(game, depth - 1, alpha, beta, true));
    game.undo();
    beta = Math.min(beta, best);
    if (alpha >= beta) break;
  }
  return best;
}

/** The computer plays black. Easy adds randomness, Hard looks three moves ahead. */
function bestMove(fen: string, level: 1 | 2 | 3) {
  const game = new Chess(fen);
  const moves = order(game.moves({ verbose: true }));
  let best: Move | null = null;
  let bestScore = Infinity;
  for (const m of moves) {
    game.move(m);
    const s = search(game, level - 1, -Infinity, Infinity, true) + (level === 1 ? Math.random() * 120 : Math.random() * 8);
    game.undo();
    if (s < bestScore) {
      bestScore = s;
      best = m;
    }
  }
  return best;
}

function replay(moves: string[]) {
  const g = new Chess();
  for (const m of moves) g.move(m);
  return g;
}

export function ChessGame() {
  // The game is the list of moves; the board is rebuilt from it.
  const [moves, setMoves] = useState<string[]>([]);
  const [sel, setSel] = useState<Square | null>(null);
  const [level, setLevel] = useState<1 | 2 | 3>(2);
  const [thinking, setThinking] = useState(false);

  const game = useMemo(() => replay(moves), [moves]);
  const board = game.board();
  const lastMove = game.history({ verbose: true }).at(-1);
  const targets = useMemo(
    () => (sel ? new Set(game.moves({ square: sel, verbose: true }).map((m) => m.to)) : new Set<string>()),
    [sel, game],
  );

  const status = game.isCheckmate()
    ? game.turn() === 'w'
      ? 'Checkmate. The computer wins.'
      : 'Checkmate! You win!'
    : game.isDraw()
      ? 'Draw.'
      : thinking
        ? 'Computer is thinking…'
        : game.inCheck()
          ? 'Check! Your move.'
          : 'Your move (white).';

  // Computer's turn.
  useEffect(() => {
    if (game.turn() !== 'b' || game.isGameOver()) return;
    const t1 = window.setTimeout(() => setThinking(true), 0);
    const t2 = window.setTimeout(() => {
      const m = bestMove(game.fen(), level);
      setThinking(false);
      if (!m) return;
      play(m.captured ? 'drop-a' : 'tick', { gain: 0.6 });
      setMoves((ms) => {
        const next = [...ms, m.san];
        if (replay(next).isCheckmate()) play('error');
        return next;
      });
    }, 250);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [game, level]);

  const click = (sq: Square) => {
    if (game.turn() !== 'w' || thinking || game.isGameOver()) return;
    if (sel && targets.has(sq)) {
      const g = replay(moves);
      const m = g.move({ from: sel, to: sq, promotion: 'q' });
      setSel(null);
      play(m.captured ? 'drop-a' : 'tick', { gain: 0.6 });
      if (g.isCheckmate()) {
        play('welcome');
        claim('chess-win');
      }
      setMoves((ms) => [...ms, m.san]);
      return;
    }
    const piece = game.get(sq);
    setSel(piece && piece.color === 'w' ? sq : null);
  };

  const undo = () => {
    setSel(null);
    // Take back the computer's reply and your move.
    setMoves((ms) => ms.slice(0, ms.length % 2 === 0 ? -2 : -1));
  };

  return (
    <div className="game chess">
      <div className="game__bar">
        <div className="seg">
          {(['Easy', 'Medium', 'Hard'] as const).map((l, i) => (
            <button key={l} type="button" className="seg__btn" data-on={level === i + 1} onClick={() => setLevel((i + 1) as 1 | 2 | 3)}>
              {l}
            </button>
          ))}
        </div>
        <button type="button" className="tb-btn" disabled={thinking || moves.length === 0} onClick={undo}>
          <ArrowCounterClockwise size={13} weight="bold" /> Undo
        </button>
        <button
          type="button"
          className="tb-btn"
          style={{ marginLeft: 0 }}
          onClick={() => {
            setSel(null);
            setMoves([]);
          }}
        >
          New Game
        </button>
      </div>
      <div className="game__stage">
        <div className="chess__board" role="grid" aria-label="Chess board">
          {board.map((row, r) =>
            row.map((p, f) => {
              const sq = `${FILES[f]}${8 - r}` as Square;
              return (
                <button
                  key={sq}
                  type="button"
                  className="chess__sq"
                  data-dark={(r + f) % 2 === 1}
                  data-sel={sel === sq}
                  data-target={targets.has(sq)}
                  data-last={lastMove?.from === sq || lastMove?.to === sq}
                  aria-label={`${sq}${p ? ` ${p.color === 'w' ? 'white' : 'black'} ${p.type}` : ''}`}
                  onClick={() => click(sq)}
                >
                  {p && (
                    <span className="chess__piece" data-color={p.color}>
                      {GLYPH[p.type]}
                    </span>
                  )}
                  {f === 0 && <span className="chess__rank">{8 - r}</span>}
                  {r === 7 && <span className="chess__file">{FILES[f]}</span>}
                </button>
              );
            }),
          )}
        </div>
      </div>
      <p className="game__hint">{status}</p>
    </div>
  );
}
