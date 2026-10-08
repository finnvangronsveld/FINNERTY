'use client';
import { useEffect, useRef, useState } from 'react';
import { FileIcon } from './file-icon';
import { basename, join, list, makeFolder, rename, trash, useFsVersion, writeFile, uniqueName } from './fs';
import { useOS } from './store';
import { openApp, openFile, play } from './wm';

type Ctx = { x: number; y: number; path: string | null } | null;
type Pos = Record<string, { x: number; y: number }>;

const POS_KEY = 'finnos:desktop-pos';
const CELL_W = 96;
const CELL_H = 92;

export function Desktop() {
  useFsVersion();
  const wallpaper = useOS((s) => s.settings.wallpaper);
  const items: { name: string; path: string; kind: 'drive' | 'folder' | 'text' | 'image' | 'link' | 'app'; content?: string }[] = [
    { name: 'Finn HD', path: '/', kind: 'drive' },
    ...list('/Desktop').map((n) => ({ name: n.name, path: join('/Desktop', n.name), kind: n.kind, content: n.content })),
  ];
  const [selected, setSelected] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [ctx, setCtx] = useState<Ctx>(null);
  const [pos, setPos] = useState<Pos>(() => {
    try {
      return JSON.parse(localStorage.getItem(POS_KEY) ?? '{}');
    } catch {
      return {};
    }
  });
  const [size, setSize] = useState({ w: 1200, h: 700 });
  const area = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const savePos = (p: Pos) => {
    setPos(p);
    try {
      localStorage.setItem(POS_KEY, JSON.stringify(p));
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (!ctx) return;
    const off = () => setCtx(null);
    window.addEventListener('pointerdown', off);
    return () => window.removeEventListener('pointerdown', off);
  }, [ctx]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (!selected || renaming || selected === '/') return;
      const t = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA)$/.test(t.tagName) || t.isContentEditable) return;
      if (e.key === 'Delete' || (e.key === 'Backspace' && (e.metaKey || e.ctrlKey))) {
        trash(selected);
        play('trash');
        setSelected(null);
      }
      if (e.key === 'Enter') setRenaming(selected);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [selected, renaming]);

  // Default layout: a column from the top right, like the classic desktop.
  const placeOf = (i: number, path: string) => {
    if (pos[path]) return pos[path];
    const perCol = Math.max(1, Math.floor((size.h - 20) / CELL_H));
    const col = Math.floor(i / perCol);
    const row = i % perCol;
    return { x: size.w - CELL_W - 16 - col * CELL_W, y: 14 + row * CELL_H };
  };

  const dragIcon = (path: string, start: { x: number; y: number }) => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const el = e.currentTarget as HTMLElement;
    const sx = e.clientX;
    const sy = e.clientY;
    let moved = false;
    el.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      if (!moved && Math.hypot(dx, dy) < 4) return;
      moved = true;
      el.style.translate = `${dx}px ${dy}px`;
    };
    const up = (ev: PointerEvent) => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.style.translate = '';
      if (!moved) return;
      // Dropped on the Trash in the Dock?
      const over = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-dock="trash"]');
      if (over && path !== '/') {
        trash(path);
        play('trash');
        return;
      }
      savePos({ ...pos, [path]: { x: start.x + ev.clientX - sx, y: Math.max(0, start.y + ev.clientY - sy) } });
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
  };

  return (
    <div
      className="desktop"
      data-wallpaper={wallpaper}
      ref={area}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) {
          setSelected(null);
          setRenaming(null);
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        const icon = (e.target as HTMLElement).closest<HTMLElement>('[data-path]');
        const path = icon?.dataset.path ?? null;
        if (path) setSelected(path);
        setCtx({ x: e.clientX, y: e.clientY, path });
      }}
    >
      {items.map((it, i) => {
        const p = placeOf(i, it.path);
        return (
          <div
            key={it.path}
            className="dicon"
            data-path={it.path}
            data-selected={selected === it.path}
            style={{ left: p.x, top: p.y }}
            onPointerDown={(e) => {
              setSelected(it.path);
              dragIcon(it.path, p)(e);
            }}
            onDoubleClick={() => openFile(it.path)}
            tabIndex={0}
            role="button"
            aria-label={it.name}
            onKeyDown={(e) => e.key === 'Enter' && !renaming && openFile(it.path)}
          >
            <FileIcon kind={it.kind} name={it.name} size={54} content={it.content} />
            {renaming === it.path ? (
              <input
                className="dicon__rename"
                defaultValue={it.name}
                autoFocus
                onFocus={(e) => {
                  const dot = e.target.value.lastIndexOf('.');
                  e.target.setSelectionRange(0, dot > 0 ? dot : e.target.value.length);
                }}
                onBlur={(e) => {
                  rename(it.path, e.target.value);
                  setRenaming(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  if (e.key === 'Escape') setRenaming(null);
                }}
              />
            ) : (
              <span className="dicon__label">{it.name}</span>
            )}
          </div>
        );
      })}

      {ctx && (
        <div className="menu menu--ctx" style={{ left: ctx.x, top: ctx.y }} onPointerDown={(e) => e.stopPropagation()}>
          {ctx.path ? (
            <>
              <button type="button" className="menu__item" onClick={() => { setCtx(null); openFile(ctx.path!); }}>
                <span className="menu__checkmark" />Open
              </button>
              {ctx.path !== '/' && (
                <>
                  <button type="button" className="menu__item" onClick={() => { setCtx(null); setRenaming(ctx.path); }}>
                    <span className="menu__checkmark" />Rename
                  </button>
                  <hr className="menu__sep" />
                  <button
                    type="button"
                    className="menu__item"
                    onClick={() => {
                      setCtx(null);
                      trash(ctx.path!);
                      play('trash');
                    }}
                  >
                    <span className="menu__checkmark" />Move to Trash
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                className="menu__item"
                onClick={() => {
                  setCtx(null);
                  const p = makeFolder('/Desktop');
                  play('drop-a', { gain: 0.6 });
                  if (p) setRenaming(p);
                }}
              >
                <span className="menu__checkmark" />New Folder
              </button>
              <button
                type="button"
                className="menu__item"
                onClick={() => {
                  setCtx(null);
                  const p = writeFile(join('/Desktop', uniqueName('/Desktop', 'untitled.txt')), '');
                  if (p) openApp('textedit', { path: p }, basename(p));
                }}
              >
                <span className="menu__checkmark" />New Text Document
              </button>
              <hr className="menu__sep" />
              <button type="button" className="menu__item" onClick={() => { setCtx(null); savePos({}); }}>
                <span className="menu__checkmark" />Clean Up
              </button>
              <button type="button" className="menu__item" onClick={() => { setCtx(null); openApp('preferences', { pane: 'desktop' }); }}>
                <span className="menu__checkmark" />Change Desktop Background…
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
