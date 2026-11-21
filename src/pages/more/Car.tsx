import { TIP } from '../../theme'
import { useMemo, useState } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ConfirmButton from '../../ConfirmButton'
import { euro, fmtDate, num, useLife } from '../../life'
import { todayStr } from '../../store'

export default function Car() {
  const { car, add, remove } = useLife()
  const [f, setF] = useState({ date: todayStr(), odometer: '', liters: '', cost: '' })
  const sorted = [...car].sort((a, b) => a.date.localeCompare(b.date) || a.odometer - b.odometer)
  const last = sorted[sorted.length - 1]
  const first = sorted[0]
  const year = todayStr().slice(0, 4)

  const stats = useMemo(() => {
    const kmBetween = (from: string) => {
      const inRange = sorted.filter((e) => e.date >= from)
      const before = sorted.filter((e) => e.date < from).pop()
      const start = before ?? inRange[0]
      const end = inRange[inRange.length - 1]
      return start && end ? end.odometer - start.odometer : 0
    }
    const fuel = sorted.filter((e) => e.liters)
    const liters = fuel.slice(1).reduce((a, e) => a + (e.liters ?? 0), 0)
    const km = fuel.length > 1 ? fuel[fuel.length - 1].odometer - fuel[0].odometer : 0
    const cost = sorted.reduce((a, e) => a + (e.cost ?? 0), 0)
    // km per month for the chart
    const months: { m: string; km: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const inM = sorted.filter((e) => e.date.startsWith(key))
      const before = sorted.filter((e) => e.date < key + '-01').pop()
      const s = before ?? inM[0]
      const e = inM[inM.length - 1]
      months.push({ m: d.toLocaleDateString('de-DE', { month: 'short' }), km: s && e ? e.odometer - s.odometer : 0 })
    }
    return {
      week: kmBetween(new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10)),
      month: kmBetween(todayStr().slice(0, 7) + '-01'),
      year: kmBetween(year + '-01-01'),
      consumption: km > 0 && liters > 0 ? (liters / km) * 100 : undefined,
      perKm: first && last && last.odometer > first.odometer ? cost / (last.odometer - first.odometer) : undefined,
      cost,
      months,
    }
  }, [sorted, first, last, year])

  const save = () => {
    const o = num(f.odometer)
    if (!o) return
    add('car', { date: f.date, odometer: o, liters: num(f.liters), cost: num(f.cost) })
    setF({ date: todayStr(), odometer: '', liters: '', cost: '' })
  }

  return (
    <div className="page">
      <h1>Auto</h1>
      <p className="sub">Kilometerstand ab und zu eintragen, beim Tanken auch Liter und Preis.</p>
      <div className="card">
        <div className="form-grid">
          <div className="field"><label>Datum</label><input id="car-date" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
          <div className="field"><label>Kilometerstand</label><input id="car-odo" inputMode="numeric" placeholder={last ? String(last.odometer) : 'z. B. 84210'} value={f.odometer} onChange={(e) => setF({ ...f, odometer: e.target.value })} /></div>
          <div className="field"><label>Getankt (L)</label><input id="car-l" inputMode="decimal" placeholder="optional" value={f.liters} onChange={(e) => setF({ ...f, liters: e.target.value })} /></div>
          <div className="field"><label>Kosten (€)</label><input id="car-cost" inputMode="decimal" placeholder="optional" value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} /></div>
        </div>
        <button className="btn" onClick={save} disabled={!num(f.odometer)}>Speichern</button>
      </div>
      {sorted.length > 1 && (
        <>
          <div className="card">
            <div className="grid">
              <div className="stat"><div className="label">Diese Woche</div><div className="value">{stats.week.toLocaleString('de-DE')} <span className="small muted">km</span></div></div>
              <div className="stat"><div className="label">Diesen Monat</div><div className="value">{stats.month.toLocaleString('de-DE')} <span className="small muted">km</span></div></div>
              <div className="stat"><div className="label">Dieses Jahr</div><div className="value">{stats.year.toLocaleString('de-DE')} <span className="small muted">km</span></div></div>
              {stats.consumption && <div className="stat"><div className="label">Verbrauch</div><div className="value">{stats.consumption.toFixed(1).replace('.', ',')} <span className="small muted">L/100 km</span></div></div>}
              {stats.perKm && <div className="stat"><div className="label">Kosten pro km</div><div className="value">{(stats.perKm * 100).toFixed(1).replace('.', ',')} <span className="small muted">ct</span></div></div>}
              {stats.cost > 0 && <div className="stat"><div className="label">Kosten gesamt</div><div className="value">{euro(stats.cost)}</div></div>}
            </div>
          </div>
          <div className="card">
            <h2>Kilometer pro Monat</h2>
            <div style={{ height: 160 }}>
              <ResponsiveContainer>
                <BarChart data={stats.months} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <XAxis dataKey="m" stroke="var(--muted)" fontSize={11} />
                  <YAxis stroke="var(--muted)" fontSize={11} />
                  <Tooltip contentStyle={TIP} cursor={{ fill: 'var(--card2)' }} formatter={(v) => [`${v} km`, 'Gefahren']} />
                  <Bar dataKey="km" fill="var(--area)" radius={0} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
      {sorted.length > 0 && (
        <div className="card">
          <h2>Einträge</h2>
          {[...sorted].reverse().map((e) => (
            <div key={e.id} className="row between small" style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
              <span>{fmtDate(e.date)} · {e.odometer.toLocaleString('de-DE')} km</span>
              <span className="row" style={{ gap: 8 }}><span className="muted">{e.liters ? `${String(e.liters).replace('.', ',')} L` : ''}{e.cost ? ` · ${euro(e.cost)}` : ''}</span><ConfirmButton onConfirm={() => remove('car', e.id)} /></span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
