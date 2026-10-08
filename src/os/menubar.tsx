'use client';
import { useEffect, useRef, useState } from 'react';
import { MagnifyingGlass, SpeakerHigh, SpeakerSlash, TwitchLogo } from '@phosphor-icons/react';
import { sfx } from '@/lib/sfx';
import { LINKS } from '@/lib/links';
import { APPS } from './apps';
import { makeFolder } from './fs';
import { getState, setState, updateSettings, useOS } from './store';
import { close, focus, focusedApp, minimize, openApp, openFile, play, quitApp, shutdown, toggleMaximize } from './wm';

type Item =
  | { sep: true }
  | { label: string; key?: string; action?: () => void; disabled?: boolean; checked?: boolean };

type Menu = { id: string; label: React.ReactNode; bold?: boolean; items: () => Item[] };

export function confirmShutdown() {
  play('notify');
  setState({
    dialog: {
      title: 'Are you sure you want to shut down your computer now?',
      text: 'Any windows you have open will close.',
      buttons: [
        { label: 'Restart', action: () => shutdown('restart') },
        { label: 'Sleep', action: () => shutdown('sleep') },
        { label: 'Cancel' },
        { label: 'Shut Down', primary: true, action: () => shutdown('off') },
      ],
    },
  });
}

function focusedWin() {
  const s = getState();
  return s.windows.find((w) => w.id === s.focused && !w.minimized) ?? null;
}

function useMenus(): Menu[] {
  const app = useOS((s) => {
    const w = s.windows.find((x) => x.id === s.focused && !x.minimized);
    return w ? w.app : null;
  });
  const appName = app ? APPS[app].name : 'Finder';

  return [
    {
      id: 'logo',
      label: <span className="logo-orb" aria-label="FinnOS menu" />,
      items: () => [
        { label: 'About Finnerty', action: () => openApp('about') },
        { sep: true },
        { label: 'System Preferences…', action: () => openApp('preferences') },
        { sep: true },
        { label: 'Sleep', action: () => shutdown('sleep') },
        { label: 'Restart…', action: () => shutdown('restart') },
        { label: 'Shut Down…', action: confirmShutdown },
        { sep: true },
        { label: 'Log Out Finn…', key: '⇧⌥Q', action: () => shutdown('logout') },
      ],
    },
    {
      id: 'app',
      label: appName,
      bold: true,
      items: () => [
        { label: `About ${appName}`, action: () => openApp('about') },
        { sep: true },
        { label: 'Preferences…', action: () => openApp('preferences') },
        { sep: true },
        { label: `Quit ${appName}`, key: '⌥Q', disabled: !app, action: () => app && quitApp(app) },
      ],
    },
    {
      id: 'file',
      label: 'File',
      items: () => [
        {
          label: 'New Window',
          key: '⌥N',
          action: () => {
            const a = focusedApp() ?? 'finder';
            if (APPS[a].singleton) openApp(a);
            else openApp(a, a === 'finder' ? { path: '/Desktop' } : undefined);
          },
        },
        {
          label: 'New Folder',
          action: () => {
            makeFolder('/Desktop');
            play('drop-a', { gain: 0.6 });
          },
        },
        { label: 'New Text Document', action: () => openApp('textedit') },
        { sep: true },
        { label: 'Close Window', key: '⌥W', disabled: !focusedWin(), action: () => focusedWin() && close(focusedWin()!.id) },
      ],
    },
    {
      id: 'edit',
      label: 'Edit',
      items: () => [
        { label: 'Undo', key: '⌘Z', action: () => document.execCommand('undo') },
        { label: 'Redo', key: '⇧⌘Z', action: () => document.execCommand('redo') },
        { sep: true },
        { label: 'Cut', key: '⌘X', action: () => document.execCommand('cut') },
        { label: 'Copy', key: '⌘C', action: () => document.execCommand('copy') },
        { label: 'Paste', key: '⌘V', disabled: true },
        { label: 'Select All', key: '⌘A', action: () => document.execCommand('selectAll') },
      ],
    },
    {
      id: 'view',
      label: 'View',
      items: () => [
        {
          label: document.fullscreenElement ? 'Exit Full Screen' : 'Enter Full Screen',
          key: 'F11',
          action: () => {
            if (document.fullscreenElement) void document.exitFullscreen();
            else void document.documentElement.requestFullscreen?.().catch(() => undefined);
          },
        },
        { sep: true },
        {
          label: 'Dock Magnification',
          checked: getState().settings.magnify,
          action: () => updateSettings({ magnify: !getState().settings.magnify }),
        },
        {
          label: 'Interface Sounds',
          checked: getState().settings.uiSounds,
          action: () => updateSettings({ uiSounds: !getState().settings.uiSounds }),
        },
      ],
    },
    {
      id: 'go',
      label: 'Go',
      items: () => [
        { label: 'Desktop', action: () => openFile('/Desktop') },
        { label: 'Documents', action: () => openFile('/Documents') },
        { label: 'Pictures', action: () => openFile('/Pictures') },
        { label: 'Applications', action: () => openApp('finder', { path: '/Applications' }, 'Applications') },
        { label: 'Trash', action: () => openApp('finder', { path: '/Trash' }, 'Trash') },
      ],
    },
    {
      id: 'window',
      label: 'Window',
      items: () => {
        const s = getState();
        const f = focusedWin();
        return [
          { label: 'Minimize', key: '⌥M', disabled: !f, action: () => f && minimize(f.id) },
          { label: 'Zoom', disabled: !f, action: () => f && toggleMaximize(f.id) },
          { sep: true },
          ...(s.windows.length
            ? s.windows.map<Item>((w) => ({
                label: w.title,
                checked: w.id === s.focused,
                action: () => (w.minimized ? openApp(w.app) : focus(w.id)),
              }))
            : [{ label: 'No Windows', disabled: true }]),
        ];
      },
    },
    {
      id: 'help',
      label: 'Help',
      items: () => [
        { label: 'FinnOS Help', action: () => openFile('/Desktop/Welcome.txt') },
        { label: 'Watch Finnerty on Twitch', action: () => openApp('twitch') },
        { label: 'Finnerty on YouTube', action: () => window.open(LINKS.youtube, '_blank', 'noreferrer') },
      ],
    },
  ];
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(id);
  }, []);
  return (
    <button type="button" className="mb__status" onClick={() => openApp('calendar')}>
      {now.toLocaleDateString('en-GB', { weekday: 'short' })}{' '}
      {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
    </button>
  );
}

function Volume() {
  const [open, setOpen] = useState(false);
  const volume = useOS((s) => s.settings.volume);
  const muted = sfx().state.muted;
  const [m, setM] = useState(muted);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('pointerdown', off);
    return () => document.removeEventListener('pointerdown', off);
  }, [open]);
  return (
    <div className="mb__vol" ref={ref}>
      <button type="button" className="mb__status" aria-label="Volume" onClick={() => setOpen(!open)}>
        {m ? <SpeakerSlash size={15} weight="fill" /> : <SpeakerHigh size={15} weight="fill" />}
      </button>
      {open && (
        <div className="menu menu--vol">
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(volume * 100)}
            aria-label="Volume"
            className="aqua-range aqua-range--vertical"
            onChange={(e) => {
              const v = Number(e.target.value) / 100;
              updateSettings({ volume: v });
              sfx().setVolume(v);
            }}
            onPointerUp={() => sfx().play('tick')}
          />
          <label className="menu__check">
            <input
              type="checkbox"
              checked={m}
              onChange={(e) => {
                sfx().setMuted(e.target.checked);
                setM(e.target.checked);
              }}
            />
            Mute
          </label>
        </div>
      )}
    </div>
  );
}

export function MenuBar() {
  const menus = useMenus();
  const [open, setOpen] = useState<string | null>(null);
  const live = useOS((s) => s.live);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const off = (e: PointerEvent) => !bar.current?.contains(e.target as Node) && setOpen(null);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    document.addEventListener('pointerdown', off);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', off);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div className="menubar" ref={bar}>
      <nav className="mb__menus" aria-label="Menu bar">
        {menus.map((m) => (
          <div key={m.id} className="mb__menu">
            <button
              type="button"
              className="mb__title"
              data-bold={m.bold}
              data-open={open === m.id}
              aria-haspopup="menu"
              aria-expanded={open === m.id}
              onPointerDown={(e) => {
                e.preventDefault();
                setOpen(open === m.id ? null : m.id);
              }}
              onPointerEnter={() => open && open !== m.id && setOpen(m.id)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setOpen(open === m.id ? null : m.id)}
            >
              {m.label}
            </button>
            {open === m.id && (
              <div className="menu" role="menu">
                {m.items().map((it, i) =>
                  'sep' in it ? (
                    <hr key={i} className="menu__sep" />
                  ) : (
                    <button
                      key={i}
                      type="button"
                      role="menuitem"
                      className="menu__item"
                      disabled={it.disabled}
                      onClick={() => {
                        setOpen(null);
                        it.action?.();
                      }}
                    >
                      <span className="menu__checkmark">{it.checked ? '✓' : ''}</span>
                      <span className="menu__label">{it.label}</span>
                      {it.key && <span className="menu__key">{it.key}</span>}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        ))}
      </nav>
      <div className="mb__right">
        <button
          type="button"
          className="mb__status mb__live"
          data-live={live === true}
          aria-label={live ? 'Finnerty is live on Twitch' : 'Twitch'}
          onClick={() => openApp('twitch')}
        >
          <TwitchLogo size={15} weight="fill" />
          {live && <span className="mb__live-text">LIVE</span>}
        </button>
        <Volume />
        <Clock />
        <button
          type="button"
          className="mb__status mb__spot"
          aria-label="Spotlight search"
          onClick={() => setState((s) => ({ spotlight: !s.spotlight }))}
        >
          <MagnifyingGlass size={14} weight="bold" />
        </button>
      </div>
    </div>
  );
}
