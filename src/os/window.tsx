'use client';
import { useEffect, useRef, useState } from 'react';
import { APPS } from './apps';
import { useOS, WinState } from './store';
import { close, focus, isCompact, minimize, moveWindow, resizeWindow, toggleMaximize } from './wm';

type Edge = 'r' | 'b' | 'rb' | 'l' | 'lb';

/** Where a window should shrink to: its app's icon in the Dock. */
function dockTarget(app: string, el: HTMLElement | null) {
  const icon = document.querySelector<HTMLElement>(`[data-dock="${app}"]`);
  if (!icon || !el) return { x: 0, y: 300 };
  const a = icon.getBoundingClientRect();
  const b = el.getBoundingClientRect();
  return { x: a.left + a.width / 2 - (b.left + b.width / 2), y: a.top + a.height / 2 - (b.top + b.height / 2) };
}

export function Window({ win }: { win: WinState }) {
  const meta = APPS[win.app];
  const focused = useOS((s) => s.focused === win.id);
  const ref = useRef<HTMLDivElement>(null);
  const [anim, setAnim] = useState<'opening' | 'minimizing' | 'restoring' | null>('opening');
  const wasMin = useRef(win.minimized);

  // Animate back out of the Dock when restored.
  useEffect(() => {
    if (wasMin.current && !win.minimized) {
      const t = dockTarget(win.app, ref.current);
      ref.current?.style.setProperty('--tx', `${t.x}px`);
      ref.current?.style.setProperty('--ty', `${t.y}px`);
      setAnim('restoring');
    }
    wasMin.current = win.minimized;
  }, [win.minimized, win.app]);

  const doMinimize = () => {
    const t = dockTarget(win.app, ref.current);
    ref.current?.style.setProperty('--tx', `${t.x}px`);
    ref.current?.style.setProperty('--ty', `${t.y}px`);
    setAnim('minimizing');
    window.setTimeout(() => minimize(win.id), 330);
  };

  const startDrag = (e: React.PointerEvent) => {
    if (e.button !== 0 || isCompact() || (e.target as HTMLElement).closest('button, input')) return;
    const sx = e.clientX;
    const sy = e.clientY;
    // Dragging a zoomed window restores its old size under the pointer.
    const prev = win.maximized ? win.prev : undefined;
    let restored = !prev;
    const ox = prev ? e.clientX - prev.w / 2 : win.x;
    const oy = win.y;
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      if (!restored && prev) {
        resizeWindow(win.id, prev.w, prev.h);
        restored = true;
      }
      moveWindow(win.id, ox + ev.clientX - sx, Math.max(0, oy + ev.clientY - sy));
    };
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
  };

  const startResize = (edge: Edge) => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const sx = e.clientX;
    const sy = e.clientY;
    const { x: ox, w: ow, h: oh } = win;
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      let w = ow;
      let h = oh;
      if (edge.includes('r')) w = ow + dx;
      if (edge.includes('b')) h = oh + dy;
      if (edge.includes('l')) {
        w = ow - dx;
        const min = meta.minSize?.[0] ?? 280;
        moveWindow(win.id, ox + Math.min(dx, ow - min), win.y);
      }
      resizeWindow(win.id, w, h);
    };
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
  };

  const resizable = meta.resizable !== false;

  return (
    <div
      ref={ref}
      className="win"
      data-focused={focused}
      data-dark={!!meta.dark}
      data-anim={anim ?? undefined}
      data-max={win.maximized}
      data-min={win.minimized}
      role="dialog"
      aria-label={win.title}
      style={{ left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z }}
      onPointerDownCapture={() => focus(win.id)}
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget) setAnim(null);
      }}
    >
      <header className="win__bar" onPointerDown={startDrag} onDoubleClick={() => resizable && toggleMaximize(win.id)}>
        <div className="traffic">
          <button type="button" className="traffic__btn traffic__btn--close" aria-label="Close" onClick={() => close(win.id)}>
            <span aria-hidden>×</span>
          </button>
          <button type="button" className="traffic__btn traffic__btn--min" aria-label="Minimize" onClick={doMinimize}>
            <span aria-hidden>−</span>
          </button>
          <button
            type="button"
            className="traffic__btn traffic__btn--max"
            aria-label="Zoom"
            disabled={!resizable}
            onClick={() => toggleMaximize(win.id)}
          >
            <span aria-hidden>+</span>
          </button>
        </div>
        <span className="win__title">{win.title}</span>
      </header>
      <div className="win__content">
        <meta.Component win={win} />
      </div>
      {resizable && !win.maximized && (
        <>
          <span className="win__edge win__edge--r" onPointerDown={startResize('r')} />
          <span className="win__edge win__edge--l" onPointerDown={startResize('l')} />
          <span className="win__edge win__edge--b" onPointerDown={startResize('b')} />
          <span className="win__edge win__edge--lb" onPointerDown={startResize('lb')} />
          <span className="win__grip" onPointerDown={startResize('rb')} aria-hidden />
        </>
      )}
    </div>
  );
}
