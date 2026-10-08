'use client';
import { useDesk } from './desk-provider';
import { Keyboard } from './keyboard';
import { MonitorOS } from './monitor-os';
import { Phone } from './phone';

/** Finn's desk, seen from his chair: monitor, phone on a stand, keyboard, neon on the wall. */
export function Room() {
  const { awake } = useDesk();
  return (
    <div className="room" id="top" data-awake={awake}>
      <div className="room__wall" aria-hidden>
        <span className="room__led" />
        <span className="neon">finnerty</span>
      </div>
      <div className="room__desk" aria-hidden />

      <div className="monitor">
        <div className="monitor__frame">
          <div className="monitor__screen">
            <MonitorOS />
          </div>
          <span className="monitor__logo" aria-hidden />
          <span className="monitor__sleep-led" aria-hidden />
        </div>
        <span className="monitor__neck" aria-hidden />
        <span className="monitor__foot" aria-hidden />
      </div>

      <div className="phone-stand">
        <Phone />
        <span className="phone-stand__base" aria-hidden />
      </div>

      <div className="keyboard-wrap">
        <Keyboard />
      </div>
    </div>
  );
}
