'use client';
import { useSyncExternalStore } from 'react';
import { engine, EngineState } from '@/audio/engine';

const serverState: EngineState = {
  ready: false,
  muted: false,
  volume: 0.72,
  playing: false,
  step: -1,
  bpm: 150,
  pattern: [],
};

export function useEngine<T>(select: (s: EngineState) => T): T {
  return useSyncExternalStore(
    (cb) => engine().subscribe(cb),
    () => select(engine().state),
    () => select(serverState),
  );
}
