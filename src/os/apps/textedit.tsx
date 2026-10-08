'use client';
import { useEffect, useRef, useState } from 'react';
import { FloppyDisk, TextAa } from '@phosphor-icons/react';
import type { AppProps } from '../apps';
import { basename, getNode, join, uniqueName, writeFile } from '../fs';
import { notify } from '../store';
import { play, setData, setTitle } from '../wm';

export function TextEdit({ win }: AppProps) {
  const path = win.data?.path;
  const [text, setText] = useState(() => (path ? getNode(path)?.content ?? '' : ''));
  const [dirty, setDirty] = useState(false);
  const [size, setSize] = useState(15);
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTitle(win.id, `${path ? basename(path) : 'Untitled'}${dirty ? ' (edited)' : ''}`);
  }, [win.id, path, dirty]);

  useEffect(() => {
    area.current?.focus();
  }, []);

  const save = () => {
    let p = path;
    if (!p) {
      p = join('/Documents', uniqueName('/Documents', 'Untitled.txt'));
    }
    const saved = writeFile(p, text);
    if (saved) {
      if (!path) setData(win.id, { path: saved });
      setDirty(false);
      play('drop-a', { gain: 0.5 });
      if (!path) notify('Saved', `${basename(saved)} is in Documents.`, 'textedit');
    }
  };

  return (
    <div className="textedit">
      <div className="toolbar">
        <button type="button" className="tb-btn" onClick={save}>
          <FloppyDisk size={14} weight="fill" /> Save
        </button>
        <div className="seg">
          <button type="button" className="seg__btn" aria-label="Smaller text" onClick={() => setSize((s) => Math.max(11, s - 1))}>
            <TextAa size={12} />
          </button>
          <button type="button" className="seg__btn" aria-label="Larger text" onClick={() => setSize((s) => Math.min(28, s + 1))}>
            <TextAa size={16} />
          </button>
        </div>
        <span className="toolbar__hint">{text.trim() ? text.trim().split(/\s+/).length : 0} words</span>
      </div>
      <textarea
        ref={area}
        className="textedit__area"
        style={{ fontSize: size }}
        value={text}
        spellCheck
        aria-label="Document"
        onChange={(e) => {
          setText(e.target.value);
          setDirty(true);
        }}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            save();
          }
        }}
      />
    </div>
  );
}
