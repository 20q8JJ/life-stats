import ConfirmButton from '../ConfirmButton'
import { useState } from 'react'
import { todayStr, useStore, type Supplement } from '../store'

export function groupByTime(list: Supplement[]) {
  const groups: Record<string, Supplement[]> = {}
  for (const s of [...list].sort((a, b) => a.time.localeCompare(b.time))) (groups[s.time] ??= []).push(s)
  return Object.entries(groups)
}

export const slotName = (t: string) => {
  const h = +t.slice(0, 2)
  return h < 11 ? 'Morgens' : h < 14 ? 'Mittags' : h < 18 ? 'Nachmittags' : 'Abends'
}

/** Consecutive days (ending today or yesterday) on which the supplement was taken. */
export function streak(taken: Record<string, string[]>, id: string) {
  let n = 0
  const d = new Date()
  if (!taken[todayStr(d)]?.includes(id)) d.setDate(d.getDate() - 1)
  while (taken[todayStr(d)]?.includes(id)) {
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}

export function SupplementChecklist() {
  const { supplements, taken, toggleTaken } = useStore()
  const today = todayStr()
  const done = taken[today] ?? []
  if (!supplements.length) return <div className="empty">Noch keine Supplements angelegt.</div>
  return (
    <>
      {groupByTime(supplements).map(([time, items]) => (
        <div key={time}>
          <div className="slot-title">
            <span>{slotName(time)} · {time} Uhr</span>
            <span>{items.filter((i) => done.includes(i.id)).length}/{items.length}</span>
          </div>
          {items.map((s) => {
            const on = done.includes(s.id)
            return (
              <div key={s.id} className={`check ${on ? 'done' : ''}`} onClick={() => toggleTaken(today, s.id)}>
                <div className="box">{on ? '✓' : ''}</div>
                <div style={{ flex: 1 }}>
                  <div className="name">{s.name} <span className="muted small">· {s.dose}</span></div>
                  {s.note && <div className="small muted">{s.note}</div>}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </>
  )
}

const empty = { name: '', dose: '', time: '08:00', note: '' }

export default function Supplements() {
  const { supplements, taken, addSupplement, updateSupplement, removeSupplement } = useStore()
  const [edit, setEdit] = useState<Supplement | null>(null)
  const [form, setForm] = useState(empty)

  const days30 = Array.from({ length: 30 }, (_, i) => todayStr(new Date(Date.now() - (29 - i) * 864e5)))

  const save = () => {
    if (!form.name.trim()) return
    if (edit) updateSupplement({ ...edit, ...form })
    else addSupplement(form)
    setEdit(null)
    setForm(empty)
  }

  return (
    <div className="page">
      <h1>Supplements</h1>
      <p className="sub">Tippe an, was du genommen hast. Der Plan ist komplett anpassbar.</p>

      <div className="card">
        <h2>Heute</h2>
        <SupplementChecklist />
      </div>

      <div className="card">
        <h2>Letzte 30 Tage</h2>
        {supplements.map((s) => {
          const count = days30.filter((d) => taken[d]?.includes(s.id)).length
          return (
            <div key={s.id} style={{ marginBottom: 14 }}>
              <div className="row between small" style={{ marginBottom: 6 }}>
                <span>{s.name}</span>
                <span className="muted">{count}/30 Tage · 🔥 {streak(taken, s.id)}</span>
              </div>
              <div className="heat">
                {days30.slice(-30).map((d) => (
                  <div key={d} title={d} style={{ background: taken[d]?.includes(s.id) ? 'var(--good)' : undefined }} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="card">
        <h2>{edit ? `${edit.name} bearbeiten` : 'Mein Plan'}</h2>
        {!edit &&
          [...supplements].sort((a, b) => a.time.localeCompare(b.time)).map((s) => (
            <div key={s.id} className="row between" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
              <div>
                <div>{s.name} <span className="muted small">· {s.dose}</span></div>
                <div className="small muted">{s.time} Uhr{s.note ? ` · ${s.note}` : ''}</div>
              </div>
              <div className="row">
                <button className="btn ghost" onClick={() => { setEdit(s); setForm({ name: s.name, dose: s.dose, time: s.time, note: s.note ?? '' }) }}>Ändern</button>
                <ConfirmButton onConfirm={() => removeSupplement(s.id)} />
              </div>
            </div>
          ))}
        <h2 style={{ marginTop: 16 }}>{edit ? '' : 'Hinzufügen'}</h2>
        <div className="form-grid">
          <div className="field"><label>Name</label><input value={form.name} placeholder="z. B. Vitamin D" onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="field"><label>Menge</label><input value={form.dose} placeholder="z. B. 1000 IE" onChange={(e) => setForm({ ...form, dose: e.target.value })} /></div>
          <div className="field"><label>Uhrzeit</label><input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></div>
          <div className="field"><label>Notiz</label><input value={form.note} placeholder="optional" onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
        </div>
        <div className="row">
          <button className="btn" onClick={save} disabled={!form.name.trim()}>{edit ? 'Speichern' : 'Hinzufügen'}</button>
          {edit && <button className="btn ghost" onClick={() => { setEdit(null); setForm(empty) }}>Abbrechen</button>}
        </div>
      </div>
    </div>
  )
}
