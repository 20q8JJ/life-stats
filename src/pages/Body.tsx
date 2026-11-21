import { TIP } from '../theme'
import ConfirmButton from '../ConfirmButton'
import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { todayStr, useStore, type BodyEntry } from '../store'

type Key = keyof Omit<BodyEntry, 'id' | 'date'>

export const METRICS: { key: Key; label: string; unit: string; step: string; lowerIsBetter?: boolean }[] = [
  { key: 'weight', label: 'Gewicht', unit: 'kg', step: '0.1' },
  { key: 'bodyFat', label: 'Körperfett', unit: '%', step: '0.1', lowerIsBetter: true },
  { key: 'muscle', label: 'Muskelmasse', unit: 'kg', step: '0.1', lowerIsBetter: false },
  { key: 'water', label: 'Körperwasser', unit: '%', step: '0.1', lowerIsBetter: false },
  { key: 'visceral', label: 'Viszeralfett', unit: '', step: '0.5', lowerIsBetter: true },
  { key: 'bone', label: 'Knochenmasse', unit: 'kg', step: '0.1', lowerIsBetter: false },
  { key: 'metabolicAge', label: 'Stoffw.-Alter', unit: 'J', step: '1', lowerIsBetter: true },
  { key: 'waist', label: 'Bauchumfang', unit: 'cm', step: '0.5', lowerIsBetter: true },
]

const RANGES = [
  { label: '30 T', days: 30 },
  { label: '90 T', days: 90 },
  { label: '1 J', days: 365 },
  { label: 'Alles', days: 99999 },
]

const fmtDate = (d: string) => new Date(d + 'T12:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })

export function Delta({ now, before, unit, lowerIsBetter }: { now?: number; before?: number; unit: string; lowerIsBetter?: boolean }) {
  if (now == null || before == null) return null
  const d = +(now - before).toFixed(1)
  if (d === 0) return <div className="delta flat">± 0 {unit}</div>
  // undefined = neutral (e.g. weight depends on goal)
  const cls = lowerIsBetter === undefined ? 'flat' : (d < 0) === lowerIsBetter ? 'down' : 'up'
  return <div className={`delta ${cls}`}>{d > 0 ? '+' : ''}{d.toLocaleString('de-DE')} {unit} seit 30 T</div>
}

/** Find the value closest to N days ago (on or before). */
export function valueDaysAgo(entries: BodyEntry[], key: Key, days: number) {
  const cutoff = todayStr(new Date(Date.now() - days * 864e5))
  const older = entries.filter((e) => e.date <= cutoff && e[key] != null)
  return older.length ? (older[older.length - 1][key] as number) : undefined
}

export default function Body() {
  const { body, addBody, removeBody } = useStore()
  const [form, setForm] = useState<Record<string, string>>({ date: todayStr() })
  const [metric, setMetric] = useState<Key>('weight')
  const [range, setRange] = useState(90)
  const [showAll, setShowAll] = useState(false)

  const save = () => {
    const w = parseFloat(form.weight?.replace(',', '.'))
    if (!w) return
    const entry: Omit<BodyEntry, 'id'> = { date: form.date, weight: w }
    for (const m of METRICS) {
      const v = parseFloat(form[m.key]?.replace(',', '.') ?? '')
      if (!isNaN(v)) (entry as Record<string, unknown>)[m.key] = v
    }
    addBody(entry)
    setForm({ date: todayStr() })
  }

  const m = METRICS.find((x) => x.key === metric)!
  const data = useMemo(() => {
    const cutoff = todayStr(new Date(Date.now() - range * 864e5))
    const pts = body.filter((e) => e[metric] != null)
    // 7-entry moving average smooths daily water fluctuations
    return pts
      .map((e, i) => {
        const win = pts.slice(Math.max(0, i - 6), i + 1).map((x) => x[metric] as number)
        return { date: e.date, value: e[metric] as number, trend: +(win.reduce((a, b) => a + b, 0) / win.length).toFixed(2) }
      })
      .filter((p) => p.date >= cutoff)
  }, [body, metric, range])

  const latest = body[body.length - 1]
  const rows = [...body].reverse()

  return (
    <div className="page">
      <h1>Körper</h1>
      <p className="sub">Werte von deiner Tanita InnerScan eintragen. Nur Gewicht ist Pflicht.</p>

      <div className="card">
        <h2>Neue Messung</h2>
        <div className="form-grid">
          <div className="field">
            <label>Datum</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          {METRICS.map((x) => (
            <div className="field" key={x.key}>
              <label>{x.label}{x.unit && ` (${x.unit})`}</label>
              <input
                inputMode="decimal"
                placeholder={latest?.[x.key] != null ? String(latest[x.key]).replace('.', ',') : '–'}
                value={form[x.key] ?? ''}
                onChange={(e) => setForm({ ...form, [x.key]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <button className="btn" onClick={save} disabled={!form.weight}>Speichern</button>
      </div>

      {latest && (
        <div className="card">
          <h2>Aktuell <span className="pill">{fmtDate(latest.date)}</span></h2>
          <div className="grid">
            {METRICS.filter((x) => latest[x.key] != null).map((x) => (
              <div className="stat" key={x.key} onClick={() => setMetric(x.key)} style={{ cursor: 'pointer' }}>
                <div className="label">{x.label}</div>
                <div className="value">{String(latest[x.key]).replace('.', ',')} <span className="small muted">{x.unit}</span></div>
                <Delta now={latest[x.key] as number} before={valueDaysAgo(body, x.key, 30)} unit={x.unit} lowerIsBetter={x.lowerIsBetter} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h2>Verlauf</h2>
        <div className="tabs">
          {METRICS.map((x) => (
            <span key={x.key} className={`chip ${metric === x.key ? 'on' : ''}`} onClick={() => setMetric(x.key)}>{x.label}</span>
          ))}
        </div>
        <div className="tabs">
          {RANGES.map((r) => (
            <span key={r.days} className={`chip ${range === r.days ? 'on' : ''}`} onClick={() => setRange(r.days)}>{r.label}</span>
          ))}
        </div>
        {data.length < 2 ? (
          <div className="empty">Ab zwei Messungen siehst du hier dein Diagramm.</div>
        ) : (
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="var(--hair)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={fmtDate} stroke="var(--muted)" fontSize={11} minTickGap={24} />
                <YAxis domain={['dataMin - 1', 'dataMax + 1']} stroke="var(--muted)" fontSize={11} tickFormatter={(v) => (+v).toFixed(0)} />
                <Tooltip
                  contentStyle={TIP}
                  labelFormatter={(d) => fmtDate(String(d))}
                  formatter={(v, n) => [`${String(v).replace('.', ',')} ${m.unit}`, n === 'trend' ? 'Trend' : m.label]}
                />
                <Line isAnimationActive={false} type="monotone" dataKey="value" stroke="var(--area)" strokeOpacity={0.45} dot={{ r: 2 }} strokeWidth={1.5} />
                <Line isAnimationActive={false} type="monotone" dataKey="trend" stroke="var(--area)" dot={false} strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="small muted">Dicke Linie = Trend (Durchschnitt der letzten 7 Messungen), damit Wasserschwankungen nicht täuschen.</p>
      </div>

      {rows.length > 0 && (
        <div className="card">
          <h2>Alle Messungen</h2>
          <div className="scroll-x">
            <table>
              <thead>
                <tr>
                  <th>Datum</th>
                  {METRICS.map((x) => <th key={x.key}>{x.label}</th>)}
                  <th />
                </tr>
              </thead>
              <tbody>
                {(showAll ? rows : rows.slice(0, 10)).map((e) => (
                  <tr key={e.id}>
                    <td>{fmtDate(e.date)}</td>
                    {METRICS.map((x) => <td key={x.key}>{e[x.key] != null ? String(e[x.key]).replace('.', ',') : '–'}</td>)}
                    <td><ConfirmButton onConfirm={() => removeBody(e.id)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 10 && (
            <button className="btn ghost" style={{ marginTop: 10 }} onClick={() => setShowAll(!showAll)}>
              {showAll ? 'Weniger' : `Alle ${rows.length} anzeigen`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
