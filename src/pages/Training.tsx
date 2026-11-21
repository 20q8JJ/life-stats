import { TIP } from '../theme'
import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CountUp } from '../anim'
import ConfirmButton from '../ConfirmButton'
import {
  bestOf, exerciseKind, fmtSecs, fmtSet, parseHevy, setCount, thisWeek, useWorkouts, volume, workSets, type Workout,
} from '../workouts'

const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })
const fmtTime = (iso: string) => iso.slice(11, 16)

const unitLabel = { kg: 'geschätztes Maximum (1RM, kg)', reps: 'max. Wiederholungen', secs: 'längster Satz (s)' }

export default function Training() {
  const { workouts, saveWorkout, removeWorkout } = useWorkouts()
  const [text, setText] = useState('')
  const [flash, setFlash] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const parsed = useMemo(() => (text.trim() ? parseHevy(text) : undefined), [text])

  const save = () => {
    if (!parsed) return
    const replaced = saveWorkout(parsed)
    setText('')
    setFlash(replaced ? 'Workout aktualisiert ✓' : 'Workout gespeichert 💪')
    setTimeout(() => setFlash(''), 2500)
  }

  const paste = async () => {
    try {
      setText(await navigator.clipboard.readText())
    } catch {
      document.getElementById('hevy-text')?.focus()
    }
  }

  // Exercises seen so far, most frequent first
  const exerciseNames = useMemo(() => {
    const c: Record<string, number> = {}
    workouts.forEach((w) => w.exercises.forEach((e) => (c[e.name] = (c[e.name] ?? 0) + 1)))
    return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([n]) => n)
  }, [workouts])
  const [exSel, setExSel] = useState<string>('')
  const ex = exSel && exerciseNames.includes(exSel) ? exSel : exerciseNames[0]

  const progress = useMemo(() => {
    if (!ex) return { kind: 'reps' as const, data: [] as { d: string; v: number }[] }
    const all = workouts.flatMap((w) => w.exercises.filter((e) => e.name === ex).map((e) => ({ w, e })))
    const kind = exerciseKind(all.flatMap((x) => x.e.sets))
    return { kind, data: all.map(({ w, e }) => ({ d: w.date, v: bestOf(e.sets, kind) })) }
  }, [workouts, ex])
  const pr = progress.data.length ? Math.max(...progress.data.map((p) => p.v)) : 0

  // Workouts per week for the last 8 weeks
  const weekly = useMemo(() => {
    const out: { label: string; n: number; vol: number }[] = []
    const now = new Date()
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7))
    for (let i = 7; i >= 0; i--) {
      const s = new Date(monday.getTime() - i * 7 * 864e5)
      const e = new Date(s.getTime() + 7 * 864e5)
      const inWeek = workouts.filter((w) => {
        const d = new Date(w.date)
        return d >= s && d < e
      })
      out.push({ label: s.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }), n: inWeek.length, vol: Math.round(inWeek.reduce((a, w) => a + volume(w), 0)) })
    }
    return out
  }, [workouts])

  const week = thisWeek(workouts)
  const totalVol = workouts.reduce((a, w) => a + volume(w), 0)
  const list = [...workouts].reverse()

  return (
    <div className="page">
      <h1>Training</h1>
      <p className="sub">Workout in Hevy teilen, Text kopieren und hier einfügen. Den Rest erkennt die App.</p>

      <div className="card">
        <div className="row between"><h2>Workout einfügen</h2><button className="link" onClick={paste}>Aus Zwischenablage</button></div>
        <textarea
          id="hevy-text"
          className="paste"
          placeholder={'Donnerstag – Handstand, Schulter & hintere Kette\nDonnerstag, 19. Nov. 2026 um 18:43\n\nHandstand Hold\nSet 1: 40s\n…'}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {text.trim() && !parsed && <p className="small" style={{ color: 'var(--bad)' }}>Ich finde in dem Text keine Sätze. Ist es der Text aus „Workout teilen“ in Hevy?</p>}
        {parsed && (
          <div className="preview">
            <div className="row between wrap">
              <b>{parsed.title}</b>
              <span className="pill">{fmtDay(parsed.date)} · {fmtTime(parsed.date)} Uhr</span>
            </div>
            <div className="small muted" style={{ margin: '6px 0 10px' }}>
              {parsed.exercises.length} Übungen · {parsed.exercises.reduce((a, e) => a + workSets(e).length, 0)} Sätze
              {volume({ ...parsed, id: '' }) > 0 && ` · ${Math.round(volume({ ...parsed, id: '' })).toLocaleString('de-DE')} kg bewegt`}
            </div>
            {parsed.exercises.map((e) => (
              <div key={e.name} className="small" style={{ marginBottom: 4 }}>
                <span>{e.name}</span> <span className="muted">· {e.sets.map(fmtSet).join(' · ')}</span>
              </div>
            ))}
            <button className="btn" style={{ marginTop: 12 }} onClick={save}>Speichern</button>
          </div>
        )}
        {flash && <div className="all-done" style={{ marginTop: 10 }}>{flash}</div>}
      </div>

      {workouts.length > 0 && (
        <>
          <div className="card">
            <div className="grid">
              <div className="stat"><div className="label">Diese Woche</div><div className="value"><CountUp value={week.length} /> <span className="small muted">Workouts</span></div></div>
              <div className="stat"><div className="label">Gesamt</div><div className="value"><CountUp value={workouts.length} /></div></div>
              <div className="stat"><div className="label">Sätze gesamt</div><div className="value"><CountUp value={workouts.reduce((a, w) => a + setCount(w), 0)} /></div></div>
              <div className="stat"><div className="label">Bewegtes Gewicht</div><div className="value"><CountUp value={Math.round(totalVol)} /> <span className="small muted">kg</span></div></div>
            </div>
          </div>

          <div className="card">
            <h2>Fortschritt pro Übung</h2>
            <div className="tabs">
              {exerciseNames.map((n) => (
                <span key={n} className={`chip ${n === ex ? 'on' : ''}`} onClick={() => setExSel(n)}>{n}</span>
              ))}
            </div>
            <div className="row between small" style={{ marginBottom: 6 }}>
              <span className="muted">{unitLabel[progress.kind]}</span>
              <span>🏆 Rekord: <b>{progress.kind === 'secs' ? fmtSecs(pr) : `${String(pr).replace('.', ',')}${progress.kind === 'kg' ? ' kg' : ' Wdh.'}`}</b></span>
            </div>
            {progress.data.length < 2 ? (
              <div className="empty">Ab dem zweiten Workout mit dieser Übung siehst du hier deine Kurve.</div>
            ) : (
              <div style={{ height: 220 }}>
                <ResponsiveContainer>
                  <LineChart data={progress.data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke="var(--hair)" vertical={false} />
                    <XAxis dataKey="d" tickFormatter={(d) => fmtDay(d).slice(4)} stroke="var(--muted)" fontSize={11} minTickGap={20} />
                    <YAxis stroke="var(--muted)" fontSize={11} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={TIP} labelFormatter={(d) => fmtDay(String(d))} formatter={(v) => [String(v).replace('.', ','), 'Bestwert']} />
                    <Line type="monotone" dataKey="v" stroke="var(--area)" strokeWidth={3} dot={{ r: 4, fill: 'var(--area)' }} animationDuration={1200} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="card">
            <h2>Workouts pro Woche</h2>
            <div style={{ height: 160 }}>
              <ResponsiveContainer>
                <BarChart data={weekly} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <XAxis dataKey="label" stroke="var(--muted)" fontSize={11} />
                  <YAxis allowDecimals={false} stroke="var(--muted)" fontSize={11} />
                  <Tooltip contentStyle={TIP} cursor={{ fill: 'var(--card2)' }} formatter={(v, n) => [n === 'n' ? `${v} Workouts` : `${v} kg`, n === 'n' ? 'Anzahl' : 'Volumen']} />
                  <Bar dataKey="n" fill="var(--accent)" radius={0} animationDuration={1000} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <h2>Verlauf</h2>
            {list.map((w) => <WorkoutRow key={w.id} w={w} open={open === w.id} toggle={() => setOpen(open === w.id ? null : w.id)} remove={() => removeWorkout(w.id)} />)}
          </div>
        </>
      )}
    </div>
  )
}

function WorkoutRow({ w, open, toggle, remove }: { w: Workout; open: boolean; toggle: () => void; remove: () => void }) {
  const vol = volume(w)
  return (
    <div className="wo">
      <div className="row between" onClick={toggle} style={{ cursor: 'pointer', padding: '10px 0' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ overflowWrap: 'anywhere' }}>{w.title}</div>
          <div className="small muted">{fmtDay(w.date)} · {fmtTime(w.date)} · {w.exercises.length} Übungen · {setCount(w)} Sätze{vol ? ` · ${Math.round(vol).toLocaleString('de-DE')} kg` : ''}</div>
        </div>
        <span className="muted" style={{ transition: 'transform .2s', transform: open ? 'rotate(90deg)' : 'none' }}>›</span>
      </div>
      {open && (
        <div className="wo-detail">
          {w.exercises.map((e) => (
            <div key={e.name} style={{ marginBottom: 10 }}>
              <div className="small"><b>{e.name}</b></div>
              <div className="row wrap" style={{ gap: 6, marginTop: 4 }}>
                {e.sets.map((s, i) => <span key={i} className="pill">{s.warmup ? 'W' : i + 1}: {fmtSet(s)}</span>)}
              </div>
            </div>
          ))}
          <div className="row between">
            {w.url ? <a className="link" href={w.url} target="_blank" rel="noreferrer">In Hevy öffnen ↗</a> : <span />}
            <ConfirmButton onConfirm={remove} label="Löschen" />
          </div>
        </div>
      )}
    </div>
  )
}
