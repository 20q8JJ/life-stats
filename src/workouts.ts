import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { uid } from './store'

export type WSet = { kg?: number; reps?: number; secs?: number; warmup?: boolean }
export type Exercise = { name: string; sets: WSet[] }
/** A sport session logged by hand (e.g. volleyball) instead of an exercise list from Hevy. */
export type SportLog = {
  kind: 'volleyball'
  mode: 'training' | 'match'
  minutes?: number
  sets?: number
  games?: number
  muscles: string[]
  note?: string
}
export type Workout = { id: string; title: string; date: string /* ISO local datetime */; url?: string; exercises: Exercise[]; sport?: SportLog }

/** Muscle groups volleyball works, with how hard (3 = stark, 2 = mittel, 1 = leicht). */
export const VOLLEYBALL_MUSCLES: { name: string; load: 1 | 2 | 3; why: string }[] = [
  { name: 'Oberschenkel', load: 3, why: 'Sprünge, Block, tiefe Annahme' },
  { name: 'Waden', load: 3, why: 'Absprung, schnelle Schritte' },
  { name: 'Gesäß', load: 3, why: 'Sprungkraft, Bereitschaftsstellung' },
  { name: 'Schultern', load: 3, why: 'Angriff, Aufschlag, Block' },
  { name: 'Core', load: 2, why: 'Rotation beim Schlag, Stabilität in der Luft' },
  { name: 'Oberer Rücken', load: 2, why: 'Ausholen beim Angriff' },
  { name: 'Brust', load: 1, why: 'Schlagbewegung' },
  { name: 'Arme', load: 2, why: 'Pritschen, Baggern, Schlag' },
  { name: 'Unterarme & Hände', load: 1, why: 'Pritschen, Handgelenk beim Schlag' },
]
export const loadLabel = { 1: 'leicht', 2: 'mittel', 3: 'stark' } as const

export function sportSummary(s: SportLog) {
  const parts: string[] = []
  if (s.minutes) parts.push(s.minutes >= 60 ? `${Math.floor(s.minutes / 60)}:${z(s.minutes % 60)} h` : `${s.minutes} min`)
  if (s.sets) parts.push(`${s.sets} ${s.sets === 1 ? 'Satz' : 'Sätze'}`)
  if (s.games) parts.push(`${s.games} ${s.games === 1 ? 'Spiel' : 'Spiele'}`)
  return parts.join(' · ')
}

type WState = {
  workouts: Workout[]
  /** Adds or replaces (same Hevy link or same title + time). Returns true if it replaced one. */
  saveWorkout: (w: Omit<Workout, 'id'>) => boolean
  removeWorkout: (id: string) => void
}

export const useWorkouts = create<WState>()(
  persist(
    (set, get) => ({
      workouts: [],
      saveWorkout: (w) => {
        const same = (x: Workout) => (w.url && x.url === w.url) || (x.title === w.title && x.date === w.date)
        const existing = get().workouts.find(same)
        set((s) => ({
          workouts: [...s.workouts.filter((x) => !same(x)), { ...w, id: existing?.id ?? uid() }].sort((a, b) => a.date.localeCompare(b.date)),
        }))
        return !!existing
      },
      removeWorkout: (id) => set((s) => ({ workouts: s.workouts.filter((x) => x.id !== id) })),
    }),
    { name: 'life-app-workouts' },
  ),
)

const MONTHS: Record<string, number> = {
  jan: 1, januar: 1, january: 1, feb: 2, februar: 2, february: 2, mär: 3, märz: 3, mar: 3, march: 3, maerz: 3,
  apr: 4, april: 4, mai: 5, may: 5, jun: 6, juni: 6, june: 6, jul: 7, juli: 7, july: 7, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9, okt: 10, oktober: 10, oct: 10, october: 10, nov: 11, november: 11, dez: 12, dezember: 12, dec: 12, december: 12,
}
const z = (n: number) => String(n).padStart(2, '0')

/** "Donnerstag, 19. Nov. 2026 um 18:43" or "Thursday, Nov 19, 2026 at 6:43pm" → "2026-11-19T18:43" */
function parseDate(line: string): string | undefined {
  let m = line.match(/(\d{1,2})\.\s*([A-Za-zÄäöüß]+)\.?\s+(\d{4})(?:.*?(\d{1,2}):(\d{2}))?/)
  if (m && MONTHS[m[2].toLowerCase()]) {
    return `${m[3]}-${z(MONTHS[m[2].toLowerCase()])}-${z(+m[1])}T${z(+(m[4] ?? 12))}:${m[5] ?? '00'}`
  }
  m = line.match(/([A-Za-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})(?:.*?(\d{1,2}):(\d{2})\s*(am|pm)?)?/i)
  if (m && MONTHS[m[1].toLowerCase()]) {
    let h = +(m[4] ?? 12)
    if (m[6]?.toLowerCase() === 'pm' && h < 12) h += 12
    if (m[6]?.toLowerCase() === 'am' && h === 12) h = 0
    return `${m[3]}-${z(MONTHS[m[1].toLowerCase()])}-${z(+m[2])}T${z(h)}:${m[5] ?? '00'}`
  }
}

const SET_RE = /^(set|satz)\s*\d+\s*:?\s*(.*)$|^(w|warm[- ]?up|aufwärm\w*)\s*:\s*(.*)$/i

function parseSet(text: string, warmup: boolean): WSet | undefined {
  const t = text.toLowerCase().replace(',', '.')
  const s: WSet = warmup ? { warmup } : {}
  const kgx = t.match(/([\d.]+)\s*(kg|lbs?)\s*[x×]\s*(\d+)/)
  if (kgx) {
    s.kg = +kgx[1] * (kgx[2].startsWith('lb') ? 0.4536 : 1)
    s.kg = Math.round(s.kg * 10) / 10
    s.reps = +kgx[3]
    return s
  }
  const reps = t.match(/(\d+)\s*(wiederholungen|wiederholung|wdh|reps?)\b/) ?? t.match(/^(\d+)\s*$/)
  if (reps) return { ...s, reps: +reps[1] }
  const time = t.match(/^(?:(\d+)\s*h)?\s*(?:(\d+)\s*min)?\s*(?:(\d+)\s*s(?:ek|ec)?\w*)?$/)
  if (time && (time[1] || time[2] || time[3])) return { ...s, secs: +(time[1] ?? 0) * 3600 + +(time[2] ?? 0) * 60 + +(time[3] ?? 0) }
  const clock = t.match(/^(\d+):(\d{2})$/)
  if (clock) return { ...s, secs: +clock[1] * 60 + +clock[2] }
}

/** Parses the text Hevy produces when sharing a workout. Returns undefined if nothing usable was found. */
export function parseHevy(raw: string): Omit<Workout, 'id'> | undefined {
  const lines = raw.split(/\r?\n/).map((l) => l.trim())
  const url = raw.match(/https?:\/\/\S+/)?.[0]
  let title = ''
  let date: string | undefined
  const exercises: Exercise[] = []
  let current: Exercise | undefined
  let pendingName: string | undefined

  for (const line of lines) {
    if (!line) continue
    if (line.startsWith('@') || /^https?:\/\//.test(line)) continue
    const sm = line.match(SET_RE)
    if (sm) {
      const set = parseSet(sm[2] ?? sm[4] ?? '', !!sm[3])
      if (pendingName) {
        current = { name: pendingName, sets: [] }
        exercises.push(current)
        pendingName = undefined
      }
      if (set && current) current.sets.push(set)
      continue
    }
    if (!date) {
      const d = parseDate(line)
      if (d) { date = d; continue }
    }
    if (!title) { title = line; continue }
    // Any other line is a candidate exercise name; it becomes one when sets follow.
    pendingName = line.replace(/\s*\(\s*\)\s*$/, '')
    current = undefined
  }
  const ex = exercises.filter((e) => e.sets.length)
  if (!ex.length) return
  if (!date) {
    const n = new Date()
    date = `${n.getFullYear()}-${z(n.getMonth() + 1)}-${z(n.getDate())}T${z(n.getHours())}:${z(n.getMinutes())}`
  }
  return { title: title || 'Workout', date, url, exercises: ex }
}

export const workSets = (e: Exercise) => e.sets.filter((s) => !s.warmup)
export const volume = (w: Workout) =>
  w.exercises.reduce((a, e) => a + workSets(e).reduce((b, s) => b + (s.kg ?? 0) * (s.reps ?? 0), 0), 0)
export const setCount = (w: Workout) => w.exercises.reduce((a, e) => a + workSets(e).length, 0)

export function fmtSecs(s: number) {
  return s >= 60 ? `${Math.floor(s / 60)}:${z(s % 60)} min` : `${s} s`
}
export function fmtSet(s: WSet) {
  if (s.kg != null && s.reps != null) return `${String(s.kg).replace('.', ',')} kg × ${s.reps}`
  if (s.reps != null) return `${s.reps} Wdh.`
  if (s.secs != null) return fmtSecs(s.secs)
  return '–'
}

/** Kind of metric that best describes an exercise. */
export function exerciseKind(sets: WSet[]): 'kg' | 'reps' | 'secs' {
  if (sets.some((s) => s.kg)) return 'kg'
  if (sets.some((s) => s.secs)) return 'secs'
  return 'reps'
}

/** Best value of one exercise in one workout (est. 1RM for weights, max reps or max hold otherwise). */
export function bestOf(sets: WSet[], kind: 'kg' | 'reps' | 'secs') {
  const ws = sets.filter((s) => !s.warmup)
  if (kind === 'kg') return Math.max(0, ...ws.map((s) => Math.round((s.kg ?? 0) * (1 + (s.reps ?? 0) / 30) * 10) / 10))
  if (kind === 'secs') return Math.max(0, ...ws.map((s) => s.secs ?? 0))
  return Math.max(0, ...ws.map((s) => s.reps ?? 0))
}

/** Workouts in the current Mon–Sun week. */
export function thisWeek(ws: Workout[]) {
  const d = new Date()
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7))
  const start = `${monday.getFullYear()}-${z(monday.getMonth() + 1)}-${z(monday.getDate())}`
  return ws.filter((w) => w.date.slice(0, 10) >= start)
}
