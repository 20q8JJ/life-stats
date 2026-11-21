import { TIP } from '../../theme'
import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fmtDate, lastDays, num, shiftDay, useLife } from '../../life'
import { todayStr } from '../../store'

const MOODS = ['😣', '😕', '😐', '🙂', '😄']
const ENERGY = ['🪫', '😴', '⚡', '⚡⚡', '🚀']
const hm = (min?: number) => (min == null ? '–' : `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}`)

export function Scale({ value, onChange, icons }: { value?: number; onChange: (v: number) => void; icons: string[] }) {
  return (
    <div className="scale">
      {icons.map((ic, i) => (
        <button key={i} className={value === i + 1 ? 'on' : ''} onClick={() => onChange(i + 1)}>{ic}</button>
      ))}
    </div>
  )
}

export default function CheckIn() {
  const { checkins, setCheckIn } = useLife()
  const [date, setDate] = useState(todayStr())
  const c = checkins[date] ?? {}
  const days = lastDays(14)

  const chart = useMemo(() => days.map((d) => ({ d, sleep: checkins[d]?.sleep, mood: checkins[d]?.mood, energy: checkins[d]?.energy, screen: checkins[d] && (checkins[d].screenPhone != null || checkins[d].screenPc != null) ? +(((checkins[d].screenPhone ?? 0) + (checkins[d].screenPc ?? 0)) / 60).toFixed(1) : undefined })), [checkins, days])
  const avg = (k: 'sleep' | 'mood' | 'energy') => {
    const v = days.map((d) => checkins[d]?.[k]).filter((x): x is number => x != null)
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : undefined
  }
  const screenDays = days.map((d) => checkins[d]).filter((x) => x && (x.screenPhone != null || x.screenPc != null))
  const avgScreen = screenDays.length ? screenDays.reduce((a, x) => a + (x!.screenPhone ?? 0) + (x!.screenPc ?? 0), 0) / screenDays.length : undefined

  // Simple correlation hint: sleep vs. mood
  const insight = useMemo(() => {
    const pairs = Object.values(checkins).filter((x) => x.sleep != null && x.mood != null)
    if (pairs.length < 5) return
    const good = pairs.filter((x) => x.sleep! >= 7)
    const bad = pairs.filter((x) => x.sleep! < 7)
    if (!good.length || !bad.length) return
    const m = (l: typeof pairs) => l.reduce((a, x) => a + x.mood!, 0) / l.length
    const diff = m(good) - m(bad)
    if (Math.abs(diff) < 0.3) return
    return diff > 0 ? `An Tagen mit 7+ Stunden Schlaf ist deine Stimmung im Schnitt ${diff.toFixed(1).replace('.', ',')} Punkte besser.` : 'Interessant: Mehr Schlaf hebt deine Stimmung bisher nicht.'
  }, [checkins])

  return (
    <div className="page">
      <h1>Schlaf & Stimmung</h1>
      <p className="sub">Täglicher Check-in in 20 Sekunden. Daraus erkennt die App Zusammenhänge.</p>
      <div className="card">
        <div className="row between" style={{ marginBottom: 12 }}>
          <button className="btn ghost" onClick={() => setDate(shiftDay(date, -1))}>‹</button>
          <b>{date === todayStr() ? 'Heute' : fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}</b>
          <button className="btn ghost" disabled={date >= todayStr()} onClick={() => setDate(shiftDay(date, 1))}>›</button>
        </div>
        <div className="small muted">Stimmung</div>
        <Scale value={c.mood} onChange={(v) => setCheckIn(date, { mood: v })} icons={MOODS} />
        <div className="small muted" style={{ marginTop: 12 }}>Energie</div>
        <Scale value={c.energy} onChange={(v) => setCheckIn(date, { energy: v })} icons={ENERGY} />
        <div className="form-grid" style={{ marginTop: 14 }}>
          <div className="field"><label>Schlaf (Stunden)</label><input key={date + 's'} inputMode="decimal" defaultValue={c.sleep ?? ''} placeholder="z. B. 7,5" onBlur={(e) => setCheckIn(date, { sleep: num(e.target.value) })} /></div>
          <div className="field"><label>Bildschirmzeit iPhone (min)</label><input key={date + 'p'} inputMode="numeric" defaultValue={c.screenPhone ?? ''} placeholder="Einstellungen → Bildschirmzeit" onBlur={(e) => setCheckIn(date, { screenPhone: num(e.target.value) })} /></div>
          <div className="field"><label>Bildschirmzeit PC (min)</label><input key={date + 'c'} inputMode="numeric" defaultValue={c.screenPc ?? ''} placeholder="später automatisch" onBlur={(e) => setCheckIn(date, { screenPc: num(e.target.value) })} /></div>
        </div>
        <div className="field"><label>Was war heute?</label><input key={date + 'n'} defaultValue={c.note ?? ''} placeholder="optional, ein Satz" onBlur={(e) => setCheckIn(date, { note: e.target.value || undefined })} /></div>
      </div>

      <div className="card">
        <h2>Letzte 14 Tage</h2>
        <div className="grid">
          <div className="stat"><div className="label">Ø Schlaf</div><div className="value">{avg('sleep')?.toFixed(1).replace('.', ',') ?? '–'} <span className="small muted">h</span></div></div>
          <div className="stat"><div className="label">Ø Stimmung</div><div className="value">{avg('mood') ? MOODS[Math.round(avg('mood')!) - 1] : '–'}</div></div>
          <div className="stat"><div className="label">Ø Energie</div><div className="value">{avg('energy')?.toFixed(1).replace('.', ',') ?? '–'} <span className="small muted">/ 5</span></div></div>
          <div className="stat"><div className="label">Ø Bildschirm</div><div className="value">{avgScreen != null ? hm(Math.round(avgScreen)) : '–'}</div></div>
        </div>
        {insight && <p className="insight">💡 {insight}</p>}
        {chart.filter((x) => x.sleep != null || x.mood != null).length >= 2 && (
          <div style={{ height: 200, marginTop: 12 }}>
            <ResponsiveContainer>
              <LineChart data={chart} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--hair)" vertical={false} />
                <XAxis dataKey="d" tickFormatter={(d) => fmtDate(d).slice(4)} stroke="var(--muted)" fontSize={11} minTickGap={20} />
                <YAxis stroke="var(--muted)" fontSize={11} domain={[0, 'auto']} />
                <Tooltip contentStyle={TIP} labelFormatter={(d) => fmtDate(String(d))}
                  formatter={(v, n) => [String(v).replace('.', ','), ({ sleep: 'Schlaf (h)', mood: 'Stimmung', energy: 'Energie', screen: 'Bildschirm (h)' } as Record<string, string>)[String(n)]]} />
                <Line dataKey="sleep" stroke="var(--accent)" strokeWidth={2.5} dot={false} connectNulls />
                <Line dataKey="mood" stroke="var(--good)" strokeWidth={2.5} dot={false} connectNulls />
                <Line dataKey="energy" stroke="var(--warn)" strokeWidth={2} dot={false} connectNulls />
                <Line dataKey="screen" stroke="var(--bad)" strokeWidth={2} strokeDasharray="4 4" dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="row wrap small" style={{ gap: 12, marginTop: 6 }}>
          <span><span className="dot" style={{ background: 'var(--accent)' }} /> Schlaf</span>
          <span><span className="dot" style={{ background: 'var(--good)' }} /> Stimmung</span>
          <span><span className="dot" style={{ background: 'var(--warn)' }} /> Energie</span>
          <span><span className="dot" style={{ background: 'var(--bad)' }} /> Bildschirm</span>
        </div>
      </div>
    </div>
  )
}
