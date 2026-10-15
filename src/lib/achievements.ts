/** Achievements. Most are awarded by the server when it sees the event; "claimable" ones are easter eggs the client reports. */
export type Achievement = { code: string; name: string; desc: string; claimable?: boolean; secret?: boolean };

export const ACHIEVEMENTS: Achievement[] = [
  { code: 'first-score', name: 'On the Board', desc: 'Save your first high score.' },
  { code: 'all-games', name: 'Arcade Regular', desc: 'Have a score in every game.' },
  { code: 'top-10', name: 'Top Ten', desc: 'Reach the top 10 in any game.' },
  { code: 'number-1', name: 'Number One', desc: 'Hold first place in any game.' },
  { code: 'snake-25', name: 'Long Boi', desc: 'Eat 25 apples in one game of Snake.' },
  { code: '2048-big', name: 'Tile Tycoon', desc: 'Score 20,000 points in 2048.' },
  { code: 'blocks-10k', name: 'Line Clearer', desc: 'Score 10,000 points in Blocks.' },
  { code: 'bricks-1k', name: 'Wrecking Ball', desc: 'Score 1,000 points in Bricks.' },
  { code: 'mines-60', name: 'Bomb Squad', desc: 'Clear Minesweeper in 60 seconds or less.' },
  { code: 'flappy-25', name: 'Frequent Flyer', desc: 'Fly through 25 pipes in Flappy Orb.' },
  { code: 'pong-10', name: 'Table Tennis Pro', desc: 'Score 10 points in Pong.' },
  { code: 'solitaire-win', name: 'Patience', desc: 'Win a game of Solitaire.' },
  { code: 'chess-win', name: 'Checkmate', desc: 'Beat the computer at Chess.', claimable: true },
  { code: 'weekly', name: 'Tournament Player', desc: 'Play the game of the week.' },
  { code: 'guestbook', name: 'Was Here', desc: 'Sign the guestbook.' },
  { code: 'chatter', name: 'Chatterbox', desc: 'Say something in the lobby chat.' },
  { code: 'terminal-sudo', name: 'Nice Try', desc: 'Try to use sudo in Terminal.', claimable: true, secret: true },
  { code: 'night-owl', name: 'Night Owl', desc: 'Use FinnOS between 2 and 5 in the morning.', claimable: true, secret: true },
  { code: 'explorer', name: 'Explorer', desc: 'Open ten different apps.', claimable: true },
];

export const byCode = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.code, a]));
