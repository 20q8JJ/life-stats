import { useEffect, useRef, useState } from 'react'
import { lastDays, useLife, fmtDate } from '../../life'
import { todayStr } from '../../store'

const PRESETS = [15, 25, 50, 90]

export default function Focus() {
  const { focus, add } = useLife()
  const [minutes, setMinutes] = useState(25)
  const [label, setLabel] = useState('')
  const [left, setLeft] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const endAt = useRef(0)

  useEffect(() => {
    if (!running) return
    const t = setInterval(() => {
      const l = Math.max(0, Math.round((endAt.current - Date.now()) / 1000))
      setLeft(l)
      if (l === 0) {
        setRunning(false)
        add('focus', { date: todayStr(), minutes, label: label.trim() || undefined })
        setLeft(minutes * 60)
      }
    }, 250)
    return () => clearInterval(t)
  }, [running, minutes, label, add])

  const start = () => { endAt.current = Date.now() + left * 1000; setRunning(true) }
  const pick = (m: number) => { if (running) return; setMinutes(m); setLeft(m * 60) }
  const stop = () => {
    setRunning(false)
    const done = Math.floor((minutes * 60 - left) / 60)
    if (done >= 5) add('focus', { date: todayStr(), minutes: done, label: label.trim() || undefined })
    setLeft(minutes * 60)
  }

  const r = 88
  const c = 2 * Math.PI * r
  const pct = 1 - left / (minutes * 60)
  const today = todayStr()
  const todayMin = focus.filter((f) => f.date === today).reduce((a, f) => a + f.minutes, 0)
  const week = lastDays(7)
  const weekMin = focus.filter((f) => week.includes(f.date)).reduce((a, f) => a + f.minutes, 0)
  const recent = [...focus].reverse().slice(0, 8)

  return (
    <div className="page">
      <h1>Fokus</h1>
      <p className="sub">Timer starten, Handy weg, eine Sache machen.</p>
      <div className="card" style={{ textAlign: 'center' }}>
        <div className="focus-ring">
          <svg viewBox="0 0 200 200">
            <circle cx="100" cy="100" r={r} fill="none" stroke="var(--hair)" strokeWidth="10" />
            <circle cx="100" cy="100" r={r} fill="none" stroke="url(#fg)" strokeWidth="10" strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: 'stroke-dashoffset .3s linear' }} transform="rotate(-90 100 100)" />
            <defs><linearGradient id="fg"><stop offset="0" stopColor="var(--accent)" /><stop offset="1" stopColor="var(--area)" /></linearGradient></defs>
          </svg>
          <div className="focus-time">{String(Math.floor(left / 60)).padStart(2, '0')}:{String(left % 60).padStart(2, '0')}</div>
        </div>
        <div className="row" style={{ justifyContent: 'center', gap: 6, margin: '8px 0 12px' }}>
          {PRESETS.map((m) => <span key={m} className={`chip ${minutes === m ? 'on' : ''}`} onClick={() => pick(m)}>{m} min</span>)}
        </div>
        <input id="focus-label" className="mini-input" placeholder="Woran arbeitest du? (optional)" value={label} onChange={(e) => setLabel(e.target.value)} style={{ width: '100%', maxWidth: 360, marginBottom: 12 }} />
        <div className="row" style={{ justifyContent: 'center', gap: 8 }}>
          {!running ? <button className="btn" onClick={start}>▶ Start</button> : <button className="btn ghost" onClick={() => setRunning(false)}>⏸ Pause</button>}
          {(running || left !== minutes * 60) && <button className="btn ghost" onClick={stop}>■ Beenden</button>}
        </div>
        <p className="small muted" style={{ marginTop: 10 }}>Ab 5 Minuten zählt eine Sitzung, auch wenn du früher aufhörst.</p>
      </div>
      <div className="card">
        <div className="grid">
          <div className="stat"><div className="label">Heute</div><div className="value">{todayMin} <span className="small muted">min</span></div></div>
          <div className="stat"><div className="label">Letzte 7 Tage</div><div className="value">{(weekMin / 60).toFixed(1).replace('.', ',')} <span className="small muted">h</span></div></div>
          <div className="stat"><div className="label">Sitzungen gesamt</div><div className="value">{focus.length}</div></div>
        </div>
        {recent.length > 0 && <div style={{ marginTop: 12 }}>
          {recent.map((f) => <div key={f.id} className="row between small" style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}><span>{f.label ?? 'Fokus'}</span><span className="muted">{fmtDate(f.date)} · {f.minutes} min</span></div>)}
        </div>}
      </div>
    </div>
  )
}
