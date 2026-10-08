'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { AppIcon } from '@/components/app-icon';
import { APPS, AppId } from './apps';
import { FileIcon } from './file-icon';
import { walk } from './fs';
import { dismissNote, setState, useOS } from './store';
import { openApp, openFile } from './wm';

type Hit =
  | { type: 'app'; id: AppId; label: string; sub: string }
  | { type: 'file'; path: string; label: string; sub: string; kind: string; content?: string }
  | { type: 'web'; label: string; sub: string; q: string };

export function Spotlight() {
  const open = useOS((s) => s.spotlight);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ('');
      setSel(0);
      window.setTimeout(() => input.current?.focus(), 10);
    }
  }, [open]);

  const hits = useMemo<Hit[]>(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    const apps: Hit[] = Object.values(APPS)
      .filter((a) => a.name.toLowerCase().includes(t) || a.blurb.toLowerCase().includes(t))
      .map((a) => ({ type: 'app', id: a.id, label: a.name, sub: a.blurb }));
    const files: Hit[] = walk()
      .filter((f) => f.node.name.toLowerCase().includes(t) || (f.node.kind === 'text' && f.node.content?.toLowerCase().includes(t)))
      .slice(0, 8)
      .map((f) => ({ type: 'file', path: f.path, label: f.node.name, sub: f.path, kind: f.node.kind, content: f.node.content }));
    return [...apps, ...files, { type: 'web', label: `Search Wikipedia for “${q.trim()}”`, sub: 'Opens in Navigator', q: q.trim() }];
  }, [q]);

  const run = (h: Hit) => {
    setState({ spotlight: false });
    if (h.type === 'app') openApp(h.id);
    if (h.type === 'file') openFile(h.path);
    if (h.type === 'web')
      openApp('browser', { url: `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(h.q)}` });
  };

  if (!open) return null;
  return (
    <div className="spot-backdrop" onPointerDown={() => setState({ spotlight: false })}>
      <div className="spot" role="dialog" aria-label="Spotlight" onPointerDown={(e) => e.stopPropagation()}>
        <div className="spot__field">
          <MagnifyingGlass size={18} weight="bold" aria-hidden />
          <input
            ref={input}
            value={q}
            placeholder="Spotlight"
            aria-label="Search apps and files"
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setState({ spotlight: false });
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSel((s) => Math.min(hits.length - 1, s + 1));
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSel((s) => Math.max(0, s - 1));
              }
              if (e.key === 'Enter' && hits[sel]) run(hits[sel]);
            }}
          />
        </div>
        {hits.length > 0 && (
          <ul className="spot__list">
            {hits.map((h, i) => (
              <li key={i}>
                <button type="button" className="spot__hit" data-sel={i === sel} onPointerEnter={() => setSel(i)} onClick={() => run(h)}>
                  <span className="spot__icon">
                    {h.type === 'app' ? (
                      <AppIcon Icon={APPS[h.id].Icon} from={APPS[h.id].from} to={APPS[h.id].to} size="sm" />
                    ) : h.type === 'file' ? (
                      <FileIcon kind={h.kind as never} name={h.label} size={30} content={h.content} />
                    ) : (
                      <FileIcon kind="link" name="web" size={30} />
                    )}
                  </span>
                  <span className="spot__text">
                    <span className="spot__label">{h.label}</span>
                    <span className="spot__sub">{h.sub}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function Notifications() {
  const notes = useOS((s) => s.notes);
  return (
    <div className="growl" aria-live="polite">
      {notes.map((n) => (
        <button
          key={n.id}
          type="button"
          className="growl__note"
          onClick={() => {
            dismissNote(n.id);
            if (n.app) openApp(n.app);
          }}
        >
          {n.app && (
            <span className="growl__icon">
              <AppIcon Icon={APPS[n.app].Icon} from={APPS[n.app].from} to={APPS[n.app].to} size="sm" />
            </span>
          )}
          <span className="growl__text">
            <strong>{n.title}</strong>
            <span>{n.body}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

export function DialogLayer() {
  const dialog = useOS((s) => s.dialog);
  const primary = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (dialog) primary.current?.focus();
  }, [dialog]);
  if (!dialog) return null;
  return (
    <div className="modal-backdrop">
      <div className="alert" role="alertdialog" aria-labelledby="alert-title">
        <span className="alert__icon" aria-hidden>
          <span className="logo-orb logo-orb--big" />
        </span>
        <div className="alert__body">
          <p id="alert-title" className="alert__title">
            {dialog.title}
          </p>
          <p className="alert__text">{dialog.text}</p>
          <div className="alert__buttons">
            {dialog.buttons.map((b) => (
              <button
                key={b.label}
                ref={b.primary ? primary : undefined}
                type="button"
                className={`gel${b.primary ? ' gel--blue' : ''}`}
                onClick={() => {
                  setState({ dialog: null });
                  b.action?.();
                }}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
