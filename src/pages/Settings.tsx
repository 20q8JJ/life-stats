import { useState } from 'react'
import { ACCENTS, useSettings, type Mode } from '../theme'
import { signIn, signOut, signUp, syncConfigured, syncNow, useSync } from '../sync'

const MODES: { id: Mode; label: string }[] = [
  { id: 'light', label: 'Hell' },
  { id: 'dark', label: 'Dunkel' },
  { id: 'auto', label: 'Automatisch' },
]

export default function Settings() {
  const { mode, accent, setMode, setAccent } = useSettings()
  const custom = !ACCENTS.some((a) => a.hex.toLowerCase() === accent.toLowerCase())
  return (
    <div className="page">
      <h1>Einstellungen</h1>
      <p className="sub">So sieht Life/Stats für dich aus. Wird auf diesem Gerät gespeichert.</p>

      <section className="card">
        <h2>Darstellung</h2>
        <div className="tabs">
          {MODES.map((m) => (
            <button key={m.id} className={'chip' + (mode === m.id ? ' on' : '')} onClick={() => setMode(m.id)}>{m.label}</button>
          ))}
        </div>
        <p className="muted small">Automatisch folgt der Einstellung von iPhone bzw. Windows.</p>
      </section>

      <section className="card">
        <h2>Akzentfarbe</h2>
        <div className="swatches" role="radiogroup" aria-label="Akzentfarbe">
          {ACCENTS.map((a) => (
            <button key={a.hex} role="radio" aria-checked={accent === a.hex} title={a.name}
              className={'swatch' + (accent.toLowerCase() === a.hex ? ' on' : '')} style={{ background: a.hex }} onClick={() => setAccent(a.hex)} />
          ))}
        </div>
        <label className="picker">
          <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} />
          <span>
            <b>Eigene Farbe</b> <span className="pill">{accent.toUpperCase()}</span>
            <br /><span className="muted small">{custom ? 'Deine eigene Farbe ist aktiv.' : 'Tippen, um jede beliebige Farbe zu wählen.'}</span>
          </span>
        </label>
      </section>

      <SyncCard />

      <section className="card">
        <h2>Vorschau</h2>
        <div className="row wrap" style={{ gap: 14, alignItems: 'flex-end' }}>
          <div className="big">72<span style={{ color: 'var(--accent)' }}>.4</span></div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div className="label">Fortschritt</div>
            <div className="xpbar"><div style={{ width: '62%' }} /></div>
          </div>
          <button className="btn">Speichern</button>
        </div>
      </section>
    </div>
  )
}

function SyncCard() {
  const { status, email, lastSync, error } = useSync()
  const [mail, setMail] = useState('')
  const [pw, setPw] = useState('')
  const [isNew, setIsNew] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  if (!syncConfigured()) {
    return (
      <section className="card">
        <h2>Konto & Sync</h2>
        <p className="muted small">Noch nicht eingerichtet. Sobald die App online ist, kannst du dich hier anmelden und hast auf iPhone und PC dieselben Daten.</p>
      </section>
    )
  }
  const signedIn = status !== 'signed-out'
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      if (isNew) { if (await signUp(mail.trim(), pw)) setConfirm(true) }
      else await signIn(mail.trim(), pw)
    } catch (x) { setErr(x instanceof Error ? x.message : 'Hat nicht geklappt') }
    setBusy(false)
  }
  return (
    <section className="card">
      <div className="row between"><h2>Konto & Sync</h2>{signedIn && <span className="pill">{status === 'syncing' ? 'Sync …' : status === 'error' ? 'Fehler' : 'Aktiv'}</span>}</div>
      {signedIn ? (
        <>
          <p className="small">Angemeldet als <b>{email}</b>. Deine Daten werden automatisch zwischen deinen Geräten abgeglichen.</p>
          <p className="muted small">{lastSync ? `Zuletzt abgeglichen um ${new Date(lastSync).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr` : 'Noch nicht abgeglichen'}</p>
          {error && <p className="small" style={{ color: 'var(--bad)' }}>{error}</p>}
          <div className="row wrap">
            <button className="btn" onClick={() => syncNow()}>Jetzt abgleichen</button>
            <button className="btn ghost" onClick={() => signOut()}>Abmelden</button>
          </div>
        </>
      ) : confirm ? (
        <>
          <p className="small">Fast geschafft: Supabase hat dir eine E-Mail an <b>{mail}</b> geschickt. Tippe dort auf den Bestätigungs-Link (egal in welchem Browser), komm dann hierher zurück und melde dich an. Schau notfalls im Spam-Ordner nach.</p>
          <button className="btn" onClick={() => { setConfirm(false); setIsNew(false) }}>Zur Anmeldung</button>
        </>
      ) : (
        <form onSubmit={submit}>
          <div className="tabs">
            <button type="button" className={'chip' + (!isNew ? ' on' : '')} onClick={() => setIsNew(false)}>Anmelden</button>
            <button type="button" className={'chip' + (isNew ? ' on' : '')} onClick={() => setIsNew(true)}>Konto erstellen</button>
          </div>
          <div className="form-grid">
            <div className="field"><label htmlFor="sync-mail">E-Mail</label><input id="sync-mail" type="email" autoComplete="email" required value={mail} onChange={(e) => setMail(e.target.value)} /></div>
            <div className="field"><label htmlFor="sync-pw">Passwort</label><input id="sync-pw" type="password" autoComplete={isNew ? 'new-password' : 'current-password'} required minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} /></div>
          </div>
          <button className="btn" disabled={busy}>{busy ? '…' : isNew ? 'Konto erstellen' : 'Anmelden'}</button>
          {isNew && <p className="muted small">Einmalig. Auf dem zweiten Gerät meldest du dich dann einfach an.</p>}
        </form>
      )}
      {err && <p className="small" style={{ color: 'var(--bad)' }}>{err}</p>}
    </section>
  )
}
