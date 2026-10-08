'use client';
/**
 * A small virtual file system. Lives in localStorage so files a visitor makes stay put.
 * Paths look like "/Desktop/Welcome.txt". /Applications is virtual (built from the app registry).
 */
import { useSyncExternalStore } from 'react';

export type FileKind = 'folder' | 'text' | 'image' | 'link' | 'app';

export type FsNode = {
  name: string;
  kind: FileKind;
  children?: FsNode[];
  /** text files: body. images: data URL or the special value "avatar". links: URL. */
  content?: string;
  modified: number;
};

const KEY = 'finnos:fs:v4';

const WELCOME = `Welcome to FinnOS.

This is Finnerty's corner of the internet, built like a computer.

Things to try:
- Drag windows around, resize them from the corner, and use the yellow and green buttons.
- Open Twitch from the Dock to watch the stream and chat when Finn is live.
- Press Ctrl + Space (or Alt + Space) to search for apps and files.
- Open Terminal and type "help".
- Play Snake, Blocks, 2048, Bricks or Minesweeper (in the Games folder), log in with Twitch and get on the leaderboards in Game Center.
- Browse the web in Navigator: it shows a clean, readable version of any page.
- Draw something in Sketch and save it to Pictures.
- Change the wallpaper in System Preferences.

Everything you create stays in this browser.

See you in chat!
`;

function seed(): FsNode {
  const t = Date.now();
  return {
    name: '',
    kind: 'folder',
    modified: t,
    children: [
      {
        name: 'Desktop',
        kind: 'folder',
        modified: t,
        children: [
          { name: 'Welcome.txt', kind: 'text', content: WELCOME, modified: t },
          { name: 'Twitch', kind: 'link', content: 'https://www.twitch.tv/finnerty_', modified: t },
          { name: 'YouTube', kind: 'link', content: 'https://www.youtube.com/@xfinnerty', modified: t },
          {
            name: 'Games',
            kind: 'folder',
            modified: t,
            children: [
              { name: 'Game Center', kind: 'app', content: 'gamecenter', modified: t },
              { name: 'Snake', kind: 'app', content: 'snake', modified: t },
              { name: 'Blocks', kind: 'app', content: 'blocks', modified: t },
              { name: '2048', kind: 'app', content: '2048', modified: t },
              { name: 'Bricks', kind: 'app', content: 'bricks', modified: t },
              { name: 'Minesweeper', kind: 'app', content: 'minesweeper', modified: t },
            ],
          },
        ],
      },
      {
        name: 'Documents',
        kind: 'folder',
        modified: t,
        children: [
          {
            name: 'Notes.txt',
            kind: 'text',
            content: 'Write anything here. It stays in this browser.\n',
            modified: t,
          },
        ],
      },
      {
        name: 'Pictures',
        kind: 'folder',
        modified: t,
        children: [{ name: 'Finnerty.png', kind: 'image', content: 'avatar', modified: t }],
      },
      { name: 'Trash', kind: 'folder', modified: t, children: [] },
    ],
  };
}

let root: FsNode = seed();
let version = 0;
const listeners = new Set<() => void>();

export function hydrateFs() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) root = JSON.parse(raw);
  } catch {
    /* fall back to the seed */
  }
  emit(false);
}

function emit(save = true) {
  version++;
  if (save) {
    try {
      localStorage.setItem(KEY, JSON.stringify(root));
    } catch {
      /* quota or blocked storage: keep working in memory */
    }
  }
  listeners.forEach((l) => l());
}

export function useFsVersion() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => version,
    () => 0,
  );
}

export const split = (path: string) => path.split('/').filter(Boolean);
export const join = (dir: string, name: string) => `${dir === '/' ? '' : dir}/${name}`;
export const parent = (path: string) => '/' + split(path).slice(0, -1).join('/');
export const basename = (path: string) => split(path).pop() ?? '';

export function getNode(path: string): FsNode | null {
  let node: FsNode | undefined = root;
  for (const part of split(path)) {
    node = node?.children?.find((c) => c.name === part);
    if (!node) return null;
  }
  return node ?? null;
}

export function list(path: string): FsNode[] {
  const n = getNode(path);
  return n?.kind === 'folder' ? [...(n.children ?? [])].sort(sortNodes) : [];
}

function sortNodes(a: FsNode, b: FsNode) {
  if (a.kind === 'folder' && b.kind !== 'folder') return -1;
  if (b.kind === 'folder' && a.kind !== 'folder') return 1;
  return a.name.localeCompare(b.name, undefined, { numeric: true });
}

export function uniqueName(dir: string, wanted: string) {
  const names = new Set(list(dir).map((n) => n.name));
  if (!names.has(wanted)) return wanted;
  const dot = wanted.lastIndexOf('.');
  const stem = dot > 0 ? wanted.slice(0, dot) : wanted;
  const ext = dot > 0 ? wanted.slice(dot) : '';
  for (let i = 2; ; i++) {
    const n = `${stem} ${i}${ext}`;
    if (!names.has(n)) return n;
  }
}

function insert(dir: string, node: FsNode) {
  const d = getNode(dir);
  if (!d || d.kind !== 'folder') return null;
  node.name = uniqueName(dir, node.name);
  d.children = [...(d.children ?? []), node];
  d.modified = Date.now();
  emit();
  return join(dir, node.name);
}

export function makeFolder(dir: string, name = 'untitled folder') {
  return insert(dir, { name, kind: 'folder', children: [], modified: Date.now() });
}

export function writeFile(path: string, content: string, kind: FileKind = 'text') {
  const existing = getNode(path);
  if (existing && existing.kind !== 'folder') {
    existing.content = content;
    existing.modified = Date.now();
    emit();
    return path;
  }
  return insert(parent(path), { name: basename(path), kind, content, modified: Date.now() });
}

function detach(path: string): FsNode | null {
  const d = getNode(parent(path));
  const name = basename(path);
  const node = d?.children?.find((c) => c.name === name);
  if (!d || !node) return null;
  d.children = d.children!.filter((c) => c !== node);
  return node;
}

export function move(path: string, toDir: string) {
  if (toDir === path || toDir.startsWith(path + '/')) return null;
  const node = detach(path);
  if (!node) return null;
  return insert(toDir, node);
}

export function rename(path: string, name: string) {
  const node = getNode(path);
  const clean = name.replace(/[/\\]/g, '').trim();
  if (!node || !clean) return null;
  node.name = clean === node.name ? clean : uniqueName(parent(path), clean);
  emit();
  return join(parent(path), node.name);
}

export function trash(path: string) {
  if (path.startsWith('/Trash')) {
    detach(path);
    emit();
    return null;
  }
  return move(path, '/Trash');
}

export function emptyTrash() {
  const t = getNode('/Trash');
  if (t) t.children = [];
  emit();
}

export function resetFs() {
  root = seed();
  emit();
}

/** Every file and folder, for Spotlight. */
export function walk(path = '/', out: { path: string; node: FsNode }[] = []) {
  for (const n of list(path)) {
    const p = join(path, n.name);
    out.push({ path: p, node: n });
    if (n.kind === 'folder') walk(p, out);
  }
  return out;
}
