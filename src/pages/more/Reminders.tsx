import { useState } from 'react'
import ConfirmButton from '../../ConfirmButton'
import { daysUntil, fmtDate, nextDue, useLife, type Reminder } from '../../life'
import { todayStr } from '../../store'

const UNIT = { day: ['Tag', 'Tage'], week: ['Woche', 'Wochen'], month: ['Monat', 'Monate'], year: ['Jahr', 'Jahre'] }
const PRESETS: Omit<Reminder, 'id' | 'last'>[] = [
  { title: 'Haare schneiden', ico: '💇', every: 5, unit: 'week' },
  { title: 'Zahnarzt-Kontrolle', ico: '🦷', every: 6, unit: 'month' },
  { title: 'Bettwäsche wechseln', ico: '🛏️', every: 2, unit: 'week' },
  { title: 'Eltern anrufen', ico: '📞', every: 1, unit: 'week' },
]

export function dueText(r: Reminder) {
  const d = daysUntil(nextDue(r))
  return d < 0 ? `seit ${-d} ${-d === 1 ? 'Tag' : 'Tagen'} fällig` : d === 0 ? 'heute fällig' : `in ${d} ${d === 1 ? 'Tag' : 'Tagen'}`
}

export default function Reminders() {
  const { reminders, add, patch, remove } = useLife()
  const [f, setF] = useState({ title: '', ico: '🔔', every: '1', unit: 'month' as Reminder['unit'], last: todayStr() })
  const list = [...reminders].sort((a, b) => nextDue(a).localeCompare(nextDue(b)))

  return (
    <div className="page">
      <h1>Erinnerungen</h1>
      <p className="sub">Alles, was regelmäßig wiederkommt: Geburtstage, Haare schneiden, Zahnarzt, Leute anrufen.</p>
      <div className="card">
        {!list.length && <div className="empty">Noch nichts angelegt. Unten gibt es Vorschläge.</div>}
        {list.map((r) => {
          const d = daysUntil(nextDue(r))
          return (
            <div key={r.id} className="row" style={{ gap: 12, padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
              <span style={{ fontSize: 24 }}>{r.ico}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div>{r.title}</div>
                <div className="small" style={{ color: d <= 0 ? 'var(--warn)' : 'var(--muted)' }}>{dueText(r)} · alle {r.every} {UNIT[r.unit][r.every === 1 ? 0 : 1]}</div>
              </div>
              <button className="btn ghost small" onClick={() => patch('reminders', r.id, { last: todayStr() })}>Erledigt ✓</button>
              <ConfirmButton onConfirm={() => remove('reminders', r.id)} />
            </div>
          )
        })}
      </div>
      <div className="card">
        <h2>Neue Erinnerung</h2>
        <div className="form-grid">
          <div className="field"><label>Symbol</label><input id="rem-ico" value={f.ico} onChange={(e) => setF({ ...f, ico: e.target.value })} /></div>
          <div className="field" style={{ gridColumn: 'span 2' }}><label>Was?</label><input id="rem-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="z. B. Geburtstag Mama" /></div>
          <div className="field"><label>Alle</label><input id="rem-every" inputMode="numeric" value={f.every} onChange={(e) => setF({ ...f, every: e.target.value })} /></div>
          <div className="field"><label>&nbsp;</label><select id="rem-unit" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value as Reminder['unit'] })}>{Object.entries(UNIT).map(([k, v]) => <option key={k} value={k}>{v[1]}</option>)}</select></div>
          <div className="field"><label>Zuletzt / Datum</label><input id="rem-last" type="date" value={f.last} onChange={(e) => setF({ ...f, last: e.target.value })} /></div>
        </div>
        <p className="small muted" style={{ marginTop: -4 }}>Für Geburtstage: „alle 1 Jahre“ und das letzte Geburtstagsdatum, z. B. {fmtDate('2026-03-14', { day: '2-digit', month: '2-digit', year: 'numeric' })}.</p>
        <button className="btn" disabled={!f.title.trim() || !(+f.every > 0)} onClick={() => { add('reminders', { title: f.title.trim(), ico: f.ico || '🔔', every: +f.every, unit: f.unit, last: f.last }); setF({ ...f, title: '' }) }}>Anlegen</button>
        <div className="row wrap" style={{ gap: 6, marginTop: 14 }}>
          {PRESETS.filter((p) => !reminders.some((r) => r.title === p.title)).map((p) => (
            <span key={p.title} className="chip" onClick={() => add('reminders', { ...p, last: todayStr() })}>+ {p.ico} {p.title}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
