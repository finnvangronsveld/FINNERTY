'use client';
import { useRef, useState } from 'react';
import { Trash as TrashIcon } from '@phosphor-icons/react';
import { AppIcon } from '@/components/app-icon';
import { sfx } from '@/lib/sfx';
import { APPS, AppId, DOCK_APPS } from './apps';
import { useFsVersion, list } from './fs';
import { getState, useOS } from './store';
import { focus, openApp, play, restore } from './wm';

export function Dock() {
  const windows = useOS((s) => s.windows);
  const settings = useOS((s) => s.settings);
  useFsVersion();
  const trashFull = list('/Trash').length > 0;
  const bar = useRef<HTMLDivElement>(null);
  const [bouncing, setBouncing] = useState<string | null>(null);

  const running = new Set(windows.map((w) => w.app));
  const extra = [...running].filter((a) => !DOCK_APPS.includes(a));
  const items: AppId[] = [...DOCK_APPS, ...extra];

  // Magnification: icons near the pointer grow, like the real thing.
  const onMove = (e: React.PointerEvent) => {
    if (!settings.magnify || e.pointerType !== 'mouse') return;
    bar.current?.querySelectorAll<HTMLElement>('.dock__icon').forEach((el) => {
      const r = el.getBoundingClientRect();
      const d = Math.abs(e.clientX - (r.left + r.width / 2));
      const s = 1 + 0.75 * Math.max(0, 1 - d / 150) ** 2;
      el.style.setProperty('--mag', s.toFixed(3));
    });
  };
  const onLeave = () =>
    bar.current?.querySelectorAll<HTMLElement>('.dock__icon').forEach((el) => el.style.setProperty('--mag', '1'));

  const launch = (app: AppId) => {
    const wins = getState().windows.filter((w) => w.app === app);
    if (wins.length) {
      const visible = wins.filter((w) => !w.minimized).sort((a, b) => b.z - a.z);
      if (visible.length) focus(visible[0].id);
      else restore(wins[wins.length - 1].id);
      return;
    }
    setBouncing(app);
    window.setTimeout(() => setBouncing(null), 1000);
    window.setTimeout(() => openApp(app), 280);
  };

  return (
    <div className="dock" style={{ '--dock': `${settings.dockSize}px` } as React.CSSProperties}>
      <div className="dock__bar" ref={bar} onPointerMove={onMove} onPointerLeave={onLeave} data-sfx="own">
        <span className="dock__glass" aria-hidden />
        {items.map((app) => {
          const meta = APPS[app];
          return (
            <button
              key={app}
              type="button"
              className="dock__item"
              data-dock={app}
              data-bounce={bouncing === app}
              aria-label={meta.name}
              onPointerEnter={(e) => e.pointerType === 'mouse' && settings.uiSounds && sfx().hover()}
              onClick={() => launch(app)}
            >
              <span className="dock__icon">
                <AppIcon Icon={meta.Icon} from={meta.from} to={meta.to} />
              </span>
              <span className="dock__label">{meta.name}</span>
              {running.has(app) && <span className="dock__light" aria-hidden />}
            </button>
          );
        })}
        <span className="dock__divider" aria-hidden />
        <button
          type="button"
          className="dock__item"
          data-dock="trash"
          aria-label={trashFull ? 'Trash, has items' : 'Trash'}
          onClick={() => {
            play('trash', { gain: 0.6 });
            openApp('finder', { path: '/Trash' }, 'Trash');
          }}
        >
          <span className="dock__icon">
            <span className="trashcan" data-full={trashFull}>
              <TrashIcon weight="duotone" />
            </span>
          </span>
          <span className="dock__label">Trash</span>
        </button>
      </div>
    </div>
  );
}
