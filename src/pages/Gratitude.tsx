import { TIP } from '../theme'
import { useMemo, useState } from 'react'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CountUp } from '../anim'
import ConfirmButton from '../ConfirmButton'
import { currentStreak, longestStreak, shiftDate, topWords, useGratitude } from '../gratitude'
import { todayStr } from '../store'
import '../gratitude.css'

const MOODS = ['😞', '😕', '😐', '🙂', '😄']
const PROMPTS = ['Ein Mensch, der mir heute gutgetan hat …', 'Ein kleiner Moment, der schön war …', 'Etwas, das ich an mir selbst schätze …', 'Etwas, das ich oft für selbstverständlich halte …', 'Etwas, worauf ich mich freue …']
const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

const fmt = (d: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) =>
  new Date(d + 'T12:00:00').toLocaleDateString('de-DE', opts)
const weekday = (d: string) => (new Date(d + 'T12:00:00').getDay() + 6) % 7 // Mo=0

function Editor() {
  const { days, saveDay } = useGratitude()
  const today = todayStr()
  const [date, setDate] = useState(today)
  const existing = days[date]
  const [items, setItems] = useState<string[]>(() => pad(existing?.items))
  const [mood, setMood] = useState<number | undefined>(existing?.mood)
  const [saved, setSaved] = useState(false)

  function pad(list: string[] = []) {
    return list.length >= 3 ? [...list] : [...list, ...Array(3 - list.length).fill('')]
  }
  const pick = (d: string) => {
    setDate(d)
    setItems(pad(days[d]?.items))
    setMood(days[d]?.mood)
    setSaved(false)
  }
  const save = () => {
    saveDay(date, items, mood)
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }
  const filled = items.filter((i) => i.trim()).length
  const hour = new Date().getHours()

  return (
    <div className="card gr-editor" id="gr-editor">
      <div className="row between wrap">
        <h2 style={{ margin: 0 }}>{date === today ? (hour >= 17 ? 'Heute Abend' : 'Heute') : fmt(date, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
        <div className="tabs" style={{ margin: 0 }}>
          <button className={`chip ${date === today ? 'on' : ''}`} onClick={() => pick(today)}>Heute</button>
          <button className={`chip ${date === shiftDate(today, -1) ? 'on' : ''}`} onClick={() => pick(shiftDate(today, -1))}>Gestern</button>
          <input type="date" className="chip gr-date" max={today} value={date} onChange={(e) => e.target.value && pick(e.target.value)} aria-label="Datum wählen" />
        </div>
      </div>
      <p className="small muted" style={{ margin: '10px 0 14px' }}>Wofür bist du dankbar? Drei Dinge reichen, gern auch kleine.</p>

      {items.map((v, i) => (
        <div key={i} className={`gr-line ${v.trim() ? 'filled' : ''}`}>
          <span className="gr-num">{i + 1}</span>
          <input
            value={v}
            placeholder={PROMPTS[i % PROMPTS.length]}
            onChange={(e) => setItems(items.map((x, j) => (j === i ? e.target.value : x)))}
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
        </div>
      ))}
      {items.length < 10 && (
        <button className="link" style={{ margin: '4px 0 14px' }} onClick={() => setItems([...items, ''])}>+ noch etwas</button>
      )}

      <div className="small muted" style={{ marginBottom: 6 }}>Wie war dein Tag? (optional)</div>
      <div className="gr-moods">
        {MOODS.map((m, i) => (
          <button key={m} className={mood === i + 1 ? 'on' : ''} onClick={() => setMood(mood === i + 1 ? undefined : i + 1)} aria-label={`Stimmung ${i + 1}`}>{m}</button>
        ))}
      </div>

      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn" onClick={save} disabled={!filled && !mood && !existing}>{existing ? 'Aktualisieren' : 'Speichern'}</button>
        <span className="small muted">{filled}/3{filled >= 3 ? ' ✓' : ''}</span>
        {saved && <span className="gr-saved">Gespeichert ✨</span>}
      </div>
    </div>
  )
}

function Stats() {
  const days = useGratitude((s) => s.days)
  const today = todayStr()
  const list = Object.values(days).filter((d) => d.items.length)
  const entries = list.reduce((n, d) => n + d.items.length, 0)
  const last30 = Array.from({ length: 30 }, (_, i) => shiftDate(today, -i)).filter((d) => days[d]?.items.length).length
  const moods = Object.values(days).filter((d) => d.mood).map((d) => d.mood!)
  const avgMood = moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : 0
  const streak = currentStreak(days)

  // Calendar heatmap: 18 weeks, columns = weeks (Mo..So rows), ending this week
  const weeks = 18
  const start = shiftDate(today, -weekday(today) - (weeks - 1) * 7)
  const cells = Array.from({ length: weeks * 7 }, (_, i) => shiftDate(start, i))

  // Entries per week, last 12 weeks
  const perWeek = Array.from({ length: 12 }, (_, w) => {
    const ws = shiftDate(today, -weekday(today) - (11 - w) * 7)
    let n = 0
    for (let i = 0; i < 7; i++) n += days[shiftDate(ws, i)]?.items.length ?? 0
    return { w: fmt(ws, { day: 'numeric', month: 'numeric' }), n }
  })

  // Per weekday
  const perWd = WD.map((label) => ({ label, n: 0 }))
  for (const d of list) perWd[weekday(d.date)].n++
  const maxWd = Math.max(1, ...perWd.map((x) => x.n))

  // Mood trend, last 30 days
  const moodDays = Array.from({ length: 30 }, (_, i) => shiftDate(today, -29 + i)).map((d) => ({ d: fmt(d, { day: 'numeric', month: 'numeric' }), m: days[d]?.mood ?? 0 }))

  const words = topWords(days)
  const maxWord = words[0]?.[1] ?? 1

  if (!list.length)
    return (
      <div className="card">
        <h2>Statistik</h2>
        <div className="empty">Sobald du deinen ersten Abend eingetragen hast, erscheinen hier Serie, Kalender und deine häufigsten Themen.</div>
      </div>
    )

  return (
    <>
      <div className="card">
        <h2>Statistik</h2>
        <div className="grid">
          <div className="stat"><div className="label">Aktuelle Serie</div><div className="value">🔥 <CountUp value={streak} /></div><div className="delta muted">{streak === 1 ? 'Tag' : 'Tage'} am Stück</div></div>
          <div className="stat"><div className="label">Rekord</div><div className="value">🏆 <CountUp value={longestStreak(days)} /></div><div className="delta muted">längste Serie</div></div>
          <div className="stat"><div className="label">Dankbare Dinge</div><div className="value"><CountUp value={entries} /></div><div className="delta muted">an {list.length} Tagen</div></div>
          <div className="stat"><div className="label">Letzte 30 Tage</div><div className="value"><CountUp value={Math.round((last30 / 30) * 100)} /> %</div><div className="delta muted">{last30} von 30 Abenden</div></div>
          <div className="stat"><div className="label">Ø pro Abend</div><div className="value"><CountUp value={entries / list.length} decimals={1} /></div><div className="delta muted">Einträge</div></div>
          <div className="stat"><div className="label">Ø Stimmung</div><div className="value">{avgMood ? MOODS[Math.round(avgMood) - 1] : '–'} {avgMood ? <CountUp value={avgMood} decimals={1} /> : ''}</div><div className="delta muted">{moods.length} Bewertungen</div></div>
        </div>
      </div>

      <div className="card">
        <div className="row between"><h2>Kalender</h2><span className="pill">18 Wochen</span></div>
        <div className="gr-cal-wrap">
          <div className="gr-cal-days">{WD.map((d, i) => <span key={d}>{i % 2 === 0 ? d : ''}</span>)}</div>
          <div className="gr-cal" style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }}>
            {cells.map((d, i) => {
              const n = days[d]?.items.length ?? 0
              const future = d > today
              return (
                <div
                  key={d}
                  title={`${fmt(d)}: ${n} ${n === 1 ? 'Eintrag' : 'Einträge'}`}
                  className={`${future ? 'future' : ''} ${d === today ? 'today' : ''}`}
                  style={{ gridRow: (i % 7) + 1, gridColumn: Math.floor(i / 7) + 1, background: n ? `color-mix(in srgb, var(--accent) ${Math.round(Math.min(1, 0.3 + n * 0.23) * 100)}%, transparent)` : undefined, animationDelay: `${Math.floor(i / 7) * 25}ms` }}
                />
              )
            })}
          </div>
        </div>
        <div className="row small muted" style={{ marginTop: 10, gap: 6, justifyContent: 'flex-end' }}>
          weniger {[0, 1, 2, 3].map((n) => <span key={n} className="gr-legend" style={{ background: n ? `color-mix(in srgb, var(--accent) ${Math.round((0.3 + n * 0.23) * 100)}%, transparent)` : undefined }} />)} mehr
        </div>
      </div>

      <div className="tiles">
        <div className="card">
          <h2>Einträge pro Woche</h2>
          <div style={{ height: 160 }}>
            <ResponsiveContainer>
              <BarChart data={perWeek} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="grbar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--area)" />
                    <stop offset="100%" stopColor="var(--accent)" />
                  </linearGradient>
                </defs>
                <XAxis dataKey="w" tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} interval={1} />
                <YAxis allowDecimals={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'var(--card2)' }} contentStyle={TIP} formatter={(v) => [v, 'Einträge']} labelFormatter={(l) => `Woche ab ${l}`} />
                <Bar dataKey="n" fill="url(#grbar)" radius={0} animationDuration={1200} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h2>Stimmung (30 Tage)</h2>
          {moods.length ? (
            <div style={{ height: 160 }}>
              <ResponsiveContainer>
                <BarChart data={moodDays} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
                  <XAxis dataKey="d" tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} interval={6} />
                  <YAxis domain={[0, 5]} ticks={[1, 3, 5]} tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'var(--card2)' }} contentStyle={TIP} formatter={(v) => [v ? MOODS[Number(v) - 1] : '–', 'Stimmung']} />
                  <Bar dataKey="m" radius={[4, 4, 0, 0]} animationDuration={1200}>
                    {moodDays.map((x) => <Cell key={x.d} fill={['var(--bad)', 'var(--warn)', 'var(--muted)', 'var(--accent)', 'var(--good)'][x.m - 1] ?? 'transparent'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="small muted">Wähle beim Eintragen ein Gesicht, dann siehst du hier, wie deine Tage waren.</p>
          )}
        </div>

        <div className="card">
          <h2>Nach Wochentag</h2>
          {perWd.map((x) => (
            <div key={x.label} className="row small" style={{ marginBottom: 7 }}>
              <span className="muted" style={{ width: 24 }}>{x.label}</span>
              <div className="bar" style={{ flex: 1 }}><div style={{ width: `${(x.n / maxWd) * 100}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent2))' }} /></div>
              <span style={{ width: 22, textAlign: 'right' }}>{x.n}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <h2>Deine häufigsten Themen</h2>
          {words.length ? (
            <div className="gr-words">
              {words.map(([w, n], i) => (
                <span key={w} style={{ fontSize: 12 + (n / maxWord) * 10, animationDelay: `${i * 40}ms` }} title={`${n}×`}>{w}<small>{n}</small></span>
              ))}
            </div>
          ) : (
            <p className="small muted">Kommt, sobald du ein paar Einträge hast.</p>
          )}
        </div>
      </div>
    </>
  )
}

function Memory() {
  const days = useGratitude((s) => s.days)
  const today = todayStr()
  const past = useMemo(() => Object.values(days).filter((d) => d.items.length && d.date < today), [days, today])
  const [seed, setSeed] = useState(() => Math.random())
  if (past.length < 3) return null
  const anniversaries = [[7, 'Vor einer Woche'], [30, 'Vor einem Monat'], [365, 'Vor einem Jahr']] as const
  const hit = [...anniversaries].reverse().find(([n]) => days[shiftDate(today, -n)]?.items.length)
  const day = hit ? days[shiftDate(today, -hit[0])] : past[Math.floor(seed * past.length)]
  return (
    <div className="card gr-memory">
      <div className="row between">
        <h2 style={{ margin: 0 }}>💭 {hit ? hit[1] : 'Erinnerung'}</h2>
        {!hit && <button className="link" onClick={() => setSeed(Math.random())}>Andere ›</button>}
      </div>
      <div className="small muted" style={{ margin: '4px 0 10px' }}>{fmt(day.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
      {day.items.map((t, i) => <div key={i} className="gr-quote">„{t}“</div>)}
    </div>
  )
}

function History() {
  const { days, removeDay } = useGratitude()
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(14)
  const list = Object.values(days)
    .filter((d) => !q || d.items.some((t) => t.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => b.date.localeCompare(a.date))
  if (!Object.keys(days).length) return null
  return (
    <div className="card">
      <div className="row between wrap" style={{ marginBottom: 10 }}>
        <h2 style={{ margin: 0 }}>Verlauf</h2>
        <div className="field" style={{ flex: '0 1 220px' }}><input value={q} placeholder="🔍 Suchen …" onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      {list.length === 0 && <div className="empty">Nichts gefunden.</div>}
      {list.slice(0, limit).map((d) => (
        <div key={d.date} className="gr-day">
          <div className="row between">
            <span className="small" style={{ fontWeight: 600 }}>{fmt(d.date, { weekday: 'long', day: 'numeric', month: 'long' })} {d.mood ? MOODS[d.mood - 1] : ''}</span>
            <ConfirmButton onConfirm={() => removeDay(d.date)} />
          </div>
          <ul>{d.items.map((t, i) => <li key={i}>{highlight(t, q)}</li>)}</ul>
        </div>
      ))}
      {list.length > limit && <button className="btn ghost" style={{ width: '100%' }} onClick={() => setLimit(limit + 30)}>Mehr anzeigen ({list.length - limit})</button>}
      <p className="small muted" style={{ marginTop: 10 }}>Ältere Tage bearbeiten: oben im Eintrag das Datum wählen.</p>
    </div>
  )
}

function highlight(t: string, q: string) {
  if (!q) return t
  const i = t.toLowerCase().indexOf(q.toLowerCase())
  if (i < 0) return t
  return <>{t.slice(0, i)}<mark className="gr-mark">{t.slice(i, i + q.length)}</mark>{t.slice(i + q.length)}</>
}

export default function Gratitude() {
  return (
    <div className="page">
      <h1 className="grad">Dankbarkeit 🙏</h1>
      <p className="sub">Jeden Abend drei Dinge, für die du dankbar bist. Klein ist völlig okay.</p>
      <Editor />
      <Memory />
      <Stats />
      <History />
    </div>
  )
}
