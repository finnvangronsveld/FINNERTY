'use client';
import { useEffect, useRef } from 'react';
import { Play, Stop, ArrowCounterClockwise, Eraser } from '@phosphor-icons/react';
import { engine, TRACKS } from '@/audio/engine';
import type { VoiceId } from '@/audio/instruments';
import { Knob, Screws, VuMeter } from './hardware';
import { useEngine } from './use-engine';

const PADS: { id: VoiceId; label: string; key: string }[] = [
  { id: 'kick', label: 'Kick', key: '1' },
  { id: 'clap', label: 'Clap', key: '2' },
  { id: 'snare', label: 'Snare', key: '3' },
  { id: 'rim', label: 'Rim', key: '4' },
  { id: 'hat', label: 'Hat', key: 'q' },
  { id: 'openhat', label: 'Open hat', key: 'w' },
  { id: 'tom', label: 'Tom', key: 'e' },
  { id: 'crash', label: 'Crash', key: 'r' },
  { id: 'revbass', label: 'Rev bass', key: 'a' },
  { id: 'screech', label: 'Screech', key: 's' },
  { id: 'stab', label: 'Stab', key: 'd' },
  { id: 'hey', label: 'Hey', key: 'f' },
  { id: 'horn', label: 'Horn', key: 'z' },
  { id: 'riser', label: 'Riser', key: 'x' },
  { id: 'subdrop', label: 'Sub drop', key: 'c' },
  { id: 'zap', label: 'Zap', key: 'v' },
];

function Pads() {
  const refs = useRef(new Map<VoiceId, HTMLButtonElement>());

  useEffect(() => {
    const timers = new Map<VoiceId, number>();
    const off = engine().onHit((id) => {
      const el = refs.current.get(id);
      if (!el) return;
      el.dataset.hit = 'false';
      void el.offsetWidth; // restart the flash animation
      el.dataset.hit = 'true';
      window.clearTimeout(timers.get(id));
      timers.set(id, window.setTimeout(() => (el.dataset.hit = 'false'), 260));
    });
    const keydown = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      const pad = PADS.find((p) => p.key === e.key.toLowerCase());
      if (!pad || !engine().ctx) return;
      engine().hit(pad.id);
    };
    window.addEventListener('keydown', keydown);
    return () => {
      off();
      window.removeEventListener('keydown', keydown);
    };
  }, []);

  return (
    <div className="pads" data-sfx="own" role="group" aria-label="Drum pads">
      {PADS.map((p) => (
        <button
          key={p.id}
          ref={(el) => {
            if (el) refs.current.set(p.id, el);
          }}
          type="button"
          className="pad"
          onPointerDown={(e) => {
            e.preventDefault();
            engine().hit(p.id);
          }}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
              e.preventDefault();
              engine().hit(p.id);
            }
          }}
        >
          <span className="pad__label">{p.label}</span>
          <kbd className="pad__key">{p.key.toUpperCase()}</kbd>
        </button>
      ))}
    </div>
  );
}

function Sequencer() {
  const pattern = useEngine((s) => s.pattern);
  const step = useEngine((s) => s.step);
  const playing = useEngine((s) => s.playing);
  const bpm = useEngine((s) => s.bpm);

  return (
    <div className="seq" data-sfx="own">
      <div className="seq__head">
        <div className="readout" aria-live="off">
          <span className="readout__ghost" aria-hidden>
            888
          </span>
          <span className="readout__value">{bpm}</span>
          <span className="readout__unit">BPM</span>
        </div>
        <Knob
          label="Tempo"
          value={(bpm - 120) / 70}
          steps={70}
          valueText={`${bpm} beats per minute`}
          onChange={(v) => engine().setBpm(120 + v * 70)}
        />
        <div className="seq__transport">
          <button
            type="button"
            className="key key--start"
            aria-pressed={playing}
            onClick={() => {
              const e = engine();
              e.key('down', 1.3);
              if (playing) e.stop();
              else e.play();
            }}
          >
            {playing ? <Stop size={16} weight="fill" aria-hidden /> : <Play size={16} weight="fill" aria-hidden />}
            {playing ? 'Stop' : 'Play'}
          </button>
          <button
            type="button"
            className="key key--square"
            aria-label="Reset pattern"
            onClick={() => {
              engine().key('down');
              engine().resetPattern();
            }}
          >
            <ArrowCounterClockwise size={16} weight="bold" aria-hidden />
          </button>
          <button
            type="button"
            className="key key--square"
            aria-label="Clear pattern"
            onClick={() => {
              engine().key('down');
              engine().clearPattern();
            }}
          >
            <Eraser size={16} weight="bold" aria-hidden />
          </button>
        </div>
      </div>
      <div className="seq__grid" role="group" aria-label="Step sequencer">
        {TRACKS.map((tr, ti) => (
          <div className="seq__row" role="group" aria-label={tr.label} key={tr.id}>
            <span className="seq__name silk" aria-hidden>
              {tr.label}
            </span>
            {Array.from({ length: 16 }, (_, si) => {
              const on = pattern[ti]?.[si] ?? false;
              return (
                <button
                  key={si}
                  type="button"
                  aria-pressed={on}
                  aria-label={`${tr.label} step ${si + 1}`}
                  className="step"
                  data-on={on}
                  data-beat={si % 4 === 0}
                  data-current={playing && step === si}
                  onClick={() => {
                    engine().key(on ? 'up' : 'down', 0.7);
                    engine().toggleStep(ti, si);
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DrumMachine() {
  return (
    <section id="pads" className="section section--pads">
      <div className="section__intro">
        <h2 className="h2">Make some noise.</h2>
        <p className="body">
          Sixteen pads and a step sequencer, all synthesized live in your browser. Use the keys on your
          keyboard or tap the pads.
        </p>
      </div>
      <div className="machine-stage">
        <div className="machine metal">
          <Screws />
          <div className="machine__left">
            <Pads />
          </div>
          <div className="machine__right">
            <Sequencer />
            <div className="machine__meter">
              <VuMeter label="OUT" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
