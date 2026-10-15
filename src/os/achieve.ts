'use client';
import { byCode } from '@/lib/achievements';
import { getState, notify } from './store';
import { play } from './wm';

/** Shows a Growl for every achievement the server says is new. */
export function celebrate(codes: string[] | undefined) {
  (codes ?? []).forEach((c, i) => {
    const a = byCode[c];
    if (!a) return;
    window.setTimeout(() => {
      play('notify');
      notify(`Achievement unlocked: ${a.name}`, a.desc, 'gamecenter');
    }, 600 + i * 900);
  });
}

/** Reports an easter-egg achievement. Only once per browser, only when logged in. */
export function claim(code: string) {
  if (!getState().player) return;
  const key = `finnos:claimed:${getState().player!.id}:${code}`;
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
  } catch {
    /* ignore */
  }
  fetch('/api/achievements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) })
    .then((r) => r.json())
    .then((d: { achievements?: string[] }) => celebrate(d.achievements))
    .catch(() => undefined);
}

/** Counts distinct apps opened; ten unlocks Explorer. */
export function trackApp(app: string) {
  try {
    const seen = new Set<string>(JSON.parse(localStorage.getItem('finnos:apps-opened') ?? '[]'));
    seen.add(app);
    localStorage.setItem('finnos:apps-opened', JSON.stringify([...seen]));
    if (seen.size >= 10) claim('explorer');
  } catch {
    /* ignore */
  }
}
