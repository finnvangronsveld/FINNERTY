'use client';
import { useState } from 'react';
import { MagnifyingGlassMinus, MagnifyingGlassPlus, PaintBrush } from '@phosphor-icons/react';
import type { AppProps } from '../apps';
import { getNode, useFsVersion } from '../fs';
import { useOS } from '../store';
import { openApp } from '../wm';

export function Preview({ win }: AppProps) {
  useFsVersion();
  const avatar = useOS((s) => s.avatar);
  const [zoom, setZoom] = useState(1);
  const path = win.data?.path;
  const node = path ? getNode(path) : null;
  const src = node?.content === 'avatar' ? avatar : node?.content;
  const editable = !!src && src.startsWith('data:');

  return (
    <div className="preview">
      <div className="toolbar">
        <div className="seg">
          <button type="button" className="seg__btn" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(0.25, z / 1.25))}>
            <MagnifyingGlassMinus size={14} weight="bold" />
          </button>
          <button type="button" className="seg__btn" onClick={() => setZoom(1)}>
            {Math.round(zoom * 100)}%
          </button>
          <button type="button" className="seg__btn" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(4, z * 1.25))}>
            <MagnifyingGlassPlus size={14} weight="bold" />
          </button>
        </div>
        {editable && (
          <button type="button" className="tb-btn" onClick={() => openApp('sketch', { path: path! })}>
            <PaintBrush size={14} weight="fill" /> Edit in Sketch
          </button>
        )}
      </div>
      <div className="preview__stage">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={node?.name ?? ''} style={{ transform: `scale(${zoom})` }} draggable={false} />
        ) : (
          <p className="files__empty">This picture can’t be shown.</p>
        )}
      </div>
    </div>
  );
}
