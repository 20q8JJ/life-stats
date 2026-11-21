import { useState } from 'react'
import type { CSSProperties } from 'react'
import { AREA, GROUPS, MODULES, SOON, type Go } from '../modules'

export default function Hub({ go }: { go: Go }) {
  const [q, setQ] = useState('')
  const match = (m: { label: string; desc: string }) => !q || (m.label + ' ' + m.desc).toLowerCase().includes(q.toLowerCase())
  return (
    <div className="page">
      <h1>Alle Bereiche</h1>
      <input id="hub-search" className="mini-input" style={{ width: '100%', marginBottom: 16 }} placeholder="🔍 Bereich suchen" value={q} onChange={(e) => setQ(e.target.value)} />
      {GROUPS.map((g) => {
        const mods = MODULES.filter((m) => m.group === g && match(m))
        if (!mods.length) return null
        return (
          <section key={g} style={{ marginBottom: 18, '--area': AREA[g] } as CSSProperties}>
            <div className="group-title">{g}</div>
            <div className="hub-grid">
              {mods.map((m) => (
                <button key={m.id} className="hub-tile" onClick={() => go(m.id)}>
                  <span className="hub-ico">{m.ico}</span>
                  <span className="hub-label">{m.label}</span>
                  <span className="hub-desc">{m.desc}</span>
                </button>
              ))}
            </div>
          </section>
        )
      })}
      {!q && (
        <section>
          <div className="group-title">Kommt bald</div>
          <div className="hub-grid">
            {SOON.map((m) => (
              <div key={m.label} className="hub-tile soon">
                <span className="hub-ico">{m.ico}</span>
                <span className="hub-label">{m.label}</span>
                <span className="hub-desc">{m.desc}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
