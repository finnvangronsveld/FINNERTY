'use client';
import type { ComponentType } from 'react';
import {
  Bomb,
  ChartBar,
  GameController,
  GridFour,
  Rectangle,
  Waves,
  Calculator as CalcIcon,
  CalendarBlank,
  Compass,
  GearSix,
  Image as ImageIcon,
  Info,
  type Icon,
  NotePencil,
  PaintBrush,
  Smiley,
  TerminalWindow,
  TwitchLogo,
} from '@phosphor-icons/react';
import type { WinState } from './store';
import { About } from './apps/about';
import { Browser } from './apps/browser';
import { Calculator } from './apps/calculator';
import { Calendar } from './apps/calendar';
import { Finder } from './apps/finder';
import { Minesweeper } from './apps/minesweeper';
import { Preferences } from './apps/preferences';
import { Preview } from './apps/preview';
import { Sketch } from './apps/sketch';
import { GameCenter } from './apps/gamecenter';
import { Blocks } from './games/blocks';
import { Bricks } from './games/bricks';
import { Game2048 } from './games/g2048';
import { Snake } from './games/snake';
import { Terminal } from './apps/terminal';
import { TextEdit } from './apps/textedit';
import { Twitch } from './apps/twitch';

export type AppId =
  | 'finder'
  | 'browser'
  | 'twitch'
  | 'textedit'
  | 'terminal'
  | 'calculator'
  | 'gamecenter'
  | 'snake'
  | '2048'
  | 'bricks'
  | 'blocks'
  | 'sketch'
  | 'minesweeper'
  | 'calendar'
  | 'preferences'
  | 'about'
  | 'preview';

export type AppProps = { win: WinState };

export type AppMeta = {
  id: AppId;
  name: string;
  Icon: Icon;
  from: string;
  to: string;
  size: [number, number];
  minSize?: [number, number];
  singleton?: boolean;
  resizable?: boolean;
  /** Dark, unified title bar (brushed look) instead of the light Aqua one. */
  dark?: boolean;
  Component: ComponentType<AppProps>;
  blurb: string;
};

export const APPS: Record<AppId, AppMeta> = {
  finder: { id: 'finder', name: 'Finder', Icon: Smiley, from: '#9fd0ff', to: '#1f6fd6', size: [720, 440], minSize: [420, 260], Component: Finder, blurb: 'Browse your files' },
  browser: { id: 'browser', name: 'Navigator', Icon: Compass, from: '#bfe6ff', to: '#1e7be0', size: [960, 620], minSize: [420, 300], Component: Browser, blurb: 'Browse the web' },
  twitch: { id: 'twitch', name: 'Twitch', Icon: TwitchLogo, from: '#c3a4ff', to: '#5b2fd0', size: [1040, 600], minSize: [480, 300], singleton: true, dark: true, Component: Twitch, blurb: 'Watch Finn live, with chat' },
  textedit: { id: 'textedit', name: 'TextEdit', Icon: NotePencil, from: '#ffe9a8', to: '#d9a21c', size: [560, 460], minSize: [320, 220], Component: TextEdit, blurb: 'Write and save notes' },
  terminal: { id: 'terminal', name: 'Terminal', Icon: TerminalWindow, from: '#6b6f78', to: '#16171a', size: [620, 380], minSize: [360, 200], dark: true, Component: Terminal, blurb: 'Type commands' },
  calculator: { id: 'calculator', name: 'Calculator', Icon: CalcIcon, from: '#ffcf8a', to: '#e0670f', size: [250, 380], singleton: true, resizable: false, dark: true, Component: Calculator, blurb: 'Do some maths' },
  gamecenter: { id: 'gamecenter', name: 'Game Center', Icon: GameController, from: '#c8f0a0', to: '#2f8a2a', size: [760, 560], minSize: [420, 380], singleton: true, Component: GameCenter, blurb: 'Leaderboards and your Twitch login' },
  snake: { id: 'snake', name: 'Snake', Icon: Waves, from: '#9fe0a0', to: '#1f8a4a', size: [460, 520], minSize: [300, 340], singleton: true, Component: Snake, blurb: 'Eat apples, don’t bite yourself' },
  '2048': { id: '2048', name: '2048', Icon: GridFour, from: '#ffe0a0', to: '#d6890c', size: [420, 520], minSize: [300, 380], singleton: true, Component: Game2048, blurb: 'Slide and merge the tiles' },
  bricks: { id: 'bricks', name: 'Bricks', Icon: Rectangle, from: '#ffb8c8', to: '#d6336c', size: [540, 500], minSize: [360, 340], singleton: true, Component: Bricks, blurb: 'Break every brick' },
  blocks: { id: 'blocks', name: 'Blocks', Icon: ChartBar, from: '#b8d8ff', to: '#3a5fd6', size: [440, 580], singleton: true, resizable: false, Component: Blocks, blurb: 'Stack them, clear the lines' },
  sketch: { id: 'sketch', name: 'Sketch', Icon: PaintBrush, from: '#ffb3d1', to: '#d6336c', size: [760, 540], minSize: [420, 340], Component: Sketch, blurb: 'Draw and save pictures' },
  minesweeper: { id: 'minesweeper', name: 'Minesweeper', Icon: Bomb, from: '#b8e3a0', to: '#3a8a2a', size: [330, 430], singleton: true, resizable: false, Component: Minesweeper, blurb: 'The classic, glossier' },
  calendar: { id: 'calendar', name: 'Calendar', Icon: CalendarBlank, from: '#ffb0a8', to: '#d12a20', size: [640, 480], minSize: [420, 360], singleton: true, Component: Calendar, blurb: 'Keep track of things' },
  preferences: { id: 'preferences', name: 'System Preferences', Icon: GearSix, from: '#d5d9e0', to: '#5d636e', size: [620, 440], singleton: true, resizable: false, Component: Preferences, blurb: 'Wallpaper, Dock and sound' },
  about: { id: 'about', name: 'About Finnerty', Icon: Info, from: '#9fd0ff', to: '#1f6fd6', size: [380, 440], singleton: true, resizable: false, Component: About, blurb: 'Who is Finnerty?' },
  preview: { id: 'preview', name: 'Preview', Icon: ImageIcon, from: '#a8ecf0', to: '#118a9a', size: [560, 480], minSize: [300, 240], Component: Preview, blurb: 'Look at pictures' },
};

export const DOCK_APPS: AppId[] = [
  'finder',
  'browser',
  'twitch',
  'gamecenter',
  'textedit',
  'terminal',
  'sketch',
  'calculator',
  'calendar',
  'minesweeper',
  'preferences',
];
