import { useState } from 'react'
import ConfirmButton from '../../ConfirmButton'
import { habitStreak, lastDays, useLife } from '../../life'
import { todayStr } from '../../store'

export function HabitChecklist() {
  const { habits, habitLog, toggleHabit } = useLife()
  const today = todayStr()
  if (!habits.length) return <div className="empty">Noch keine Gewohnheiten.</div>
  return (
    <>
      {habits.map((h) => {
        const on = (habitLog[today] ?? []).includes(h.id)
        const s = habitStreak(habitLog, h.id)
        return (
          <div key={h.id} className={`check ${on ? 'done' : ''}`} onClick={() => toggleHabit(today, h.id)}>
            <div className="box">{on ? '✓' : ''}</div>
            <div className="name" style={{ flex: 1 }}>{h.ico} {h.name}</div>
            {s > 0 && <span className="small flame">🔥 {s}</span>}
          </div>
        )
      })}
    </>
  )
}

export default function Habits() {
  const { habits, habitLog, add, remove } = useLife()
  const [name, setName] = useState('')
  const [ico, setIco] = useState('⭐')
  const days = lastDays(28)

  return (
    <div className="page">
      <h1>Gewohnheiten</h1>
      <p className="sub">Kleine Dinge, jeden Tag. Abhaken baut deinen Streak auf.</p>
      <div className="card"><h2>Heute</h2><HabitChecklist /></div>

      <div className="card">
        <h2>Letzte 4 Wochen</h2>
        {habits.map((h) => {
          const n = days.filter((d) => habitLog[d]?.includes(h.id)).length
          return (
            <div key={h.id} style={{ marginBottom: 14 }}>
              <div className="row between small" style={{ marginBottom: 6 }}>
                <span>{h.ico} {h.name}</span>
                <span className="row muted" style={{ gap: 8 }}>{Math.round((n / 28) * 100)} % <ConfirmButton onConfirm={() => remove('habits', h.id)} /></span>
              </div>
              <div className="heat" style={{ gridTemplateColumns: 'repeat(14, 1fr)' }}>
                {days.map((d) => <div key={d} title={d} style={{ background: habitLog[d]?.includes(h.id) ? 'var(--accent)' : undefined }} />)}
              </div>
            </div>
          )
        })}
      </div>

      <div className="card">
        <h2>Neue Gewohnheit</h2>
        <div className="row" style={{ gap: 8 }}>
          <input id="habit-ico" className="mini-input" value={ico} onChange={(e) => setIco(e.target.value)} style={{ width: 56, textAlign: 'center' }} />
          <input id="habit-name" className="mini-input" style={{ flex: 1 }} placeholder="z. B. Meditieren" value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) { add('habits', { name: name.trim(), ico }); setName('') } }} />
          <button className="btn" disabled={!name.trim()} onClick={() => { add('habits', { name: name.trim(), ico }); setName('') }}>+</button>
        </div>
      </div>
    </div>
  )
}
