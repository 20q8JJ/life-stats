import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** One measurement from the Tanita InnerScan (or manual). Only weight is required. */
export type BodyEntry = {
  id: string
  date: string // YYYY-MM-DD
  weight: number // kg
  bodyFat?: number // %
  muscle?: number // kg
  water?: number // %
  visceral?: number // rating 1-59
  bone?: number // kg
  metabolicAge?: number // years
  waist?: number // cm
}

export type Supplement = {
  id: string
  name: string
  dose: string
  time: string // HH:MM
  note?: string
}

export type Profile = {
  heightCm?: number
  birthYear?: number
  sex?: 'm' | 'w'
  activity: number // PAL factor
  goal: 'lose' | 'keep' | 'gain'
}

export type Todo = {
  id: string
  text: string
  done: boolean
  due?: string // YYYY-MM-DD
  important?: boolean
  createdAt: number
  doneAt?: string // YYYY-MM-DD
}

type State = {
  todos: Todo[]
  addTodo: (t: Pick<Todo, 'text' | 'due' | 'important'>) => void
  toggleTodo: (id: string) => void
  removeTodo: (id: string) => void
  clearDoneTodos: () => void
  body: BodyEntry[]
  supplements: Supplement[]
  /** date -> list of supplement ids taken that day */
  taken: Record<string, string[]>
  profile: Profile
  addBody: (e: Omit<BodyEntry, 'id'>) => void
  removeBody: (id: string) => void
  addSupplement: (s: Omit<Supplement, 'id'>) => void
  updateSupplement: (s: Supplement) => void
  removeSupplement: (id: string) => void
  toggleTaken: (date: string, id: string) => void
  setProfile: (p: Partial<Profile>) => void
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

export const todayStr = (d = new Date()) => {
  const z = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
}

const defaultSupplements: Supplement[] = [
  { id: uid(), name: 'Eisen', dose: '1 Tablette', time: '08:00', note: 'Nüchtern, nicht mit Magnesium' },
  { id: uid(), name: 'Vitamin C', dose: '500 mg', time: '08:00', note: 'Verbessert Eisenaufnahme' },
  { id: uid(), name: 'Proteinpulver', dose: '30 g', time: '19:00' },
  { id: uid(), name: 'Kreatin', dose: '5 g', time: '19:00' },
  { id: uid(), name: 'Magnesium', dose: '400 mg', time: '21:00' },
]

export const useStore = create<State>()(
  persist(
    (set) => ({
      todos: [],
      addTodo: (t) => set((s) => ({ todos: [{ ...t, id: uid(), done: false, createdAt: Date.now() }, ...s.todos] })),
      toggleTodo: (id) =>
        set((s) => ({
          todos: s.todos.map((t) => (t.id === id ? { ...t, done: !t.done, doneAt: t.done ? undefined : todayStr() } : t)),
        })),
      removeTodo: (id) => set((s) => ({ todos: s.todos.filter((t) => t.id !== id) })),
      clearDoneTodos: () => set((s) => ({ todos: s.todos.filter((t) => !t.done) })),
      body: [],
      supplements: defaultSupplements,
      taken: {},
      profile: { activity: 1.5, goal: 'keep' },
      addBody: (e) =>
        set((s) => ({
          body: [...s.body.filter((b) => b.date !== e.date), { ...e, id: uid() }].sort((a, b) =>
            a.date.localeCompare(b.date),
          ),
        })),
      removeBody: (id) => set((s) => ({ body: s.body.filter((b) => b.id !== id) })),
      addSupplement: (x) => set((s) => ({ supplements: [...s.supplements, { ...x, id: uid() }] })),
      updateSupplement: (x) =>
        set((s) => ({ supplements: s.supplements.map((y) => (y.id === x.id ? x : y)) })),
      removeSupplement: (id) => set((s) => ({ supplements: s.supplements.filter((y) => y.id !== id) })),
      toggleTaken: (date, id) =>
        set((s) => {
          const cur = s.taken[date] ?? []
          const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
          return { taken: { ...s.taken, [date]: next } }
        }),
      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
    }),
    { name: 'life-app-v1' },
  ),
)

/** Mifflin-St Jeor basal metabolic rate. */
export function bmr(p: Profile, weight?: number): number | undefined {
  if (!weight || !p.heightCm || !p.birthYear || !p.sex) return
  const age = new Date().getFullYear() - p.birthYear
  return Math.round(10 * weight + 6.25 * p.heightCm - 5 * age + (p.sex === 'm' ? 5 : -161))
}

export function calorieTarget(p: Profile, weight?: number) {
  const b = bmr(p, weight)
  if (!b) return
  const tdee = b * p.activity
  const adj = p.goal === 'lose' ? -400 : p.goal === 'gain' ? 300 : 0
  return Math.round(tdee + adj)
}

export function macroTargets(p: Profile, weight?: number) {
  const kcal = calorieTarget(p, weight)
  if (!kcal || !weight) return
  const protein = Math.round(weight * (p.goal === 'keep' ? 1.6 : 2))
  const fat = Math.round((kcal * 0.27) / 9)
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4))
  return { kcal, protein, fat, carbs }
}
