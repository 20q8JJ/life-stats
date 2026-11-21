import { useGame } from '../../game'
import { useGratitude } from '../../gratitude'
import { euro, foodTotals, lastDays, useLife } from '../../life'
import { useStore } from '../../store'
import { useWorkouts, volume } from '../../workouts'

export default function Review() {
  const days = lastDays(7)
  const prev = lastDays(14).slice(0, 7)
  const { todos, taken, supplements, body } = useStore()
  const { workouts } = useWorkouts()
  const { days: grat } = useGratitude()
  const life = useLife()
  const g = useGame()

  const inW = (d?: string, w = days) => !!d && w.includes(d.slice(0, 10))
  const todosW = todos.filter((t) => t.done && inW(t.doneAt)).length
  const todosP = todos.filter((t) => t.done && inW(t.doneAt, prev)).length
  const wo = workouts.filter((w) => inW(w.date))
  const woP = workouts.filter((w) => inW(w.date, prev)).length
  const suppPct = supplements.length ? Math.round((days.reduce((a, d) => a + (taken[d] ?? []).filter((id) => supplements.some((s) => s.id === id)).length, 0) / (supplements.length * 7)) * 100) : 0
  const focusMin = life.focus.filter((f) => inW(f.date)).reduce((a, f) => a + f.minutes, 0)
  const habitPct = life.habits.length ? Math.round((days.reduce((a, d) => a + (life.habitLog[d] ?? []).length, 0) / (life.habits.length * 7)) * 100) : 0
  const spent = -life.txs.filter((t) => inW(t.date) && t.amount < 0).reduce((a, t) => a + t.amount, 0)
  const sleep = days.map((d) => life.checkins[d]?.sleep).filter((x): x is number => x != null)
  const kcalDays = days.map((d) => foodTotals(life.food, d).kcal).filter((k) => k > 0)
  const wStart = body.filter((b) => b.date < days[0]).pop() ?? body.find((b) => inW(b.date))
  const wEnd = [...body].reverse().find((b) => inW(b.date))
  const gratDays = days.filter((d) => grat[d]?.items.length).length

  const trend = (a: number, b: number) => (a > b ? <span className="down small"> ▲ {a - b}</span> : a < b ? <span className="up small"> ▼ {b - a}</span> : null)

  const rows: [string, string, React.ReactNode, React.ReactNode?][] = [
    ['✅', 'To-dos erledigt', todosW, trend(todosW, todosP)],
    ['🏋️', 'Workouts', `${wo.length}${wo.length ? ` · ${Math.round(wo.reduce((a, w) => a + volume(w), 0)).toLocaleString('de-DE')} kg` : ''}`, trend(wo.length, woP)],
    ['💊', 'Supplements genommen', `${suppPct} %`],
    ['🔁', 'Gewohnheiten geschafft', `${habitPct} %`],
    ['🎯', 'Fokuszeit', `${(focusMin / 60).toFixed(1).replace('.', ',')} h`],
    ['😴', 'Ø Schlaf', sleep.length ? `${(sleep.reduce((a, b) => a + b, 0) / sleep.length).toFixed(1).replace('.', ',')} h` : '–'],
    ['🍽️', 'Ø Kalorien', kcalDays.length ? `${Math.round(kcalDays.reduce((a, b) => a + b, 0) / kcalDays.length)} kcal` : '–'],
    ['⚖️', 'Gewicht', wStart && wEnd && wStart !== wEnd ? `${(wEnd.weight - wStart.weight > 0 ? '+' : '')}${(wEnd.weight - wStart.weight).toFixed(1).replace('.', ',')} kg` : wEnd ? `${String(wEnd.weight).replace('.', ',')} kg` : '–'],
    ['💸', 'Ausgaben', euro(spent)],
    ['🙏', 'Dankbarkeit', `${gratDays} von 7 Tagen`],
  ]

  // Pick the week's highlight
  const best = wo.length >= 3 ? `${wo.length} Workouts diese Woche, stark! 💪` : todosW >= 10 ? `${todosW} To-dos weggeschafft 🚀` : suppPct >= 90 ? 'Supplements fast perfekt durchgezogen 💊' : g.streak >= 7 ? `${g.streak} Tage in Folge aktiv 🔥` : undefined

  return (
    <div className="page">
      <h1>Wochenrückblick</h1>
      <p className="sub">Die letzten 7 Tage, verglichen mit der Woche davor.</p>
      {best && <div className="card highlight"><div className="big" style={{ fontSize: 22 }}>{best}</div></div>}
      <div className="card">
        {rows.map(([ico, label, val, tr]) => (
          <div key={label} className="row between" style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
            <span>{ico} {label}</span><span><b>{val}</b>{tr}</span>
          </div>
        ))}
      </div>
      <p className="small muted">Später fasst ein KI-Coach deine Woche in eigenen Worten zusammen und gibt dir Tipps.</p>
    </div>
  )
}
