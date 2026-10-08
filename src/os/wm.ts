'use client';
import { sfx } from '@/lib/sfx';
import { APPS, AppId } from './apps';
import { basename, getNode } from './fs';
import { getState, notify, setState, uid, WinState } from './store';

export const MENU_H = 24;

export function desktopBounds() {
  const dock = getState().settings.dockSize + 26;
  const w = window.innerWidth;
  const h = window.innerHeight - MENU_H - (isCompact() ? 0 : dock);
  return { w, h, compact: isCompact() };
}

export const isCompact = () => typeof window !== 'undefined' && window.innerWidth < 760;

export function play(name: Parameters<ReturnType<typeof sfx>['play']>[0], opts?: Parameters<ReturnType<typeof sfx>['play']>[1]) {
  if (getState().settings.uiSounds || name.startsWith('sb-')) sfx().play(name, opts);
}

export function focusedApp(): AppId | null {
  const s = getState();
  const w = s.windows.find((x) => x.id === s.focused && !x.minimized);
  return w ? w.app : null;
}

export function openApp(app: AppId, data?: Record<string, string>, title?: string) {
  const meta = APPS[app];
  const s = getState();
  if (meta.singleton) {
    const existing = s.windows.find((w) => w.app === app);
    if (existing) {
      if (existing.minimized) restore(existing.id);
      else focus(existing.id);
      if (data) setState((st) => ({ windows: st.windows.map((w) => (w.id === existing.id ? { ...w, data } : w)) }));
      return existing.id;
    }
  }
  const b = desktopBounds();
  const [dw, dh] = meta.size;
  const w = Math.min(dw, b.w - 20);
  const h = Math.min(dh, b.h - 20);
  const n = s.windows.length % 8;
  const x = Math.max(10, Math.round((b.w - w) / 2 - 120 + n * 28 + (Math.random() * 40 - 20)));
  const y = Math.max(8, Math.round((b.h - h) / 2 - 60 + n * 24));
  const id = uid();
  const z = s.z + 1;
  const win: WinState = {
    id,
    app,
    title: title ?? meta.name,
    x,
    y,
    w,
    h,
    z,
    minimized: false,
    maximized: b.compact,
    data,
  };
  setState({ windows: [...s.windows, win], focused: id, z });
  play('open', { jitter: 0.05 });
  return id;
}

export function openFile(path: string) {
  const node = getNode(path);
  if (!node) return;
  if (node.kind === 'folder') return openApp('finder', { path }, node.name || 'Finn HD');
  if (node.kind === 'text') return openApp('textedit', { path }, node.name);
  if (node.kind === 'image') return openApp('preview', { path }, node.name);
  if (node.kind === 'link' && node.content) {
    if (node.content.includes('twitch.tv/finnerty_')) return openApp('twitch');
    return openApp('browser', { url: node.content }, basename(path));
  }
}

export function focus(id: string) {
  const s = getState();
  const w = s.windows.find((x) => x.id === id);
  if (!w || (s.focused === id && w.z === s.z)) return;
  const z = s.z + 1;
  setState({ windows: s.windows.map((x) => (x.id === id ? { ...x, z } : x)), focused: id, z });
}

export function close(id: string) {
  const s = getState();
  const rest = s.windows.filter((w) => w.id !== id);
  const top = rest.filter((w) => !w.minimized).sort((a, b) => b.z - a.z)[0];
  setState({ windows: rest, focused: top?.id ?? null });
  play('close', { jitter: 0.05 });
}

export function quitApp(app: AppId) {
  getState()
    .windows.filter((w) => w.app === app)
    .forEach((w) => close(w.id));
}

export function minimize(id: string) {
  const s = getState();
  const rest = s.windows.filter((w) => w.id !== id && !w.minimized).sort((a, b) => b.z - a.z)[0];
  setState({
    windows: s.windows.map((w) => (w.id === id ? { ...w, minimized: true } : w)),
    focused: rest?.id ?? null,
  });
  play('screen-off', { gain: 0.6 });
}

export function restore(id: string) {
  const s = getState();
  const z = s.z + 1;
  setState({
    windows: s.windows.map((w) => (w.id === id ? { ...w, minimized: false, z } : w)),
    focused: id,
    z,
  });
  play('screen-on', { gain: 0.6 });
}

export function toggleMaximize(id: string) {
  const b = desktopBounds();
  setState((s) => ({
    windows: s.windows.map((w) => {
      if (w.id !== id) return w;
      if (w.maximized) return { ...w, maximized: false, ...(w.prev ?? {}) };
      return { ...w, maximized: true, prev: { x: w.x, y: w.y, w: w.w, h: w.h }, x: 0, y: 0, w: b.w, h: b.h };
    }),
  }));
  play('tick');
}

export function moveWindow(id: string, x: number, y: number) {
  setState((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, x, y, maximized: false } : w)) }));
}

export function resizeWindow(id: string, w: number, h: number) {
  const min = (app: AppId) => APPS[app].minSize ?? [280, 180];
  setState((s) => ({
    windows: s.windows.map((x) => {
      if (x.id !== id) return x;
      const [mw, mh] = min(x.app);
      return { ...x, w: Math.max(mw, w), h: Math.max(mh, h), maximized: false };
    }),
  }));
}

export function setTitle(id: string, title: string) {
  setState((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, title } : w)) }));
}

export function setData(id: string, data: Record<string, string>) {
  setState((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, data: { ...w.data, ...data } } : w)) }));
}

export function closeAll() {
  setState({ windows: [], focused: null });
}

export function shutdown(kind: 'off' | 'restart' | 'logout' | 'sleep') {
  play('close');
  if (kind === 'sleep') return setState({ phase: 'sleep' });
  closeAll();
  if (kind === 'off') setState({ phase: 'off' });
  if (kind === 'restart') setState({ phase: 'boot' });
  if (kind === 'logout') setState({ phase: 'login' });
}

export { notify };
