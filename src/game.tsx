import { cssVar } from './theme'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useGratitude } from './gratitude'
import { todayStr, useStore } from './store'
import { bestOf, exerciseKind, useWorkouts } from './workouts'
import { useLife } from './life'

/* ---------- XP & levels (derived from the data, so nothing can drift) ---------- */

export const XP = {
  supplement: 5, todo: 10, body: 15, workout: 50, set: 2, gratitude: 15,
  habit: 5, focusPer10Min: 4, checkin: 10, foodDay: 10, waterGoal: 10, goal: 150, book: 100, reminder: 5,
}

const TITLES: [number, string][] = [[0, 'Neustart'], [5, 'Durchstarter'], [10, 'Gewohnheits-Bauer'], [15, 'Fokus-Profi'], [20, 'Disziplin-Maschine'], [30, 'Unaufhaltsam'], [40, 'Legende'], [50, 'Mythos']]
export const titleFor = (level: number) => [...TITLES].reverse().find(([l]) => level >= l)![1]

/**
 * Minecraft's XP curve, times 10: each level costs more than the last.
 * Levels 0-15: 2L+7, 16-30: 5L-38, 31+: 9L-158 (per level, ×10).
 * A normal active day is ~150-250 XP, so level 10 takes about a week,
 * level 30 a few months and level 50 well over a year.
 */
export const costOfLevel = (l: number) => 10 * (l <= 15 ? 2 * l + 7 : l <= 30 ? 5 * l - 38 : 9 * l - 158)

export function levelFromXp(xp: number) {
  let l = 0
  let base = 0
  while (base + costOfLevel(l) <= xp) { base += costOfLevel(l); l++ }
  const need = costOfLevel(l)
  return { level: l, into: xp - base, need, pct: (xp - base) / need }
}

export type Achievement = { id: string; ico: string; name: string; desc: string; done: boolean; progress?: string }

export function useGame() {
  const { taken, todos, body, supplements } = useStore()
  const { workouts } = useWorkouts()
  const { days: grat } = useGratitude()
  const life = useLife()

  return useMemo(() => {
    const suppTicks = Object.values(taken).reduce((a, l) => a + l.length, 0)
    const todosDone = todos.filter((t) => t.done).length
    const sets = workouts.reduce((a, w) => a + w.exercises.reduce((b, e) => b + e.sets.filter((s) => !s.warmup).length, 0), 0)
    const gratDays = Object.values(grat).filter((d) => d.items.length).length
    const xp =
      suppTicks * XP.supplement + todosDone * XP.todo + body.length * XP.body +
      workouts.length * XP.workout + sets * XP.set + gratDays * XP.gratitude +
      Object.values(life.habitLog).reduce((a, l) => a + l.length, 0) * XP.habit +
      Math.floor(life.focus.reduce((a, f) => a + f.minutes, 0) / 10) * XP.focusPer10Min +
      Object.values(life.checkins).filter((c) => c.mood || c.sleep).length * XP.checkin +
      new Set(life.food.map((f) => f.date)).size * XP.foodDay +
      Object.values(life.water).filter((ml) => ml >= life.waterGoal).length * XP.waterGoal +
      life.goals.filter((g) => g.doneAt).length * XP.goal +
      life.books.filter((b) => b.status === 'done').length * XP.book

    // Days with any activity → "active streak"
    const active = new Set<string>()
    Object.entries(taken).forEach(([d, l]) => l.length && active.add(d))
    todos.forEach((t) => t.doneAt && active.add(t.doneAt))
    body.forEach((b) => active.add(b.date))
    workouts.forEach((w) => active.add(w.date.slice(0, 10)))
    Object.values(grat).forEach((g) => g.items.length && active.add(g.date))
    Object.entries(life.habitLog).forEach(([d, l]) => l.length && active.add(d))
    life.focus.forEach((f) => active.add(f.date))
    Object.entries(life.checkins).forEach(([d, c]) => (c.mood || c.sleep) && active.add(d))
    life.food.forEach((f) => active.add(f.date))
    let streak = 0
    const d = new Date()
    if (!active.has(todayStr(d))) d.setDate(d.getDate() - 1)
    while (active.has(todayStr(d))) { streak++; d.setDate(d.getDate() - 1) }

    const fullSuppDays = Object.values(taken).filter((l) => supplements.length > 0 && supplements.every((s) => l.includes(s.id))).length
    const hasRecordJump = (() => {
      // any exercise where the latest best beats all earlier bests
      const by: Record<string, number[]> = {}
      workouts.forEach((w) => w.exercises.forEach((e) => (by[e.name] ??= []).push(bestOf(e.sets, exerciseKind(e.sets)))))
      return Object.values(by).some((v) => v.length > 1 && Math.max(...v.slice(1)) > v[0])
    })()
    const lv = levelFromXp(xp).level

    const a = (id: string, ico: string, name: string, desc: string, cur: number, goal: number): Achievement => ({
      id, ico, name, desc, done: cur >= goal, progress: cur >= goal ? undefined : `${Math.min(cur, goal)}/${goal}`,
    })
    const achievements: Achievement[] = [
      a('first-step', '👣', 'Erster Schritt', 'Irgendetwas in der App erledigt', xp > 0 ? 1 : 0, 1),
      a('weigh-in', '⚖️', 'Auf die Waage', 'Erste Körpermessung eingetragen', body.length, 1),
      a('weigh-10', '📈', 'Datensammler', '10 Körpermessungen', body.length, 10),
      a('supp-full', '💊', 'Voll versorgt', 'Alle Supplements an einem Tag genommen', fullSuppDays, 1),
      a('supp-7', '🧪', 'Supplement-Woche', '7 Tage komplett versorgt', fullSuppDays, 7),
      a('todo-10', '✅', 'Macher', '10 To-dos erledigt', todosDone, 10),
      a('todo-50', '🚀', 'Produktiv-Rakete', '50 To-dos erledigt', todosDone, 50),
      a('wo-1', '🏋️', 'Erstes Workout', 'Ein Training gespeichert', workouts.length, 1),
      a('wo-10', '💪', 'Eisern', '10 Trainings gespeichert', workouts.length, 10),
      a('pr', '🏆', 'Neuer Rekord', 'Bei einer Übung den Bestwert geknackt', hasRecordJump ? 1 : 0, 1),
      a('grat-7', '🙏', 'Dankbare Woche', '7 Tage Dankbarkeit eingetragen', gratDays, 7),
      a('streak-3', '🔥', 'Am Ball', '3 Tage in Folge aktiv', streak, 3),
      a('streak-7', '🌋', 'Wochen-Feuer', '7 Tage in Folge aktiv', streak, 7),
      a('streak-30', '☄️', 'Unzerstörbar', '30 Tage in Folge aktiv', streak, 30),
      a('habit-30', '🔁', 'Routine', '30 Gewohnheiten abgehakt', Object.values(life.habitLog).reduce((x, l) => x + l.length, 0), 30),
      a('focus-10h', '⏱️', 'Tiefenfokus', '10 Stunden Fokuszeit', Math.floor(life.focus.reduce((x, f) => x + f.minutes, 0) / 60), 10),
      a('goal-1', '🎯', 'Ziel erreicht', 'Ein Ziel komplett geschafft', life.goals.filter((g) => g.doneAt).length, 1),
      a('book-1', '📚', 'Bücherwurm', 'Ein Buch fertig gelesen', life.books.filter((b) => b.status === 'done').length, 1),
      a('water-7', '💧', 'Hydriert', '7 Tage Wasserziel erreicht', Object.values(life.water).filter((ml) => ml >= life.waterGoal).length, 7),
      a('checkin-14', '😴', 'Selbstkenner', '14 Check-ins gemacht', Object.values(life.checkins).filter((c) => c.mood || c.sleep).length, 14),
      a('lvl-10', '⭐', 'Level 10', 'Level 10 erreicht', lv, 10),
      a('lvl-25', '🌟', 'Level 25', 'Level 25 erreicht', lv, 25),
      a('lvl-50', '👑', 'Level 50', 'Level 50 erreicht', lv, 50),
    ]

    const today = todayStr()
    const todaySuppAll = supplements.length > 0 && supplements.every((s) => (taken[today] ?? []).includes(s.id))
    const todayTodosAll = todos.some((t) => t.doneAt === today) && !todos.some((t) => !t.done && (!t.due || t.due <= today))

    return { xp, ...levelFromXp(xp), streak, achievements, todaySuppAll, todayTodosAll }
  }, [taken, todos, body, supplements, workouts, grat, life])
}

/* ---------- Confetti ---------- */

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const palette = () => [cssVar('--accent'), cssVar('--ink'), cssVar('--muted'), cssVar('--accent')]

export function confetti(strength = 1) {
  if (reduced()) return
  const c = document.createElement('canvas')
  c.className = 'confetti'
  const dpr = devicePixelRatio || 1
  c.width = innerWidth * dpr
  c.height = innerHeight * dpr
  document.body.appendChild(c)
  const ctx = c.getContext('2d')!
  ctx.scale(dpr, dpr)
  const COLORS = palette()
  const n = Math.round(110 * strength)
  const parts = Array.from({ length: n }, (_, i) => {
    const fromLeft = i % 2 === 0
    return {
      x: fromLeft ? -10 : innerWidth + 10,
      y: innerHeight * (0.55 + Math.random() * 0.3),
      vx: (fromLeft ? 1 : -1) * (6 + Math.random() * 9),
      vy: -(9 + Math.random() * 11),
      r: 4 + Math.random() * 5,
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 0.4,
      color: COLORS[i % COLORS.length],
      shape: i % 3,
    }
  })
  const start = performance.now()
  const tick = (t: number) => {
    const el = t - start
    ctx.clearRect(0, 0, innerWidth, innerHeight)
    for (const p of parts) {
      p.vy += 0.38
      p.vx *= 0.985
      p.x += p.vx
      p.y += p.vy
      p.rot += p.vr
      ctx.save()
      ctx.globalAlpha = Math.max(0, 1 - el / 2600)
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.fillStyle = p.color
      if (p.shape === 0) ctx.fillRect(-p.r / 2, -p.r, p.r, p.r * 2)
      else if (p.shape === 1) { ctx.beginPath(); ctx.arc(0, 0, p.r / 2, 0, 7); ctx.fill() }
      else { ctx.beginPath(); ctx.moveTo(0, -p.r); ctx.lineTo(p.r, p.r); ctx.lineTo(-p.r, p.r); ctx.fill() }
      ctx.restore()
    }
    if (el < 2700) requestAnimationFrame(tick)
    else c.remove()
  }
  requestAnimationFrame(tick)
}

/* ---------- Overlay: XP toasts, level-ups, unlocked achievements ---------- */

type Toast = { id: number; text: string; kind: 'xp' | 'badge' | 'level' }
const SEEN_KEY = 'life-app-seen-achievements'

function loadSeen(): string[] | null {
  try { const v = localStorage.getItem(SEEN_KEY); return v ? JSON.parse(v) : null } catch { return null }
}
function saveSeen(ids: string[]) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(ids)) } catch { /* ignore */ }
}

export function GameLayer() {
  const g = useGame()
  const [toasts, setToasts] = useState<Toast[]>([])
  const [levelUp, setLevelUp] = useState<number | null>(null)
  const prev = useRef<{ xp: number; level: number; supp: boolean; todos: boolean } | null>(null)
  const nextId = useRef(1)

  const push = (text: string, kind: Toast['kind']) => {
    const id = nextId.current++
    setToasts((t) => [...t, { id, text, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'xp' ? 1100 : 2600)
  }

  useEffect(() => {
    const p = prev.current
    prev.current = { xp: g.xp, level: g.level, supp: g.todaySuppAll, todos: g.todayTodosAll }
    // Achievements: first run just records what's already unlocked, no toast spam
    const unlocked = g.achievements.filter((a) => a.done).map((a) => a.id)
    const seen = loadSeen()
    if (seen === null) saveSeen(unlocked)
    else {
      const fresh = g.achievements.filter((a) => a.done && !seen.includes(a.id))
      if (fresh.length) {
        fresh.forEach((a) => push(`${a.ico} Erfolg freigeschaltet: ${a.name}`, 'badge'))
        saveSeen(unlocked)
        confetti(0.4)
      }
    }
    if (!p) return
    const gained = g.xp - p.xp
    if (gained > 0) push(`+${gained} XP`, 'xp')
    if (g.level > p.level) {
      setLevelUp(g.level)
      confetti(1.4)
      setTimeout(() => setLevelUp(null), 2600)
    } else if ((g.todaySuppAll && !p.supp) || (g.todayTodosAll && !p.todos)) {
      push(g.todaySuppAll && !p.supp ? '💊 Alle Supplements für heute' : '✅ Alle To-dos für heute erledigt', 'badge')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.xp, g.level, g.todaySuppAll, g.todayTodosAll])

  return (
    <>
      <div className="toasts" aria-live="polite">
        {toasts.filter((t) => t.kind !== 'xp').map((t) => <div key={t.id} className={`toast ${t.kind}`}>{t.text}</div>)}
      </div>
      <div className="xp-float" aria-hidden="true">
        {toasts.filter((t) => t.kind === 'xp').slice(-1).map((t) => <span key={t.id}>{t.text}</span>)}
      </div>
      {levelUp && (
        <div className="levelup" onClick={() => setLevelUp(null)}>
          <div className="levelup-card">
            <div className="levelup-num">{levelUp}</div>
            <div className="levelup-title">Level up!</div>
            <div className="muted">{titleFor(levelUp)}</div>
          </div>
        </div>
      )}
    </>
  )
}

/* ---------- Dashboard card + achievements list ---------- */

export function LevelCard({ onOpen }: { onOpen: () => void }) {
  const g = useGame()
  const [w, setW] = useState(0)
  useEffect(() => { const t = setTimeout(() => setW(g.pct), 80); return () => clearTimeout(t) }, [g.pct])
  const unlocked = g.achievements.filter((a) => a.done).length
  return (
    <div className="card level-card" onClick={onOpen} style={{ cursor: 'pointer' }}>
      <div className="row" style={{ gap: 14 }}>
        <div className="lvl-badge"><span>{g.level}</span></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row between">
            <b>{titleFor(g.level)}</b>
            <span className="small muted">{g.into} / {g.need} XP</span>
          </div>
          <div className="xpbar"><div style={{ width: `${w * 100}%` }} /></div>
          <div className="row between small" style={{ marginTop: 6 }}>
            <span className={g.streak ? 'flame' : 'muted'}>🔥 {g.streak} {g.streak === 1 ? 'Tag' : 'Tage'} in Folge</span>
            <span className="muted">🏅 {unlocked}/{g.achievements.length} Erfolge ›</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Achievements() {
  const g = useGame()
  return (
    <div className="page">
      <h1>Erfolge</h1>
      <p className="sub">Level {g.level} · {g.xp} XP gesamt · 🔥 {g.streak} {g.streak === 1 ? "Tag" : "Tage"} in Folge</p>
      <div className="card">
        <h2>So sammelst du XP</h2>
        <div className="row wrap" style={{ gap: 6 }}>
          {([['💊 Supplement', XP.supplement], ['✅ To-do', XP.todo], ['🔁 Gewohnheit', XP.habit], ['⚖️ Messung', XP.body], ['🏋️ Workout', XP.workout], ['pro Satz', XP.set],
            ['🙏 Dankbarkeit', XP.gratitude], ['😴 Check-in', XP.checkin], ['🍽️ Essen protokolliert (pro Tag)', XP.foodDay], ['💧 Wasserziel', XP.waterGoal],
            ['⏱️ 10 Min. Fokus', XP.focusPer10Min], ['🎯 Ziel erreicht', XP.goal], ['📚 Buch fertig', XP.book]] as const).map(([l, v]) => <span key={l} className="pill">{l} +{v}</span>)}
          <p className="small muted" style={{ width: '100%', margin: '8px 0 0' }}>Jedes Level kostet mehr XP als das davor, wie in Minecraft. Level {g.level + 1} braucht noch {g.need - g.into} XP.</p>
        </div>
      </div>
      <div className="badges">
        {g.achievements.map((a) => (
          <div key={a.id} className={`badge ${a.done ? 'on' : ''}`}>
            <div className="badge-ico">{a.ico}</div>
            <div className="badge-name">{a.name}</div>
            <div className="small muted">{a.desc}</div>
            {a.progress && <div className="pill" style={{ marginTop: 6 }}>{a.progress}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
