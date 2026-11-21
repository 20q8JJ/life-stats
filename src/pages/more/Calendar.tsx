import { useState } from 'react'
import ConfirmButton from '../../ConfirmButton'
import { daysUntil, download, fmtDate, icsFor, useLife, type CalEvent } from '../../life'
import { todayStr } from '../../store'

export function whenLabel(d: string) {
  const n = daysUntil(d)
  return n === 0 ? 'heute' : n === 1 ? 'morgen' : n < 7 ? fmtDate(d, { weekday: 'long' }) : fmtDate(d)
}

export function UpcomingList({ limit = 5 }: { limit?: number }) {
  const { events } = useLife()
  const up = events.filter((e) => e.date >= todayStr()).sort((a, b) => (a.date + (a.time ?? '')).localeCompare(b.date + (b.time ?? ''))).slice(0, limit)
  if (!up.length) return <div className="empty" style={{ padding: 12 }}>Keine Termine geplant.</div>
  return <>{up.map((e) => <EventRow key={e.id} e={e} />)}</>
}

function EventRow({ e, del }: { e: CalEvent; del?: () => void }) {
  return (
    <div className="row" style={{ gap: 12, padding: '9px 0', borderBottom: '1px solid var(--line)' }}>
      <div className="cal-date"><b>{e.date.slice(8)}</b><span>{fmtDate(e.date, { month: 'short' })}</span></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ overflowWrap: 'anywhere' }}>{e.title}</div>
        <div className="small muted">{whenLabel(e.date)}{e.time ? ` · ${e.time} Uhr` : ''}{e.note ? ` · ${e.note}` : ''}</div>
      </div>
      {del && <button className="btn danger" title="In Kalender" onClick={() => download(`${e.title}.ics`, icsFor([e]), 'text/calendar')}>📅</button>}
      {del && <ConfirmButton onConfirm={del} />}
    </div>
  )
}

export default function Calendar() {
  const { events, add, remove } = useLife()
  const [f, setF] = useState({ title: '', date: todayStr(), time: '', note: '' })
  const today = todayStr()
  const sorted = [...events].sort((a, b) => (a.date + (a.time ?? '')).localeCompare(b.date + (b.time ?? '')))
  const up = sorted.filter((e) => e.date >= today)
  const past = sorted.filter((e) => e.date < today).reverse().slice(0, 10)

  const save = () => {
    if (!f.title.trim()) return
    add('events', { title: f.title.trim(), date: f.date, time: f.time || undefined, note: f.note.trim() || undefined })
    setF({ ...f, title: '', time: '', note: '' })
  }

  return (
    <div className="page">
      <h1>Termine & Plan</h1>
      <p className="sub">Was ansteht. Mit 📅 kommt ein Termin in deinen Apple- oder Outlook-Kalender.</p>
      <div className="card">
        <div className="form-grid">
          <div className="field" style={{ gridColumn: 'span 2' }}><label>Was?</label><input id="ev-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="z. B. Zahnarzt" /></div>
          <div className="field"><label>Datum</label><input id="ev-date" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
          <div className="field"><label>Uhrzeit</label><input id="ev-time" type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></div>
          <div className="field" style={{ gridColumn: 'span 2' }}><label>Notiz</label><input id="ev-note" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="optional" /></div>
        </div>
        <button className="btn" onClick={save} disabled={!f.title.trim()}>Eintragen</button>
      </div>
      <div className="card">
        <div className="row between"><h2>Kommend</h2>{up.length > 1 && <button className="link" onClick={() => download('life-termine.ics', icsFor(up), 'text/calendar')}>Alle in Kalender ›</button>}</div>
        {up.length ? up.map((e) => <EventRow key={e.id} e={e} del={() => remove('events', e.id)} />) : <div className="empty">Nichts geplant.</div>}
      </div>
      {past.length > 0 && <div className="card"><h2>Vergangen</h2>{past.map((e) => <EventRow key={e.id} e={e} del={() => remove('events', e.id)} />)}</div>}
      <p className="small muted">Automatischer Abgleich mit dem Apple-Kalender in beide Richtungen kommt, sobald die App online ist.</p>
    </div>
  )
}
