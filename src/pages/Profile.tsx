import { bmr, calorieTarget, macroTargets, useStore } from '../store'

const ACTIVITY = [
  { v: 1.2, label: 'Kaum Bewegung (Bürojob, kein Sport)' },
  { v: 1.375, label: 'Leicht aktiv (1–2× Sport/Woche)' },
  { v: 1.5, label: 'Mäßig aktiv (3–4× Sport/Woche)' },
  { v: 1.7, label: 'Sehr aktiv (5–6× Sport/Woche)' },
  { v: 1.9, label: 'Extrem aktiv (körperliche Arbeit + Sport)' },
]

export default function Profile() {
  const { profile: p, setProfile, body } = useStore()
  const weight = body[body.length - 1]?.weight
  const num = (s: string) => (s === '' ? undefined : +s)
  const t = macroTargets(p, weight)
  const bmi = weight && p.heightCm ? weight / (p.heightCm / 100) ** 2 : undefined

  return (
    <div className="page">
      <h1>Profil</h1>
      <p className="sub">Daraus berechnet die App deinen Kalorienbedarf und deine Tagesziele.</p>

      <div className="card">
        <div className="form-grid">
          <div className="field"><label>Größe (cm)</label><input inputMode="numeric" value={p.heightCm ?? ''} onChange={(e) => setProfile({ heightCm: num(e.target.value) })} /></div>
          <div className="field"><label>Geburtsjahr</label><input inputMode="numeric" value={p.birthYear ?? ''} onChange={(e) => setProfile({ birthYear: num(e.target.value) })} /></div>
          <div className="field">
            <label>Geschlecht</label>
            <select value={p.sex ?? ''} onChange={(e) => setProfile({ sex: (e.target.value || undefined) as 'm' | 'w' | undefined })}>
              <option value="">–</option><option value="m">männlich</option><option value="w">weiblich</option>
            </select>
          </div>
          <div className="field">
            <label>Ziel</label>
            <select value={p.goal} onChange={(e) => setProfile({ goal: e.target.value as typeof p.goal })}>
              <option value="lose">Abnehmen</option><option value="keep">Halten</option><option value="gain">Muskeln aufbauen</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label>Aktivität</label>
          <select value={p.activity} onChange={(e) => setProfile({ activity: +e.target.value })}>
            {ACTIVITY.map((a) => <option key={a.v} value={a.v}>{a.label}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        <h2>Deine Werte</h2>
        {!weight && <p className="muted small">Trag unter „Körper“ dein Gewicht ein, dann erscheinen hier deine Werte.</p>}
        <div className="grid">
          <div className="stat"><div className="label">BMI</div><div className="value">{bmi ? bmi.toFixed(1).replace('.', ',') : '–'}</div></div>
          <div className="stat"><div className="label">Grundumsatz</div><div className="value">{bmr(p, weight) ?? '–'} <span className="small muted">kcal</span></div></div>
          <div className="stat"><div className="label">Kalorienziel</div><div className="value">{calorieTarget(p, weight) ?? '–'} <span className="small muted">kcal</span></div></div>
          <div className="stat"><div className="label">Eiweiß</div><div className="value">{t?.protein ?? '–'} <span className="small muted">g</span></div></div>
          <div className="stat"><div className="label">Fett</div><div className="value">{t?.fat ?? '–'} <span className="small muted">g</span></div></div>
          <div className="stat"><div className="label">Kohlenhydrate</div><div className="value">{t?.carbs ?? '–'} <span className="small muted">g</span></div></div>
        </div>
        <p className="small muted" style={{ marginTop: 12 }}>Berechnet mit der Mifflin-St-Jeor-Formel. Eiweiß: 1,6 g/kg zum Halten, 2 g/kg beim Abnehmen oder Aufbauen.</p>
      </div>

      <div className="card">
        <h2>Daten</h2>
        <p className="small muted">Deine Daten liegen gerade nur auf diesem Gerät. Sobald die App online ist, synchronisieren iPhone und PC.</p>
        <button className="btn ghost" onClick={exportData}>Backup herunterladen</button>
      </div>
    </div>
  )
}

function exportData() {
  const blob = new Blob([localStorage.getItem('life-app-v1') ?? '{}'], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `life-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
}
