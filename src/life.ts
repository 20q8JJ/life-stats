import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { todayStr, uid } from './store'

/* Everything beyond the first modules lives here, in its own localStorage key. */

export type Habit = { id: string; name: string; ico: string }
export type FocusSession = { id: string; date: string; minutes: number; label?: string }
export type Note = { id: string; text: string; pinned?: boolean; updatedAt: number }
export type Wish = { id: string; name: string; price?: number; saved?: number; link?: string; done: boolean; doneAt?: string }
export type Goal = { id: string; name: string; ico: string; target: number; current: number; unit: string; deadline?: string; doneAt?: string }
export type CalEvent = { id: string; title: string; date: string; time?: string; note?: string }
export type Tx = { id: string; date: string; amount: number; category: string; note?: string } // amount < 0 = expense
export type Sub = { id: string; name: string; amount: number; cycle: 'month' | 'year' }
export type CarEntry = { id: string; date: string; odometer: number; liters?: number; cost?: number }
export type CheckIn = { sleep?: number; mood?: number; energy?: number; screenPhone?: number; screenPc?: number; note?: string }
export type Book = { id: string; title: string; author?: string; status: 'want' | 'reading' | 'done'; pages?: number; page?: number; doneAt?: string; note?: string }
export type Reminder = { id: string; title: string; ico: string; every: number; unit: 'day' | 'week' | 'month' | 'year'; last: string }
export type ShopItem = { id: string; text: string; done: boolean }
export type Food = {
  id: string; date: string; name: string; kcal: number; protein: number; fat: number; carbs: number; meal: 'Frühstück' | 'Mittag' | 'Abend' | 'Snack'
  grams?: number // amount eaten, when known
  per100?: { kcal: number; protein: number; fat: number; carbs: number } // lets the amount be changed later
}
/** Own foods and saved meals, values per 100 g (portion = typical amount). */
export type MyFood = { id: string; name: string; per100: { kcal: number; protein: number; fat: number; carbs: number }; portion?: number; portionLabel?: string; brand?: string }

type Data = {
  habits: Habit[]
  habitLog: Record<string, string[]>
  focus: FocusSession[]
  notes: Note[]
  wishes: Wish[]
  goals: Goal[]
  events: CalEvent[]
  txs: Tx[]
  subs: Sub[]
  budget: number
  car: CarEntry[]
  checkins: Record<string, CheckIn>
  books: Book[]
  reminders: Reminder[]
  shop: ShopItem[]
  food: Food[]
  myFoods: MyFood[]
  geminiKey: string
  water: Record<string, number> // ml per day
  waterGoal: number
}

type Actions = {
  /** Generic list helpers: add / patch / remove an item in any id-list field. */
  add: <K extends ListKey>(key: K, item: Omit<ItemOf<K>, 'id'>) => void
  patch: <K extends ListKey>(key: K, id: string, p: Partial<ItemOf<K>>) => void
  remove: (key: ListKey, id: string) => void
  toggleHabit: (date: string, id: string) => void
  setCheckIn: (date: string, p: Partial<CheckIn>) => void
  addWater: (date: string, ml: number) => void
  set: (p: Partial<Data>) => void
}

type ListKey = 'habits' | 'focus' | 'notes' | 'wishes' | 'goals' | 'events' | 'txs' | 'subs' | 'car' | 'books' | 'reminders' | 'shop' | 'food' | 'myFoods'
type ItemOf<K extends ListKey> = Data[K] extends (infer T)[] ? T : never

const defaults: Data = {
  habits: [
    { id: uid(), name: '10 Min. lesen', ico: '📖' },
    { id: uid(), name: 'Kein Handy nach 23 Uhr', ico: '📵' },
    { id: uid(), name: '8.000 Schritte', ico: '🚶' },
  ],
  habitLog: {},
  focus: [],
  notes: [],
  wishes: [],
  goals: [],
  events: [],
  txs: [],
  subs: [],
  budget: 800,
  car: [],
  checkins: {},
  books: [],
  reminders: [],
  shop: [],
  food: [],
  myFoods: [],
  geminiKey: '',
  water: {},
  waterGoal: 2500,
}

export const useLife = create<Data & Actions>()(
  persist(
    (set) => ({
      ...defaults,
      add: (key, item) => set((s) => ({ [key]: [...(s[key] as { id: string }[]), { ...item, id: uid() }] }) as Partial<Data>),
      patch: (key, id, p) =>
        set((s) => ({ [key]: (s[key] as { id: string }[]).map((x) => (x.id === id ? { ...x, ...p } : x)) }) as Partial<Data>),
      remove: (key, id) => set((s) => ({ [key]: (s[key] as { id: string }[]).filter((x) => x.id !== id) }) as Partial<Data>),
      toggleHabit: (date, id) =>
        set((s) => {
          const cur = s.habitLog[date] ?? []
          return { habitLog: { ...s.habitLog, [date]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] } }
        }),
      setCheckIn: (date, p) => set((s) => ({ checkins: { ...s.checkins, [date]: { ...s.checkins[date], ...p } } })),
      addWater: (date, ml) => set((s) => ({ water: { ...s.water, [date]: Math.max(0, (s.water[date] ?? 0) + ml) } })),
      set: (p) => set(p),
    }),
    { name: 'life-app-more' },
  ),
)

/* ---------- helpers ---------- */

export const shiftDay = (d: string, n: number) => {
  const x = new Date(d + 'T12:00:00')
  x.setDate(x.getDate() + n)
  return todayStr(x)
}
export const lastDays = (n: number) => Array.from({ length: n }, (_, i) => shiftDay(todayStr(), i - n + 1))
export const fmtDate = (d: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: '2-digit', month: '2-digit' }) =>
  new Date(d + 'T12:00:00').toLocaleDateString('de-DE', opts)
export const euro = (n: number) => n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
export const num = (s: string) => {
  const v = parseFloat(s.replace(',', '.'))
  return isNaN(v) ? undefined : v
}

export function habitStreak(log: Record<string, string[]>, id: string) {
  let n = 0
  let d = todayStr()
  if (!log[d]?.includes(id)) d = shiftDay(d, -1)
  while (log[d]?.includes(id)) { n++; d = shiftDay(d, -1) }
  return n
}

export function nextDue(r: Reminder) {
  const d = new Date(r.last + 'T12:00:00')
  if (r.unit === 'day') d.setDate(d.getDate() + r.every)
  if (r.unit === 'week') d.setDate(d.getDate() + 7 * r.every)
  if (r.unit === 'month') d.setMonth(d.getMonth() + r.every)
  if (r.unit === 'year') d.setFullYear(d.getFullYear() + r.every)
  return todayStr(d)
}
export const daysUntil = (d: string) => Math.round((new Date(d + 'T12:00:00').getTime() - new Date(todayStr() + 'T12:00:00').getTime()) / 864e5)

export const monthlySubs = (subs: Sub[]) => subs.reduce((a, s) => a + (s.cycle === 'month' ? s.amount : s.amount / 12), 0)

export function foodTotals(food: Food[], date: string) {
  return food.filter((f) => f.date === date).reduce(
    (a, f) => ({ kcal: a.kcal + f.kcal, protein: a.protein + f.protein, fat: a.fat + f.fat, carbs: a.carbs + f.carbs }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0 },
  )
}

/** iCalendar file so a plan entry can be added to the Apple / Outlook calendar. */
export function icsFor(events: CalEvent[]) {
  const pad = (s: string) => s.replace(/[,;\\]/g, (c) => '\\' + c).replace(/\n/g, '\\n')
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Life App//DE']
  for (const e of events) {
    const d = e.date.replace(/-/g, '')
    lines.push('BEGIN:VEVENT', `UID:${e.id}@life-app`, `SUMMARY:${pad(e.title)}`)
    if (e.time) {
      const t = e.time.replace(':', '') + '00'
      lines.push(`DTSTART:${d}T${t}`, `DURATION:PT1H`)
    } else {
      lines.push(`DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${shiftDay(e.date, 1).replace(/-/g, '')}`)
    }
    if (e.note) lines.push(`DESCRIPTION:${pad(e.note)}`)
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function download(name: string, content: string, type: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content], { type }))
  a.download = name
  a.click()
}
