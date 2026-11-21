import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js'
import { create } from 'zustand'
import { useStore } from './store'
import { useLife } from './life'
import { useWorkouts } from './workouts'
import { useGratitude } from './gratitude'

/*
  Cloud sync via Supabase.
  Each localStorage key below is one row in table `kv` (user_id, key, value, updated_at).
  Row Level Security makes sure every account only ever sees its own rows.
  Strategy: last write wins per key. Good enough for one person on two devices.
*/

const URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || localStorage.getItem('life-sync-url') || ''
const KEY = (import.meta.env.VITE_SUPABASE_KEY as string | undefined) || localStorage.getItem('life-sync-key') || ''

type Rehydrate = () => unknown
const KEYS: Record<string, Rehydrate | null> = {
  'life-app-v1': () => useStore.persist.rehydrate(),
  'life-app-more': () => useLife.persist.rehydrate(),
  'life-app-workouts': () => useWorkouts.persist.rehydrate(),
  'life-app-gratitude': () => useGratitude.persist.rehydrate(),
  'life-app-seen-achievements': null,
}
const META = 'life-sync-meta' // { [key]: { at: ISO of last synced remote version, sent: string pushed last } }

type Meta = Record<string, { at: string; sent: string }>
const readMeta = (): Meta => { try { return JSON.parse(localStorage.getItem(META) || '{}') } catch { return {} } }
const writeMeta = (m: Meta) => localStorage.setItem(META, JSON.stringify(m))

export type SyncStatus = 'off' | 'signed-out' | 'syncing' | 'ok' | 'error'
type SyncState = { status: SyncStatus; email?: string; lastSync?: number; error?: string }
export const useSync = create<SyncState>(() => ({ status: URL && KEY ? 'signed-out' : 'off' }))

export const syncConfigured = () => !!(URL && KEY)
let sb: SupabaseClient | null = null
let session: Session | null = null
let applying = false
let timer: ReturnType<typeof setTimeout> | undefined

/** Pull newer remote rows into localStorage, then push local changes. */
export async function syncNow() {
  if (!sb || !session) return
  useSync.setState({ status: 'syncing', error: undefined })
  try {
    const meta = readMeta()
    const { data, error } = await sb.from('kv').select('key, value, updated_at')
    if (error) throw error
    const remote = new Map((data ?? []).map((r) => [r.key as string, r as { key: string; value: unknown; updated_at: string }]))

    // 1) remote → local when the cloud has a version this device hasn't seen yet
    applying = true
    for (const [key, rehydrate] of Object.entries(KEYS)) {
      const r = remote.get(key)
      if (!r) continue
      const m = meta[key]
      const local = localStorage.getItem(key)
      const localDirty = !!m && local !== m.sent
      const remoteNewer = !m || Date.parse(r.updated_at) > Date.parse(m.at)
      // First sync on this device: the cloud wins. Both changed: the later edit wins.
      const take = !m || (remoteNewer && (!localDirty || lastEdit() < Date.parse(r.updated_at)))
      if (take) {
        const str = JSON.stringify(r.value)
        localStorage.setItem(key, str)
        meta[key] = { at: r.updated_at, sent: str }
        await rehydrate?.()
      }
    }
    applying = false

    // 2) local → remote for every key that changed since it was last sent
    const rows = []
    for (const key of Object.keys(KEYS)) {
      const local = localStorage.getItem(key)
      if (local == null || local === meta[key]?.sent) continue
      rows.push({ user_id: session.user.id, key, value: JSON.parse(local), updated_at: new Date().toISOString() })
    }
    if (rows.length) {
      const { error: e2 } = await sb.from('kv').upsert(rows)
      if (e2) throw e2
      for (const r of rows) meta[r.key] = { at: r.updated_at, sent: JSON.stringify(r.value) }
    }
    writeMeta(meta)
    useSync.setState({ status: 'ok', lastSync: Date.now() })
  } catch (e) {
    applying = false
    useSync.setState({ status: 'error', error: e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e) })
  }
}

const lastEdit = () => Number(localStorage.getItem('life-sync-edit') || 0)

const schedule = () => {
  if (applying) return
  localStorage.setItem('life-sync-edit', String(Date.now()))
  if (!session) return
  clearTimeout(timer)
  timer = setTimeout(syncNow, 2000)
}

const de = (m: string) =>
  /invalid login/i.test(m) ? 'E-Mail oder Passwort stimmt nicht.' :
  /not confirmed/i.test(m) ? 'Bitte bestätige zuerst den Link in der E-Mail von Supabase.' :
  /already registered/i.test(m) ? 'Für diese E-Mail gibt es schon ein Konto. Melde dich einfach an.' :
  /at least 6/i.test(m) ? 'Das Passwort braucht mindestens 6 Zeichen.' :
  /signups? not allowed|disabled/i.test(m) ? 'Neue Konten sind gesperrt. Melde dich mit deinem bestehenden Konto an.' :
  /rate limit/i.test(m) ? 'Zu viele Versuche. Warte ein paar Minuten.' : m

/** Create the account. Returns true when Supabase wants the e-mail confirmed first. */
export async function signUp(email: string, password: string) {
  if (!sb) throw new Error('Sync ist noch nicht eingerichtet.')
  const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } })
  if (error) throw new Error(de(error.message))
  return !data.session
}

export async function signIn(email: string, password: string) {
  if (!sb) throw new Error('Sync ist noch nicht eingerichtet.')
  const { error } = await sb.auth.signInWithPassword({ email, password })
  if (error) throw new Error(de(error.message))
}

export async function signOut() {
  await sb?.auth.signOut()
  localStorage.removeItem(META)
}

export function initSync() {
  if (!URL || !KEY) return
  sb = createClient(URL, KEY, { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce' } })
  sb.auth.onAuthStateChange((_ev, s) => {
    session = s
    useSync.setState({ status: s ? 'ok' : 'signed-out', email: s?.user.email })
    if (s) setTimeout(syncNow, 0)
  })
  useStore.subscribe(schedule)
  useLife.subscribe(schedule)
  useWorkouts.subscribe(schedule)
  useGratitude.subscribe(schedule)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncNow() })
  setInterval(() => { if (document.visibilityState === 'visible') syncNow() }, 60_000)
}

/** SQL the user runs once in the Supabase SQL editor. */
export const SETUP_SQL = `create table if not exists kv (
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table kv enable row level security;
create policy "own rows" on kv for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);`
