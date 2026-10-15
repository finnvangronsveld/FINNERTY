'use client';
import { useEffect, useRef, useState } from 'react';
import { Cloud, CloudRain, CloudSnow, CloudSun, Lightning, Moon, Sun, TwitchLogo } from '@phosphor-icons/react';
import { AppIcon } from '@/components/app-icon';
import { APPS } from './apps';
import { setState, useOS } from './store';
import { openApp, toggleDashboard, toggleExpose } from './wm';

/* ───────────────────────── Exposé backdrop ───────────────────────── */

export function ExposeBackdrop() {
  const expose = useOS((s) => s.expose);
  if (!expose) return null;
  return <button type="button" className="expose-backdrop" aria-label="Leave Exposé" onClick={() => toggleExpose(false)} />;
}

/* ───────────────────────── App switcher ───────────────────────── */

export function Switcher() {
  const sw = useOS((s) => s.switcher);
  if (!sw) return null;
  const current = sw.apps[sw.index % sw.apps.length];
  return (
    <div className="switcher" role="listbox" aria-label="Switch apps">
      <div className="switcher__row">
        {sw.apps.map((a, i) => (
          <span key={a} className="switcher__item" data-on={i === sw.index % sw.apps.length} role="option" aria-selected={i === sw.index % sw.apps.length}>
            <AppIcon Icon={APPS[a].Icon} from={APPS[a].from} to={APPS[a].to} size="lg" />
          </span>
        ))}
      </div>
      <p className="switcher__name">{APPS[current].name}</p>
    </div>
  );
}

/* ───────────────────────── Dashboard ───────────────────────── */

type Weather = { place: string; now: { temp: number; code: number; day: boolean }; days: { date: string; code: number; max: number; min: number }[] };

function WeatherIcon({ code, day = true, size = 22 }: { code: number; day?: boolean; size?: number }) {
  if (code === 0) return day ? <Sun size={size} weight="fill" /> : <Moon size={size} weight="fill" />;
  if (code <= 3) return <CloudSun size={size} weight="fill" />;
  if (code <= 48) return <Cloud size={size} weight="fill" />;
  if (code <= 67 || (code >= 80 && code <= 82)) return <CloudRain size={size} weight="fill" />;
  if (code <= 77 || code === 85 || code === 86) return <CloudSnow size={size} weight="fill" />;
  return <Lightning size={size} weight="fill" />;
}

const describe = (code: number) =>
  code === 0 ? 'Clear' : code <= 3 ? 'Partly cloudy' : code <= 48 ? 'Cloudy' : code <= 67 ? 'Rain' : code <= 77 ? 'Snow' : code <= 82 ? 'Showers' : 'Storm';

function ClockWidget() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const h = (now.getHours() % 12) * 30 + now.getMinutes() * 0.5;
  const m = now.getMinutes() * 6;
  const s = now.getSeconds() * 6;
  return (
    <div className="widget widget--clock" aria-label={now.toLocaleTimeString('en-GB')}>
      <div className="clockface">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} className="clockface__tick" style={{ transform: `rotate(${i * 30}deg)` }} />
        ))}
        <span className="clockface__hand clockface__hand--h" style={{ transform: `rotate(${h}deg)` }} />
        <span className="clockface__hand clockface__hand--m" style={{ transform: `rotate(${m}deg)` }} />
        <span className="clockface__hand clockface__hand--s" style={{ transform: `rotate(${s}deg)` }} />
        <span className="clockface__pin" />
      </div>
      <span className="widget__caption">Brussels</span>
    </div>
  );
}

function WeatherWidget() {
  const [w, setW] = useState<Weather | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    fetch('/api/weather')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setW)
      .catch(() => setFailed(true));
  }, []);
  return (
    <div className="widget widget--weather" data-day={w?.now.day ?? true}>
      {!w ? (
        <p className="widget__muted">{failed ? 'Weather unavailable' : 'Loading weather…'}</p>
      ) : (
        <>
          <div className="weather__now">
            <WeatherIcon code={w.now.code} day={w.now.day} size={40} />
            <span className="weather__temp">{w.now.temp}°</span>
            <span className="weather__place">
              {w.place}
              <br />
              {describe(w.now.code)}
            </span>
          </div>
          <div className="weather__days">
            {w.days.slice(1, 5).map((d) => (
              <span key={d.date} className="weather__day">
                <b>{new Date(d.date).toLocaleDateString('en-GB', { weekday: 'short' })}</b>
                <WeatherIcon code={d.code} size={18} />
                <span>
                  {d.max}° <i>{d.min}°</i>
                </span>
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StickyWidget() {
  const [text, setText] = useState(() => {
    try {
      return localStorage.getItem('finnos:sticky') ?? 'Remember to follow finnerty_ on Twitch!';
    } catch {
      return '';
    }
  });
  return (
    <div className="widget widget--sticky">
      <textarea
        value={text}
        aria-label="Sticky note"
        onChange={(e) => {
          setText(e.target.value);
          try {
            localStorage.setItem('finnos:sticky', e.target.value);
          } catch {
            /* ignore */
          }
        }}
      />
    </div>
  );
}

function StreamWidget() {
  const live = useOS((s) => s.live);
  const uptime = useOS((s) => s.uptime);
  const avatar = useOS((s) => s.avatar);
  const nowPlaying = useOS((s) => s.nowPlaying);
  return (
    <div className="widget widget--stream" data-live={live === true}>
      <span className="widget__avatar">
        {avatar && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" />
        )}
      </span>
      <span className="widget__stream-text">
        <b>{live ? 'LIVE NOW' : live === false ? 'Offline' : 'Checking…'}</b>
        <span>{live ? (nowPlaying ? `Playing ${nowPlaying}` : uptime ? `For ${uptime}` : 'finnerty_') : 'finnerty_ on Twitch'}</span>
      </span>
      <button
        type="button"
        className="twitch-btn"
        onClick={() => {
          toggleDashboard(false);
          openApp('twitch');
        }}
      >
        <TwitchLogo size={13} weight="fill" /> {live ? 'Watch' : 'Open'}
      </button>
    </div>
  );
}

function CalendarWidget() {
  const now = new Date();
  return (
    <div className="widget widget--cal">
      <span className="widget__cal-month">{now.toLocaleDateString('en-GB', { month: 'long' })}</span>
      <span className="widget__cal-day">{now.getDate()}</span>
      <span className="widget__cal-week">{now.toLocaleDateString('en-GB', { weekday: 'long' })}</span>
    </div>
  );
}

export function Dashboard() {
  const on = useOS((s) => s.dashboard);
  if (!on) return null;
  return (
    <div className="dashboard" onClick={(e) => e.target === e.currentTarget && toggleDashboard(false)}>
      <div className="dashboard__widgets">
        <ClockWidget />
        <CalendarWidget />
        <WeatherWidget />
        <StreamWidget />
        <StickyWidget />
      </div>
      <p className="dashboard__hint">Click anywhere or press Esc to close</p>
    </div>
  );
}

/* ───────────────────────── Screensaver ───────────────────────── */

/** The FinnOS orb bounces around a starfield, DVD-logo style. Any input ends it. */
export function Screensaver() {
  const on = useOS((s) => s.screensaver);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!on) return;
    const c = canvas.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const W = window.innerWidth;
    const H = window.innerHeight;
    c.width = W * dpr;
    c.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const stars = Array.from({ length: 160 }, () => ({ x: Math.random() * W - W / 2, y: Math.random() * H - H / 2, z: Math.random() * W }));
    const R = 46;
    let x = Math.random() * (W - 2 * R) + R;
    let y = Math.random() * (H - 2 * R) + R;
    let vx = 2.1;
    let vy = 1.7;
    let hue = 265;
    let raf = 0;
    const loop = () => {
      ctx.fillStyle = 'rgb(3 3 12 / 0.35)';
      ctx.fillRect(0, 0, W, H);
      for (const st of stars) {
        st.z -= 4;
        if (st.z <= 1) st.z = W;
        const k = 220 / st.z;
        const sx = st.x * k + W / 2;
        const sy = st.y * k + H / 2;
        ctx.fillStyle = `rgb(255 255 255 / ${Math.min(1, 1.6 - st.z / W)})`;
        ctx.fillRect(sx, sy, k * 1.6, k * 1.6);
      }
      x += vx;
      y += vy;
      if (x < R || x > W - R) {
        vx *= -1;
        hue = (hue + 67) % 360;
      }
      if (y < R || y > H - R) {
        vy *= -1;
        hue = (hue + 67) % 360;
      }
      const g = ctx.createRadialGradient(x, y + 8, 4, x, y, R);
      g.addColorStop(0, `hsl(${hue} 90% 85%)`);
      g.addColorStop(0.6, `hsl(${hue} 80% 58%)`);
      g.addColorStop(1, `hsl(${hue} 70% 32%)`);
      ctx.shadowColor = `hsl(${hue} 90% 60%)`;
      ctx.shadowBlur = 40;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgb(255 255 255 / 0.75)';
      ctx.beginPath();
      ctx.ellipse(x, y - R * 0.45, R * 0.55, R * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '600 16px "Lucida Grande", "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgb(255 255 255 / 0.85)';
      ctx.fillText('finnerty', x, y + R + 24);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const wake = () => setState({ screensaver: false });
    const t = window.setTimeout(() => {
      window.addEventListener('pointermove', wake, { once: true });
      window.addEventListener('pointerdown', wake, { once: true });
      window.addEventListener('keydown', wake, { once: true });
    }, 600);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      window.removeEventListener('pointermove', wake);
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('keydown', wake);
    };
  }, [on]);

  if (!on) return null;
  return <canvas ref={canvas} className="screensaver" aria-hidden />;
}
