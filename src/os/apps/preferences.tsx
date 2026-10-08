'use client';
import { useState } from 'react';
import { Desktop as DesktopIcon, DotsThreeOutline as DockIcon, GearSix, SpeakerHigh } from '@phosphor-icons/react';
import { sfx } from '@/lib/sfx';
import type { AppProps } from '../apps';
import { resetFs } from '../fs';
import { setState, updateSettings, useOS, Wallpaper } from '../store';
import { play } from '../wm';

const WALLPAPERS: { id: Wallpaper; name: string }[] = [
  { id: 'aurora', name: 'Aurora' },
  { id: 'neon', name: 'Neon Night' },
  { id: 'ocean', name: 'Deep Ocean' },
  { id: 'sunset', name: 'Sunset' },
  { id: 'tiger', name: 'Amber' },
  { id: 'graphite', name: 'Graphite' },
];

const PANES = [
  { id: 'desktop', label: 'Desktop', Icon: DesktopIcon },
  { id: 'dock', label: 'Dock', Icon: DockIcon },
  { id: 'sound', label: 'Sound', Icon: SpeakerHigh },
  { id: 'general', label: 'General', Icon: GearSix },
] as const;

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="aqua-check">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          play('toggle', { gain: 0.6 });
          onChange(e.target.checked);
        }}
      />
      <span className="aqua-check__box" aria-hidden />
      {label}
    </label>
  );
}

export function Preferences({ win }: AppProps) {
  const settings = useOS((s) => s.settings);
  const [pane, setPane] = useState<(typeof PANES)[number]['id']>((win.data?.pane as 'desktop') ?? 'desktop');

  return (
    <div className="prefs">
      <div className="prefs__tabs" role="tablist">
        {PANES.map((p) => (
          <button key={p.id} type="button" role="tab" aria-selected={pane === p.id} className="prefs__tab" onClick={() => setPane(p.id)}>
            <p.Icon size={26} weight="duotone" />
            {p.label}
          </button>
        ))}
      </div>
      <div className="prefs__body">
        {pane === 'desktop' && (
          <>
            <p className="prefs__head">Choose a desktop picture</p>
            <div className="walls">
              {WALLPAPERS.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  className="walls__item"
                  data-on={settings.wallpaper === w.id}
                  onClick={() => {
                    updateSettings({ wallpaper: w.id });
                    play('tick');
                  }}
                >
                  <span className="walls__thumb" data-wallpaper={w.id} />
                  {w.name}
                </button>
              ))}
            </div>
          </>
        )}
        {pane === 'dock' && (
          <div className="prefs__form">
            <label className="prefs__row">
              <span>Size</span>
              <input
                type="range"
                min={40}
                max={72}
                value={settings.dockSize}
                className="aqua-range"
                onChange={(e) => updateSettings({ dockSize: Number(e.target.value) })}
                onPointerUp={() => play('tick')}
              />
            </label>
            <Check label="Magnification" checked={settings.magnify} onChange={(v) => updateSettings({ magnify: v })} />
          </div>
        )}
        {pane === 'sound' && (
          <div className="prefs__form">
            <label className="prefs__row">
              <span>Volume</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.volume * 100)}
                className="aqua-range"
                onChange={(e) => {
                  const v = Number(e.target.value) / 100;
                  updateSettings({ volume: v });
                  sfx().setVolume(v);
                }}
                onPointerUp={() => sfx().play('tick')}
              />
            </label>
            <Check label="Play interface sounds" checked={settings.uiSounds} onChange={(v) => updateSettings({ uiSounds: v })} />
            <p className="prefs__note">Sounds by Kenney (kenney.nl), public domain.</p>
          </div>
        )}
        {pane === 'general' && (
          <div className="prefs__form">
            <p className="prefs__note">Your files, notes, drawings and settings are saved in this browser only.</p>
            <button
              type="button"
              className="gel"
              onClick={() =>
                setState({
                  dialog: {
                    title: 'Restore the default files?',
                    text: 'Everything you made in FinnOS will be erased. This can’t be undone.',
                    buttons: [
                      { label: 'Cancel' },
                      {
                        label: 'Restore',
                        primary: true,
                        action: () => {
                          resetFs();
                          try {
                            localStorage.removeItem('finnos:desktop-pos');
                          } catch {
                            /* ignore */
                          }
                          play('trash');
                        },
                      },
                    ],
                  },
                })
              }
            >
              Restore Default Files…
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
