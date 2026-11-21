import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Mode = 'light' | 'dark' | 'auto'

type Settings = {
  mode: Mode
  accent: string
  setMode: (m: Mode) => void
  setAccent: (c: string) => void
}

export const ACCENTS = [
  { name: 'Signal', hex: '#ff4a1c' },
  { name: 'Kobalt', hex: '#1f4bff' },
  { name: 'Smaragd', hex: '#00a36c' },
  { name: 'Zitrone', hex: '#e5c400' },
  { name: 'Magenta', hex: '#e0157a' },
  { name: 'Violett', hex: '#6b3cff' },
]

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      mode: 'auto',
      accent: ACCENTS[0].hex,
      setMode: (mode) => set({ mode }),
      setAccent: (accent) => set({ accent }),
    }),
    { name: 'life-app-settings' },
  ),
)

/** Black or white, whichever reads better on the given colour. */
function inkOn(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return L > 0.4 ? '#111111' : '#ffffff'
}

const mq = typeof matchMedia !== 'undefined' ? matchMedia('(prefers-color-scheme: dark)') : null

/** Writes mode + accent onto <html> so every CSS token follows. */
export function applyTheme(s: Pick<Settings, 'mode' | 'accent'> = useSettings.getState()) {
  const dark = s.mode === 'dark' || (s.mode === 'auto' && !!mq?.matches)
  const root = document.documentElement
  root.dataset.theme = dark ? 'dark' : 'light'
  root.style.setProperty('--accent', s.accent)
  root.style.setProperty('--on-accent', inkOn(s.accent))
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#121314' : '#e7e8ea')
}

export function initTheme() {
  applyTheme()
  useSettings.subscribe((s) => applyTheme(s))
  mq?.addEventListener?.('change', () => applyTheme())
}

/** Reads a CSS token at runtime (for canvas drawing). */
export const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

/** Shared chart tooltip look: square, ruled, follows the theme. */
export const TIP = { background: 'var(--paper)', border: '2px solid var(--ink)', borderRadius: 0, color: 'var(--ink)', fontSize: 12 }
