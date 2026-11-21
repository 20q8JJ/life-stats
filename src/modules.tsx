import type { ComponentType } from 'react'
import Nutrition from './pages/Nutrition'
import Body from './pages/Body'
import Supplements from './pages/Supplements'
import Profile from './pages/Profile'
import Todos from './pages/Todos'
import Gratitude from './pages/Gratitude'
import Training from './pages/Training'
import Habits from './pages/more/Habits'
import Focus from './pages/more/Focus'
import Notes from './pages/more/Notes'
import Wishlist from './pages/more/Wishlist'
import Goals from './pages/more/Goals'
import Calendar from './pages/more/Calendar'
import Money from './pages/more/Money'
import Car from './pages/more/Car'
import CheckIn from './pages/more/CheckIn'
import Books from './pages/more/Books'
import Reminders from './pages/more/Reminders'
import Shopping from './pages/more/Shopping'
import Review from './pages/more/Review'
import { Achievements } from './game'
import Settings from './pages/Settings'

export type Page =
  | 'today' | 'hub' | 'nutrition' | 'body' | 'training' | 'supps' | 'checkin'
  | 'todos' | 'habits' | 'calendar' | 'reminders' | 'shopping' | 'notes'
  | 'goals' | 'focus' | 'books' | 'gratitude'
  | 'money' | 'wishlist' | 'car'
  | 'review' | 'achievements' | 'profile' | 'settings'

export type Go = (p: Page) => void

export type Mod = { id: Page; label: string; ico: string; desc: string; group: string; C: ComponentType<{ go: Go }> }

const wrap = (C: ComponentType) => C as ComponentType<{ go: Go }>

export const GROUPS = ['Körper & Gesundheit', 'Alltag & Planung', 'Ziele & Wachstum', 'Geld & Besitz', 'Rückblick']

export const MODULES: Mod[] = [
  { id: 'nutrition', label: 'Ernährung', ico: '🍽️', desc: 'Foto, Suche, Makros, Wasser', group: GROUPS[0], C: wrap(Nutrition) },
  { id: 'body', label: 'Körper', ico: '⚖️', desc: 'Tanita-Werte & Verlauf', group: GROUPS[0], C: wrap(Body) },
  { id: 'training', label: 'Training', ico: '🏋️', desc: 'Hevy-Workouts & Rekorde', group: GROUPS[0], C: wrap(Training) },
  { id: 'supps', label: 'Supplements', ico: '💊', desc: 'Plan & abhaken', group: GROUPS[0], C: wrap(Supplements) },
  { id: 'checkin', label: 'Schlaf & Stimmung', ico: '😴', desc: 'Check-in & Bildschirmzeit', group: GROUPS[0], C: wrap(CheckIn) },
  { id: 'todos', label: 'To-dos', ico: '✅', desc: 'Aufgaben mit Fälligkeit', group: GROUPS[1], C: wrap(Todos) },
  { id: 'habits', label: 'Gewohnheiten', ico: '🔁', desc: 'Tägliche Routinen & Streaks', group: GROUPS[1], C: wrap(Habits) },
  { id: 'calendar', label: 'Termine', ico: '📅', desc: 'Plan & Apple-Kalender', group: GROUPS[1], C: wrap(Calendar) },
  { id: 'reminders', label: 'Erinnerungen', ico: '🔔', desc: 'Geburtstage & Wiederkehrendes', group: GROUPS[1], C: wrap(Reminders) },
  { id: 'shopping', label: 'Einkaufsliste', ico: '🛒', desc: 'Schnell abhaken', group: GROUPS[1], C: wrap(Shopping) },
  { id: 'notes', label: 'Notizen', ico: '📝', desc: 'Schnell aufschreiben', group: GROUPS[1], C: wrap(Notes) },
  { id: 'goals', label: 'Ziele', ico: '🎯', desc: 'Fortschritt bis zur Frist', group: GROUPS[2], C: wrap(Goals) },
  { id: 'focus', label: 'Fokus', ico: '⏱️', desc: 'Timer & Fokuszeit', group: GROUPS[2], C: wrap(Focus) },
  { id: 'books', label: 'Bücher', ico: '📚', desc: 'Lesen & Fortschritt', group: GROUPS[2], C: wrap(Books) },
  { id: 'gratitude', label: 'Dankbarkeit', ico: '🙏', desc: 'Drei gute Dinge am Tag', group: GROUPS[2], C: wrap(Gratitude) },
  { id: 'money', label: 'Geld', ico: '💶', desc: 'Ausgaben, Budget, Abos', group: GROUPS[3], C: wrap(Money) },
  { id: 'wishlist', label: 'Wunschliste', ico: '🎁', desc: 'Wünsche & Sparziele', group: GROUPS[3], C: wrap(Wishlist) },
  { id: 'car', label: 'Auto', ico: '🚗', desc: 'Kilometer & Verbrauch', group: GROUPS[3], C: wrap(Car) },
  { id: 'review', label: 'Wochenrückblick', ico: '📊', desc: 'Deine Woche in Zahlen', group: GROUPS[4], C: wrap(Review) },
  { id: 'achievements', label: 'Erfolge & Level', ico: '🏅', desc: 'XP, Level, Abzeichen', group: GROUPS[4], C: wrap(Achievements) },
  { id: 'profile', label: 'Profil', ico: '👤', desc: 'Größe, Ziel, Kalorienbedarf', group: GROUPS[4], C: wrap(Profile) },
  { id: 'settings', label: 'Einstellungen', ico: '⚙️', desc: 'Hell/Dunkel & Farbe', group: GROUPS[4], C: wrap(Settings) },
]

export const SOON = [
  { ico: '🤖', label: 'KI-Coach', desc: 'Tipps aus deinen Daten' },
  { ico: '📍', label: 'Orte', desc: 'Wo du heute warst' },
  { ico: '🖥️', label: 'PC-Bildschirmzeit', desc: 'Automatisch per ActivityWatch' },
  { ico: '🥗', label: 'Rezepte', desc: 'Mit Nährwerten' },
  { ico: '🎉', label: 'Jahresrückblick', desc: 'Dein Jahr wie Wrapped' },
]

