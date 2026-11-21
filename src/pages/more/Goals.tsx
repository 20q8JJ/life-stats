import { useState } from 'react'
import ConfirmButton from '../../ConfirmButton'
import { daysUntil, fmtDate, num, useLife, type Goal } from '../../life'
import { todayStr } from '../../store'

export function GoalBar({ g }: { g: Goal }) {
  const pct = g.target ? Math.min(1, g.current / g.target) : 0
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="row between small" style={{ marginBottom: 4 }}>
        <span>{g.ico} {g.name}</span>
        <span className="muted">{g.current.toLocaleString('de-DE')} / {g.target.toLocaleString('de-DE')} {g.unit}</span>
      </div>
      <div className="bar"><div style={{ width: `${pct * 100}%`, background: g.doneAt ? 'var(--good)' : 'linear-gradient(90deg,var(--accent),var(--accent2))' }} /></div>
    </div>
  )
}

export default function Goals() {
  const { goals, add, patch, remove } = useLife()
  const [f, setF] = useState({ name: '', ico: '🎯', target: '', unit: '', deadline: '' })
  const [step, setStep] = useState<Record<string, string>>({})

  const save = () => {
    const t = num(f.target)
    if (!f.name.trim() || !t) return
    add('goals', { name: f.name.trim(), ico: f.ico || '🎯', target: t, current: 0, unit: f.unit.trim(), deadline: f.deadline || undefined })
    setF({ name: '', ico: '🎯', target: '', unit: '', deadline: '' })
  }
  const bump = (g: Goal, v: number) => {
    const current = Math.max(0, +(g.current + v).toFixed(2))
    patch('goals', g.id, { current, doneAt: current >= g.target ? g.doneAt ?? todayStr() : undefined })
  }
  const open = goals.filter((g) => !g.doneAt)
  const done = goals.filter((g) => g.doneAt)

  return (
    <div className="page">
      <h1>Ziele</h1>
      <p className="sub">Große Dinge in messbare Schritte teilen. {done.length} erreicht, {open.length} offen.</p>
      {open.map((g) => {
        const d = g.deadline ? daysUntil(g.deadline) : undefined
        return (
          <div key={g.id} className="card">
            <GoalBar g={g} />
            <div className="row between wrap" style={{ gap: 8 }}>
              <span className="small muted">{d !== undefined ? (d >= 0 ? `noch ${d} Tage (bis ${fmtDate(g.deadline!)})` : `${-d} Tage drüber`) : 'ohne Frist'}</span>
              <span className="row" style={{ gap: 6 }}>
                <input className="mini-input" style={{ width: 80 }} inputMode="decimal" placeholder="+1" value={step[g.id] ?? ''} onChange={(e) => setStep({ ...step, [g.id]: e.target.value })} />
                <button className="btn ghost" onClick={() => { bump(g, num(step[g.id] ?? '') ?? 1); setStep({ ...step, [g.id]: '' }) }}>Fortschritt</button>
                <ConfirmButton onConfirm={() => remove('goals', g.id)} />
              </span>
            </div>
          </div>
        )
      })}
      <div className="card">
        <h2>Neues Ziel</h2>
        <div className="form-grid">
          <div className="field"><label>Symbol</label><input id="goal-ico" value={f.ico} onChange={(e) => setF({ ...f, ico: e.target.value })} /></div>
          <div className="field" style={{ gridColumn: 'span 2' }}><label>Ziel</label><input id="goal-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="z. B. 10 Handstand-Liegestütze" /></div>
          <div className="field"><label>Zielwert</label><input id="goal-target" inputMode="decimal" value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} placeholder="10" /></div>
          <div className="field"><label>Einheit</label><input id="goal-unit" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} placeholder="Wdh., €, kg, Bücher" /></div>
          <div className="field"><label>Bis wann</label><input id="goal-deadline" type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} /></div>
        </div>
        <button className="btn" onClick={save} disabled={!f.name.trim() || !num(f.target)}>Ziel anlegen</button>
      </div>
      {done.length > 0 && (
        <div className="card">
          <h2>Erreicht 🏆</h2>
          {done.map((g) => <div key={g.id} className="row between small" style={{ padding: '6px 0' }}><span>{g.ico} {g.name}</span><span className="muted">{fmtDate(g.doneAt!)}</span></div>)}
        </div>
      )}
    </div>
  )
}
