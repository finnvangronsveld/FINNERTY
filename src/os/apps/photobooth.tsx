'use client';
import { useEffect, useRef, useState } from 'react';
import { Camera, VideoCamera } from '@phosphor-icons/react';
import { join, uniqueName, writeFile } from '../fs';
import { notify } from '../store';
import { openFile, play } from '../wm';

const EFFECTS = [
  { name: 'Normal', css: 'none' },
  { name: 'Sepia', css: 'sepia(1) contrast(1.05)' },
  { name: 'Black & White', css: 'grayscale(1) contrast(1.25)' },
  { name: 'Glow', css: 'brightness(1.15) saturate(1.5) blur(0.6px)' },
  { name: 'Comic', css: 'contrast(1.9) saturate(2.2)' },
  { name: 'Thermal', css: 'invert(1) hue-rotate(180deg) saturate(3)' },
  { name: 'X-Ray', css: 'invert(1) grayscale(1) contrast(1.3)' },
  { name: 'Pop Art', css: 'saturate(3.5) hue-rotate(90deg) contrast(1.3)' },
  { name: 'Twitch', css: 'sepia(1) hue-rotate(215deg) saturate(3.5)' },
];

/** Webcam fun. Nothing is uploaded: photos are saved to Pictures in this browser only. */
export function PhotoBooth() {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [on, setOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [effect, setEffect] = useState(0);
  const [grid, setGrid] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const [shots, setShots] = useState<{ path: string; src: string }[]>([]);

  const stop = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };
  useEffect(() => stop, []);

  // Attach the stream once the <video> exists (and to the effect thumbnails).
  useEffect(() => {
    if (!on || !stream.current) return;
    document.querySelectorAll<HTMLVideoElement>('.pb__live').forEach((v) => {
      v.srcObject = stream.current;
      void v.play().catch(() => undefined);
    });
  }, [on, grid]);

  const start = async () => {
    setError(null);
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false });
      setOn(true);
      play('screen-on');
    } catch {
      setError('FinnOS couldn’t use your camera. Check that your browser allows it for this site.');
    }
  };

  const snap = () => {
    const v = video.current;
    if (!v) return;
    let n = 3;
    setCount(n);
    const id = window.setInterval(() => {
      n -= 1;
      if (n > 0) {
        setCount(n);
        play('tick');
        return;
      }
      clearInterval(id);
      setCount(null);
      setFlash(true);
      play('drop-a');
      play('screen-on', { gain: 0.6, delay: 0.05 });
      window.setTimeout(() => setFlash(false), 400);
      const w = 720;
      const h = Math.round((v.videoHeight / v.videoWidth) * w) || 405;
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d')!;
      ctx.filter = EFFECTS[effect].css;
      ctx.translate(w, 0);
      ctx.scale(-1, 1); // mirror, like the preview
      ctx.drawImage(v, 0, 0, w, h);
      const src = c.toDataURL('image/jpeg', 0.82);
      const name = uniqueName('/Pictures', 'Photo Booth.jpg');
      const path = writeFile(join('/Pictures', name), src, 'image');
      if (path) {
        setShots((s) => [{ path, src }, ...s].slice(0, 12));
        notify('Photo saved', `${name} is in Pictures.`, 'photobooth');
      }
    }, 800);
  };

  return (
    <div className="pb">
      <div className="pb__stage">
        {!on ? (
          <div className="pb__off">
            <VideoCamera size={46} weight="duotone" />
            <p>Photo Booth uses your camera. Your photos stay on this computer.</p>
            <button type="button" className="gel gel--blue" onClick={() => void start()}>
              Turn On Camera
            </button>
            {error && <p className="pb__error">{error}</p>}
          </div>
        ) : grid ? (
          <div className="pb__grid">
            {EFFECTS.map((e, i) => (
              <button
                key={e.name}
                type="button"
                className="pb__cell"
                data-on={i === effect}
                onClick={() => {
                  setEffect(i);
                  setGrid(false);
                }}
              >
                <video className="pb__live" muted playsInline style={{ filter: e.css }} />
                <span>{e.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <>
            <video ref={video} className="pb__live pb__main" muted playsInline style={{ filter: EFFECTS[effect].css }} />
            {count !== null && <span className="pb__count">{count}</span>}
          </>
        )}
        {flash && <span className="pb__flash" aria-hidden />}
      </div>
      <div className="pb__bar">
        <button type="button" className="gel" disabled={!on} onClick={() => setGrid(!grid)}>
          {grid ? 'Back' : `Effects: ${EFFECTS[effect].name}`}
        </button>
        <button type="button" className="pb__shutter" disabled={!on || grid || count !== null} onClick={snap} aria-label="Take a photo">
          <Camera size={22} weight="fill" />
        </button>
        <div className="pb__strip">
          {shots.map((s) => (
            <button key={s.path} type="button" className="pb__thumb" onClick={() => openFile(s.path)} aria-label="Open photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.src} alt="" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
