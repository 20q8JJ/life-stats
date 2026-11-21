import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { todayStr } from './store'

/** One evening's gratitude entry. */
export type GratitudeDay = {
  date: string // YYYY-MM-DD
  items: string[] // usually 3, empty strings removed on save
  mood?: number // 1-5, optional
}

type GratitudeState = {
  days: Record<string, GratitudeDay>
  saveDay: (date: string, items: string[], mood?: number) => void
  removeDay: (date: string) => void
}

export const useGratitude = create<GratitudeState>()(
  persist(
    (set) => ({
      days: {},
      saveDay: (date, items, mood) =>
        set((s) => {
          const clean = items.map((i) => i.trim()).filter(Boolean)
          const days = { ...s.days }
          if (!clean.length && !mood) delete days[date]
          else days[date] = { date, items: clean, mood }
          return { days }
        }),
      removeDay: (date) =>
        set((s) => {
          const days = { ...s.days }
          delete days[date]
          return { days }
        }),
    }),
    { name: 'life-app-gratitude' },
  ),
)

const shift = (d: string, n: number) => {
  const x = new Date(d + 'T12:00:00')
  x.setDate(x.getDate() + n)
  return todayStr(x)
}

const hasItems = (days: Record<string, GratitudeDay>, d: string) => (days[d]?.items.length ?? 0) > 0

/** Consecutive days with entries, ending today (or yesterday if today is still open). */
export function currentStreak(days: Record<string, GratitudeDay>) {
  let d = todayStr()
  if (!hasItems(days, d)) d = shift(d, -1)
  let n = 0
  while (hasItems(days, d)) {
    n++
    d = shift(d, -1)
  }
  return n
}

export function longestStreak(days: Record<string, GratitudeDay>) {
  const dates = Object.keys(days).filter((d) => hasItems(days, d)).sort()
  let best = 0
  let run = 0
  let prev = ''
  for (const d of dates) {
    run = prev && shift(prev, 1) === d ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  return best
}

const STOP = new Set(
  `ich du er sie es wir ihr mich mir dich dir uns euch sich mein meine meinen meinem meiner dein deine sein seine ihre unser
  der die das den dem des ein eine einen einem einer und oder aber dass für fur mit von zu zum zur auf in im an am bei nach aus
  über unter vor hinter beim vom ins neue neuen heute gestern morgen so sehr auch noch schon nur mal ganz viel viele vielen einfach wieder immer
  ist war sind waren hat habe hatte haben hatten wird werden kann konnte konnten gibt gab gut tag dass wie was wo als
  nicht kein keine dieser diese dieses diesen hier da dann denn weil wenn ob man etwas alles allem allen jeden jede jeder`.split(/\s+/),
)

/** Most frequent meaningful words across all entries. */
export function topWords(days: Record<string, GratitudeDay>, limit = 12) {
  const count: Record<string, number> = {}
  for (const day of Object.values(days))
    for (const item of day.items)
      for (const w of item.toLowerCase().match(/[a-zäöüß]{3,}/g) ?? [])
        if (!STOP.has(w)) count[w] = (count[w] ?? 0) + 1
  return Object.entries(count)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
}

/** Small hook for a dashboard tile. */
export function useGratitudeToday() {
  const days = useGratitude((s) => s.days)
  return { today: days[todayStr()], streak: currentStreak(days), total: Object.keys(days).length }
}

export { shift as shiftDate }
