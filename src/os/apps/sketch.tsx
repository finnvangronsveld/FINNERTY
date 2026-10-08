'use client';
import { useEffect, useRef, useState } from 'react';
import { Eraser, FloppyDisk, PaintBrush, Trash } from '@phosphor-icons/react';
import type { AppProps } from '../apps';
import { getNode, join, uniqueName, writeFile } from '../fs';
import { notify } from '../store';
import { play } from '../wm';

const COLORS = ['#1d1d1f', '#ffffff', '#e8406e', '#ff8a1f', '#f6c90e', '#3bb54a', '#2a8cff', '#7c4dff', '#8b5a2b'];
const SIZES = [3, 7, 14, 26];

export function Sketch({ win }: AppProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [color, setColor] = useState(COLORS[7]);
  const [size, setSize] = useState(SIZES[1]);
  const [eraser, setEraser] = useState(false);
  const drawing = useRef<{ x: number; y: number } | null>(null);

  // Keep the drawing when the window is resized: copy the old pixels into the new canvas.
  useEffect(() => {
    const c = canvas.current;
    const w = wrap.current;
    if (!c || !w) return;
    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      const copy = document.createElement('canvas');
      copy.width = c.width;
      copy.height = c.height;
      copy.getContext('2d')?.drawImage(c, 0, 0);
      c.width = Math.max(1, w.clientWidth * dpr);
      c.height = Math.max(1, w.clientHeight * dpr);
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(copy, 0, 0);
    };
    fit();
    const path = win.data?.path;
    const src = path ? getNode(path)?.content : null;
    if (src && src.startsWith('data:')) {
      const img = new Image();
      img.onload = () => c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
      img.src = src;
    }
    const ro = new ResizeObserver(fit);
    ro.observe(w);
    return () => ro.disconnect();
  }, [win.data?.path]);

  const point = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    return { x: (e.clientX - r.left) * dpr, y: (e.clientY - r.top) * dpr };
  };

  const stroke = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const ctx = canvas.current!.getContext('2d')!;
    ctx.strokeStyle = eraser ? '#ffffff' : color;
    ctx.lineWidth = size * (window.devicePixelRatio || 1);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  };

  const save = () => {
    const c = canvas.current;
    if (!c) return;
    // Scale down before saving so pictures fit in browser storage.
    const out = document.createElement('canvas');
    const scale = Math.min(1, 900 / c.width);
    out.width = c.width * scale;
    out.height = c.height * scale;
    out.getContext('2d')?.drawImage(c, 0, 0, out.width, out.height);
    const name = uniqueName('/Pictures', 'Sketch.jpg');
    const p = writeFile(join('/Pictures', name), out.toDataURL('image/jpeg', 0.85), 'image');
    if (p) {
      play('drop-a', { gain: 0.6 });
      notify('Saved to Pictures', name, 'sketch');
    }
  };

  return (
    <div className="sketch">
      <div className="toolbar">
        <div className="sketch__colors" role="radiogroup" aria-label="Colour">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={!eraser && color === c}
              aria-label={c}
              className="swatch"
              style={{ background: c }}
              onClick={() => {
                setColor(c);
                setEraser(false);
              }}
            />
          ))}
        </div>
        <div className="seg">
          {SIZES.map((s) => (
            <button key={s} type="button" className="seg__btn" data-on={size === s} aria-label={`Brush size ${s}`} onClick={() => setSize(s)}>
              <span className="brushdot" style={{ width: Math.min(14, s), height: Math.min(14, s) }} />
            </button>
          ))}
        </div>
        <div className="seg">
          <button type="button" className="seg__btn" data-on={!eraser} aria-label="Brush" onClick={() => setEraser(false)}>
            <PaintBrush size={14} weight="fill" />
          </button>
          <button type="button" className="seg__btn" data-on={eraser} aria-label="Eraser" onClick={() => setEraser(true)}>
            <Eraser size={14} weight="fill" />
          </button>
        </div>
        <button
          type="button"
          className="tb-icon"
          aria-label="Clear"
          onClick={() => {
            const c = canvas.current!;
            const ctx = c.getContext('2d')!;
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, c.width, c.height);
            play('trash', { gain: 0.5 });
          }}
        >
          <Trash size={14} weight="fill" />
        </button>
        <button type="button" className="tb-btn" onClick={save}>
          <FloppyDisk size={14} weight="fill" /> Save
        </button>
      </div>
      <div className="sketch__paper" ref={wrap}>
        <canvas
          ref={canvas}
          className="sketch__canvas"
          aria-label="Drawing canvas"
          onPointerDown={(e) => {
            (e.target as Element).setPointerCapture(e.pointerId);
            const p = point(e);
            drawing.current = p;
            stroke(p, { x: p.x + 0.1, y: p.y });
          }}
          onPointerMove={(e) => {
            if (!drawing.current) return;
            const p = point(e);
            stroke(drawing.current, p);
            drawing.current = p;
          }}
          onPointerUp={() => (drawing.current = null)}
        />
      </div>
    </div>
  );
}
