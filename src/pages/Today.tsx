import type { CSSProperties } from 'react'
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts'
import type { Page } from '../modules'
import { foodTotals, useLife } from '../life'
import { HabitChecklist } from './more/Habits'
import { UpcomingList } from './more/Calendar'
import { CountUp, Ring } from '../anim'
import { macroTargets, todayStr, useStore } from '../store'
import { Delta, valueDaysAgo } from './Body'
import { streak, SupplementChecklist } from './Supplements'
import { sortTodos, TodoRow } from './Todos'
import { LevelCard } from '../game'
import { thisWeek, useWorkouts, volume } from '../workouts'
import { useGratitudeToday } from '../gratitude'

const H = { '--area': 'var(--c-health)' } as CSSProperties
const P = { '--area': 'var(--c-plan)' } as CSSProperties
const G = { '--area': 'var(--c-growth)' } as CSSProperties

export default function Today({ go }: { go: (p: Page) => void }) {
  const { body, supplements, taken, profile, todos } = useStore()
  const latest = body[body.length - 1]
  const today = todayStr()
  const suppDone = (taken[today] ?? []).filter((id) => supplements.some((s) => s.id === id)).length
  const t = macroTargets(profile, latest?.weight)
  const openTodos = sortTodos(todos.filter((x) => !x.done))
  const todayTodos = openTodos.filter((x) => !x.due || x.due <= today)
  const doneTodayList = todos.filter((x) => x.done && x.doneAt === today)
  const doneToday = doneTodayList.length
  const todoGoal = doneToday + todayTodos.length
  const hour = new Date().getHours()
  const hello = hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Hallo' : 'Guten Abend'
  const date = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
  const weights = body.slice(-30).map((b) => ({ d: b.date, w: b.weight }))
  const bestStreak = supplements.reduce((m, s) => Math.max(m, streak(taken, s.id)), 0)
  const life = useLife()
  const eaten = foodTotals(life.food, today)
  const checkedIn = !!(life.checkins[today]?.mood || life.checkins[today]?.sleep)
  const grat = useGratitudeToday()
  const { workouts } = useWorkouts()
  const lastWo = workouts[workouts.length - 1]
  const woWeek = thisWeek(workouts).length

  return (
    <div className="page">
      <div className="hero">
        <div>
          <div className="wordmark mobile-only" style={{ fontSize: 15, marginBottom: 14 }}>Life<span className="slash">/</span>Stats</div>
          <h1>{hello}</h1>
          <p className="label" style={{ margin: 0 }}>{date}</p>
        </div>
        <button className="icon-btn" onClick={() => go('settings')} aria-label="Einstellungen">⚙</button>
      </div>

      <div style={{ marginTop: 18 }}><LevelCard onOpen={() => go('achievements')} /></div>

      <div className="card" style={{ '--area': 'var(--accent)' } as CSSProperties}>
        <div className="rings">
          <Ring value={Math.round(eaten.kcal)} goal={t?.kcal ?? 0} color="var(--accent)" label="Kalorien" center={<CountUp value={Math.round(eaten.kcal)} />} sub={t ? `von ${t.kcal}` : 'Profil fehlt'} />
          <Ring value={Math.round(eaten.protein)} goal={t?.protein ?? 0} color="var(--protein)" label="Eiweiß" center={<><CountUp value={Math.round(eaten.protein)} />g</>} sub={t ? `von ${t.protein} g` : '–'} />
          <Ring value={suppDone} goal={supplements.length} color="var(--c-health)" label="Supplements" center={<>{suppDone}/{supplements.length}</>} />
          <Ring value={doneToday} goal={todoGoal} color="var(--c-plan)" label="To-dos" center={<>{doneToday}/{todoGoal}</>} />
        </div>
      </div>

      <div className="tiles">
        <div className="card" onClick={() => go('body')} style={{ cursor: 'pointer', ...H }}>
          <div className="row between"><span className="muted small">Gewicht</span><span className="pill">30 Tage</span></div>
          {latest ? (
            <>
              <div className="big"><CountUp value={latest.weight} decimals={1} /> <span className="small muted">kg</span></div>
              <Delta now={latest.weight} before={valueDaysAgo(body, 'weight', 30)} unit="kg" />
              {weights.length > 1 && (
                <div style={{ height: 70, marginTop: 8 }}>
                  <ResponsiveContainer>
                    <AreaChart data={weights} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--area)" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="var(--area)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <YAxis hide domain={['dataMin - 0.5', 'dataMax + 0.5']} />
                      <Area type="monotone" dataKey="w" stroke="var(--area)" strokeWidth={2.5} fill="url(#wg)" animationDuration={1400} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          ) : (
            <p className="muted small">Noch keine Messung. Tippe hier, um dein Gewicht einzutragen.</p>
          )}
        </div>

        <div className="card" onClick={() => go('body')} style={{ cursor: 'pointer', ...H }}>
          <div className="row between"><span className="muted small">Körperfett</span><span className="pill">Tanita</span></div>
          {latest?.bodyFat != null ? (
            <>
              <div className="big"><CountUp value={latest.bodyFat} decimals={1} /> <span className="small muted">%</span></div>
              <Delta now={latest.bodyFat} before={valueDaysAgo(body, 'bodyFat', 30)} unit="%" lowerIsBetter />
              {latest.muscle != null && (
                <div className="row between small" style={{ marginTop: 14 }}>
                  <span className="muted">Muskelmasse</span>
                  <span><CountUp value={latest.muscle} decimals={1} /> kg</span>
                </div>
              )}
              <div className="row between small" style={{ marginTop: 6 }}>
                <span className="muted">Bester Supplement-Streak</span>
                <span>🔥 {bestStreak} Tage</span>
              </div>
            </>
          ) : (
            <p className="muted small">Trag Körperfett von deiner Waage ein, dann siehst du hier deinen Verlauf.</p>
          )}
        </div>

        <div className="card wide" onClick={() => go('training')} style={{ cursor: 'pointer', ...H }}>
          <div className="row between"><span className="muted small">Training</span><span className="pill">Hevy</span></div>
          {lastWo ? (
            <div className="row between wrap" style={{ gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div className="big"><CountUp value={woWeek} /> <span className="small muted">Workouts diese Woche</span></div>
                <div className="small muted" style={{ overflowWrap: 'anywhere' }}>
                  Zuletzt: {lastWo.title} · {new Date(lastWo.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                  {volume(lastWo) > 0 && ` · ${Math.round(volume(lastWo)).toLocaleString('de-DE')} kg bewegt`}
                </div>
              </div>
              <span className="link">Öffnen ›</span>
            </div>
          ) : (
            <p className="muted small">Noch kein Workout. Tippe hier und füge den Text aus Hevy ein.</p>
          )}
        </div>

        <div className="card" style={P}>
          <div className="row between"><h2>Gewohnheiten</h2><button className="link" onClick={() => go('habits')}>Alle ›</button></div>
          <HabitChecklist />
        </div>

        <div className="card" style={P}>
          <div className="row between"><h2>Demnächst</h2><button className="link" onClick={() => go('calendar')}>Termine ›</button></div>
          <UpcomingList limit={4} />
          {!checkedIn && hour >= 18 && <button className="btn ghost" style={{ marginTop: 10, width: '100%' }} onClick={() => go('checkin')}>😴 Abend-Check-in machen</button>}
        </div>

        <div className="card" style={P}>
          <div className="row between"><h2>To-dos heute</h2><button className="link" onClick={() => go('todos')}>Alle ›</button></div>
          {todayTodos.length + doneTodayList.length === 0 ? (
            <div className="empty" style={{ padding: 12 }}>{todos.length ? 'Für heute alles erledigt 🎉' : 'Noch keine To-dos.'}</div>
          ) : (
            [...todayTodos.slice(0, 5), ...doneTodayList].map((x) => <TodoRow key={x.id} t={x} />)
          )}
        </div>

        <div className="card" style={H}>
          <div className="row between"><h2>Supplements</h2><button className="link" onClick={() => go('supps')}>Plan ›</button></div>
          <SupplementChecklist />
        </div>

        <div className="card wide" onClick={() => go('gratitude')} style={{ cursor: 'pointer', ...G }}>
          <div className="row between"><h2>Dankbarkeit 🙏</h2><span className="pill">🔥 {grat.streak} {grat.streak === 1 ? 'Tag' : 'Tage'}</span></div>
          {grat.today?.items.length ? (
            <ul className="gr-tile-items">{grat.today.items.slice(0, 3).map((x, i) => <li key={i}>{x}</li>)}</ul>
          ) : (
            <p className="muted small">{hour >= 17 ? 'Wofür bist du heute dankbar? Tippe hier für deine drei Dinge.' : 'Heute Abend: drei Dinge, für die du dankbar bist.'}</p>
          )}
        </div>

        <div className="card wide">
          <div className="row between"><h2>Ernährung heute</h2><button className="link" onClick={() => go('nutrition')}>Eintragen ›</button></div>
          {t ? (
            ([['Eiweiß', Math.round(eaten.protein), t.protein, 'var(--protein)'], ['Fett', Math.round(eaten.fat), t.fat, 'var(--fat)'], ['Kohlenhydrate', Math.round(eaten.carbs), t.carbs, 'var(--carbs)'], ['Wasser (ml)', life.water[today] ?? 0, life.waterGoal, 'var(--accent)']] as const).map(([label, cur, goal, color]) => (
              <div key={label} style={{ marginBottom: 10 }}>
                <div className="row between small" style={{ marginBottom: 4 }}><span>{label}</span><span className="muted">{cur} / {goal}{label.startsWith('Wasser') ? '' : ' g'}</span></div>
                <div className="bar"><div style={{ width: `${Math.min(100, (cur / goal) * 100)}%`, background: color }} /></div>
              </div>
            ))
          ) : (
            <p className="small muted">Füll dein <button className="link" onClick={() => go('profile')}>Profil</button> aus, dann stehen hier deine Tagesziele.</p>
          )}
        </div>
      </div>
    </div>
  )
}
