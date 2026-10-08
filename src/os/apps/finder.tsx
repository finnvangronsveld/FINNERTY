'use client';
import { useEffect, useState } from 'react';
import {
  AppWindow,
  CaretLeft,
  CaretRight,
  Desktop as DesktopIcon,
  FileText,
  FolderPlus,
  HardDrives,
  Image as ImageIcon,
  ListBullets,
  SquaresFour,
  Trash as TrashIcon,
} from '@phosphor-icons/react';
import { AppIcon } from '@/components/app-icon';
import { APPS, AppId, AppProps } from '../apps';
import { FileIcon } from '../file-icon';
import { basename, emptyTrash, getNode, join, list, makeFolder, move, rename, trash, useFsVersion } from '../fs';
import { setState } from '../store';
import { openApp, openFile, play, setData, setTitle } from '../wm';

const SIDEBAR = [
  { path: '/', label: 'Finn HD', Icon: HardDrives },
  { path: '/Desktop', label: 'Desktop', Icon: DesktopIcon },
  { path: '/Documents', label: 'Documents', Icon: FileText },
  { path: '/Pictures', label: 'Pictures', Icon: ImageIcon },
  { path: '/Applications', label: 'Applications', Icon: AppWindow },
  { path: '/Trash', label: 'Trash', Icon: TrashIcon },
];

const fmtDate = (t: number) =>
  new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function Finder({ win }: AppProps) {
  useFsVersion();
  const path = win.data?.path ?? '/Desktop';
  const [hist, setHist] = useState<{ back: string[]; fwd: string[] }>({ back: [], fwd: [] });
  const [selected, setSelected] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [view, setView] = useState<'icons' | 'list'>('icons');
  const [ctx, setCtx] = useState<{ x: number; y: number; path: string } | null>(null);

  const isApps = path === '/Applications';
  const title = isApps ? 'Applications' : path === '/' ? 'Finn HD' : basename(path);

  useEffect(() => setTitle(win.id, title), [win.id, title]);

  useEffect(() => {
    if (!ctx) return;
    const off = () => setCtx(null);
    window.addEventListener('pointerdown', off);
    return () => window.removeEventListener('pointerdown', off);
  }, [ctx]);

  const go = (p: string) => {
    if (p === path) return;
    setHist((h) => ({ back: [...h.back, path], fwd: [] }));
    setSelected(null);
    setData(win.id, { path: p });
  };
  const back = () => {
    const p = hist.back.at(-1);
    if (!p) return;
    setHist((h) => ({ back: h.back.slice(0, -1), fwd: [path, ...h.fwd] }));
    setData(win.id, { path: p });
  };
  const fwd = () => {
    const p = hist.fwd[0];
    if (!p) return;
    setHist((h) => ({ back: [...h.back, path], fwd: h.fwd.slice(1) }));
    setData(win.id, { path: p });
  };

  const open = (p: string) => {
    const n = getNode(p);
    if (n?.kind === 'folder') go(p);
    else openFile(p);
  };

  // Drag a file onto a folder or a sidebar item to move it there.
  const dragFile = (p: string) => (e: React.PointerEvent) => {
    if (e.button !== 0 || isApps) return;
    const el = e.currentTarget as HTMLElement;
    const sx = e.clientX;
    const sy = e.clientY;
    let moved = false;
    el.setPointerCapture(e.pointerId);
    const mv = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
      moved = true;
      el.style.translate = `${ev.clientX - sx}px ${ev.clientY - sy}px`;
      el.style.zIndex = '5';
      el.style.pointerEvents = 'none';
    };
    const up = (ev: PointerEvent) => {
      el.removeEventListener('pointermove', mv);
      el.removeEventListener('pointerup', up);
      el.style.translate = '';
      el.style.zIndex = '';
      el.style.pointerEvents = '';
      if (!moved) return;
      const hit = document.elementFromPoint(ev.clientX, ev.clientY)?.closest<HTMLElement>('[data-drop]');
      const target = hit?.dataset.drop;
      if (!target || target === p || target === '/Applications') return;
      if (target === '/Trash') {
        trash(p);
        play('trash');
      } else if (move(p, target)) play('drop-a', { gain: 0.6 });
    };
    el.addEventListener('pointermove', mv);
    el.addEventListener('pointerup', up);
  };

  const items = isApps
    ? Object.values(APPS).map((a) => ({ key: a.id, name: a.name, app: a.id as AppId }))
    : list(path).map((n) => ({ key: join(path, n.name), name: n.name, node: n }));

  return (
    <div
      className="finder"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (!selected || renaming || isApps) return;
        if (e.key === 'Delete' || (e.key === 'Backspace' && (e.metaKey || e.ctrlKey))) {
          trash(selected);
          play('trash');
          setSelected(null);
        }
        if (e.key === 'Enter') setRenaming(selected);
      }}
    >
      <div className="toolbar">
        <div className="seg">
          <button type="button" className="seg__btn" aria-label="Back" disabled={!hist.back.length} onClick={back}>
            <CaretLeft size={13} weight="bold" />
          </button>
          <button type="button" className="seg__btn" aria-label="Forward" disabled={!hist.fwd.length} onClick={fwd}>
            <CaretRight size={13} weight="bold" />
          </button>
        </div>
        <div className="seg">
          <button type="button" className="seg__btn" data-on={view === 'icons'} aria-label="Icon view" onClick={() => setView('icons')}>
            <SquaresFour size={14} weight="fill" />
          </button>
          <button type="button" className="seg__btn" data-on={view === 'list'} aria-label="List view" onClick={() => setView('list')}>
            <ListBullets size={14} weight="bold" />
          </button>
        </div>
        {!isApps && path !== '/Trash' && (
          <button
            type="button"
            className="tb-btn"
            onClick={() => {
              const p = makeFolder(path);
              play('drop-a', { gain: 0.6 });
              if (p) {
                setSelected(p);
                setRenaming(p);
              }
            }}
          >
            <FolderPlus size={15} weight="fill" /> New Folder
          </button>
        )}
        {path === '/Trash' && (
          <button
            type="button"
            className="tb-btn"
            disabled={!items.length}
            onClick={() =>
              setState({
                dialog: {
                  title: 'Are you sure you want to permanently erase the items in the Trash?',
                  text: 'You can’t undo this action.',
                  buttons: [
                    { label: 'Cancel' },
                    { label: 'Empty Trash', primary: true, action: () => { emptyTrash(); play('trash'); } },
                  ],
                },
              })
            }
          >
            Empty
          </button>
        )}
      </div>

      <div className="finder__main">
        <aside className="sidebar">
          <p className="sidebar__head">Places</p>
          {SIDEBAR.map((s) => (
            <button
              key={s.path}
              type="button"
              className="sidebar__item"
              data-on={path === s.path}
              data-drop={s.path}
              onClick={() => go(s.path)}
            >
              <s.Icon size={16} weight="fill" /> {s.label}
            </button>
          ))}
        </aside>

        <div
          className={`files files--${view}`}
          onPointerDown={(e) => e.target === e.currentTarget && setSelected(null)}
          onContextMenu={(e) => e.preventDefault()}
        >
          {view === 'list' && (
            <div className="files__head">
              <span>Name</span>
              <span>Date Modified</span>
              <span>Kind</span>
            </div>
          )}
          {!items.length && <p className="files__empty">{path === '/Trash' ? 'The Trash is empty.' : 'This folder is empty.'}</p>}
          {items.map((it) => {
            const isFolder = 'node' in it && it.node?.kind === 'folder';
            return (
              <div
                key={it.key}
                className="file"
                data-selected={selected === it.key}
                data-drop={isFolder ? it.key : undefined}
                tabIndex={0}
                role="button"
                aria-label={it.name}
                onPointerDown={(e) => {
                  setSelected(it.key);
                  if ('node' in it) dragFile(it.key)(e);
                }}
                onDoubleClick={() => ('app' in it && it.app ? openApp(it.app) : open(it.key))}
                onKeyDown={(e) => e.key === 'Enter' && !renaming && ('app' in it && it.app ? openApp(it.app) : open(it.key))}
                onContextMenu={(e) => {
                  if (!('node' in it)) return;
                  e.preventDefault();
                  e.stopPropagation();
                  setSelected(it.key);
                  setCtx({ x: e.clientX, y: e.clientY, path: it.key });
                }}
              >
                <span className="file__icon">
                  {'app' in it ? (
                    <AppIcon Icon={APPS[it.app].Icon} from={APPS[it.app].from} to={APPS[it.app].to} size={view === 'list' ? 'xs' : 'md'} />
                  ) : (
                    <FileIcon
                      kind={it.node.kind}
                      name={it.name}
                      content={it.node.content}
                      size={view === 'list' ? 18 : 52}
                    />
                  )}
                </span>
                {renaming === it.key ? (
                  <input
                    className="file__rename"
                    defaultValue={it.name}
                    autoFocus
                    onFocus={(e) => {
                      const dot = e.target.value.lastIndexOf('.');
                      e.target.setSelectionRange(0, dot > 0 ? dot : e.target.value.length);
                    }}
                    onBlur={(e) => {
                      const p = rename(it.key, e.target.value);
                      setRenaming(null);
                      if (p) setSelected(p);
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      if (e.key === 'Escape') setRenaming(null);
                    }}
                  />
                ) : (
                  <span className="file__name">{it.name}</span>
                )}
                {view === 'list' && (
                  <>
                    <span className="file__meta">{'node' in it && it.node ? fmtDate(it.node.modified) : '--'}</span>
                    <span className="file__meta">
                      {'app' in it ? 'Application' : { folder: 'Folder', text: 'Text document', image: 'Image', link: 'Web link', app: 'Application' }[it.node!.kind]}
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="statusbar">
        {items.length} {items.length === 1 ? 'item' : 'items'}
      </div>

      {ctx && (
        <div className="menu menu--ctx" style={{ left: ctx.x, top: ctx.y, position: 'fixed' }} onPointerDown={(e) => e.stopPropagation()}>
          <button type="button" className="menu__item" onClick={() => { setCtx(null); open(ctx.path); }}>
            <span className="menu__checkmark" />Open
          </button>
          <button type="button" className="menu__item" onClick={() => { setCtx(null); setRenaming(ctx.path); }}>
            <span className="menu__checkmark" />Rename
          </button>
          <hr className="menu__sep" />
          {path === '/Trash' ? (
            <button type="button" className="menu__item" onClick={() => { setCtx(null); move(ctx.path, '/Desktop'); play('drop-a'); }}>
              <span className="menu__checkmark" />Put Back on Desktop
            </button>
          ) : null}
          <button type="button" className="menu__item" onClick={() => { setCtx(null); trash(ctx.path); play('trash'); }}>
            <span className="menu__checkmark" />
            {path === '/Trash' ? 'Delete Immediately' : 'Move to Trash'}
          </button>
        </div>
      )}
    </div>
  );
}
