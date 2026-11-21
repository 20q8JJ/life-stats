import { useState } from 'react'
import { ACCENTS, useSettings, type Mode } from '../theme'
import { sendLoginLink, signOut, syncConfigured, syncNow, useSync, verifyCode } from '../sync'

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
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
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
      ) : sent ? (
        <>
          <p className="small">E-Mail an <b>{mail}</b> ist unterwegs. Gib den Code daraus hier ein (oder tippe am PC einfach auf den Link). Schau notfalls im Spam-Ordner nach.</p>
          <form className="todo-add" onSubmit={async (e) => {
            e.preventDefault(); setErr('')
            try { await verifyCode(mail.trim(), code.trim()) } catch (x) { setErr(x instanceof Error ? x.message : 'Code passt nicht') }
          }}>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="sync-code">Code aus der E-Mail</label>
              <input id="sync-code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
            </div>
            <button className="btn">Anmelden</button>
          </form>
          <button className="link" style={{ marginTop: 10 }} onClick={() => { setSent(false); setCode('') }}>Andere E-Mail</button>
        </>
      ) : (
        <form className="todo-add" onSubmit={async (e) => {
          e.preventDefault(); setErr('')
          try { await sendLoginLink(mail.trim()); setSent(true) } catch (x) { setErr(x instanceof Error ? x.message : 'Hat nicht geklappt') }
        }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="sync-mail">E-Mail für die Anmeldung</label>
            <input id="sync-mail" type="email" required value={mail} onChange={(e) => setMail(e.target.value)} placeholder="du@beispiel.de" />
          </div>
          <button className="btn">Link senden</button>
        </form>
      )}
      {err && <p className="small" style={{ color: 'var(--bad)' }}>{err}</p>}
    </section>
  )
}
