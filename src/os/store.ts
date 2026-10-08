'use client';
/**
 * FinnOS state: windows, focus, settings, notifications and the session phase.
 * A tiny external store read through useSyncExternalStore (see useOS).
 */
import { useSyncExternalStore } from 'react';
import type { AppId } from './apps';

export type WinState = {
  id: string;
  app: AppId;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  minimized: boolean;
  maximized: boolean;
  prev?: { x: number; y: number; w: number; h: number };
  /** Free-form launch data, e.g. a file path or a URL. */
  data?: Record<string, string>;
};

export type Wallpaper = 'aurora' | 'tiger' | 'graphite' | 'neon' | 'sunset' | 'ocean';

export type Settings = {
  wallpaper: Wallpaper;
  magnify: boolean;
  dockSize: number;
  uiSounds: boolean;
  volume: number;
};

export type Note = { id: string; title: string; body: string; app?: AppId };

export type Dialog = {
  title: string;
  text: string;
  buttons: { label: string; primary?: boolean; action?: () => void }[];
};

export type Player = { id: string; login: string; name: string; avatar: string | null };

export type Phase = 'boot' | 'login' | 'desktop' | 'sleep' | 'off';

export type OSState = {
  phase: Phase;
  windows: WinState[];
  focused: string | null;
  z: number;
  settings: Settings;
  notes: Note[];
  spotlight: boolean;
  live: boolean | null;
  uptime: string | null;
  avatar: string | null;
  dialog: Dialog | null;
  player: Player | null;
  loginAvailable: boolean;
};

const SETTINGS_KEY = 'finnos:settings';

const defaults: Settings = {
  wallpaper: 'aurora',
  magnify: true,
  dockSize: 54,
  uiSounds: true,
  volume: 0.85,
};

function loadSettings(): Settings {
  if (typeof window === 'undefined') return defaults;
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') };
  } catch {
    return defaults;
  }
}

let state: OSState = {
  phase: 'boot',
  windows: [],
  focused: null,
  z: 10,
  settings: defaults,
  notes: [],
  spotlight: false,
  live: null,
  uptime: null,
  avatar: null,
  dialog: null,
  player: null,
  loginAvailable: false,
};

const listeners = new Set<() => void>();

export function getState() {
  return state;
}

export function setState(patch: Partial<OSState> | ((s: OSState) => Partial<OSState>)) {
  const p = typeof patch === 'function' ? patch(state) : patch;
  state = { ...state, ...p };
  listeners.forEach((l) => l());
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

const serverState = state;
export function useOS<T>(select: (s: OSState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => select(state),
    () => select(serverState),
  );
}

export function hydrateSettings() {
  setState({ settings: loadSettings() });
}

export function updateSettings(patch: Partial<Settings>) {
  setState((s) => ({ settings: { ...s.settings, ...patch } }));
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  } catch {
    /* storage blocked */
  }
}

let seq = 0;
export const uid = (p = 'w') => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;

export function notify(title: string, body: string, app?: AppId) {
  const id = uid('n');
  setState((s) => ({ notes: [...s.notes, { id, title, body, app }] }));
  window.setTimeout(() => dismissNote(id), 6000);
}

export function dismissNote(id: string) {
  setState((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
}
