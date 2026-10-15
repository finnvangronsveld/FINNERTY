import { NextResponse } from 'next/server';

/** Weather for the Dashboard widget, via Open-Meteo (free, no key). Brussels, cached 15 minutes. */
export async function GET() {
  try {
    const r = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=50.85&longitude=4.35&current=temperature_2m,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe%2FBrussels&forecast_days=5',
      { signal: AbortSignal.timeout(6000) },
    );
    if (!r.ok) throw new Error();
    const d = await r.json();
    return NextResponse.json(
      {
        place: 'Brussels',
        now: { temp: Math.round(d.current.temperature_2m), code: d.current.weather_code, day: d.current.is_day === 1 },
        days: (d.daily.time as string[]).map((t, i) => ({
          date: t,
          code: d.daily.weather_code[i],
          max: Math.round(d.daily.temperature_2m_max[i]),
          min: Math.round(d.daily.temperature_2m_min[i]),
        })),
      },
      { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' } },
    );
  } catch {
    return NextResponse.json({ error: 'Weather is unavailable.' }, { status: 502 });
  }
}
