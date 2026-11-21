import { useState } from 'react'
import ConfirmButton from '../../ConfirmButton'
import { euro, num, useLife } from '../../life'
import { todayStr } from '../../store'

export default function Wishlist() {
  const { wishes, add, patch, remove } = useLife()
  const [f, setF] = useState({ name: '', price: '', link: '' })
  const open = wishes.filter((w) => !w.done)
  const done = wishes.filter((w) => w.done)
  const total = open.reduce((a, w) => a + (w.price ?? 0), 0)
  const saved = open.reduce((a, w) => a + (w.saved ?? 0), 0)

  const save = () => {
    if (!f.name.trim()) return
    add('wishes', { name: f.name.trim(), price: num(f.price), link: f.link.trim() || undefined, done: false })
    setF({ name: '', price: '', link: '' })
  }

  return (
    <div className="page">
      <h1>Wunschliste</h1>
      <p className="sub">{open.length} Wünsche · {euro(total)} gesamt · {euro(saved)} schon gespart</p>
      <div className="card">
        <div className="form-grid">
          <div className="field"><label>Was?</label><input id="wish-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="z. B. Kopfhörer" /></div>
          <div className="field"><label>Preis (€)</label><input id="wish-price" inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></div>
          <div className="field"><label>Link</label><input id="wish-link" value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} placeholder="optional" /></div>
        </div>
        <button className="btn" onClick={save} disabled={!f.name.trim()}>Hinzufügen</button>
      </div>
      <div className="card">
        {!open.length && <div className="empty">Wunschliste ist leer.</div>}
        {open.map((w) => {
          const pct = w.price ? Math.min(1, (w.saved ?? 0) / w.price) : 0
          return (
            <div key={w.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
              <div className="row" style={{ gap: 12 }}>
                <div className="box" style={{ cursor: 'pointer' }} onClick={() => patch('wishes', w.id, { done: true, doneAt: todayStr() })} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ overflowWrap: 'anywhere' }}>{w.name} {w.link && <a className="link" href={w.link} target="_blank" rel="noreferrer">↗</a>}</div>
                  {w.price != null && <div className="small muted">{euro(w.saved ?? 0)} von {euro(w.price)} gespart</div>}
                </div>
                <ConfirmButton onConfirm={() => remove('wishes', w.id)} />
              </div>
              {w.price != null && <div className="bar" style={{ marginTop: 8 }}><div style={{ width: `${pct * 100}%`, background: 'linear-gradient(90deg,var(--accent),var(--accent2))' }} /></div>}
              {w.price != null && <SaveInput onAdd={(n) => patch('wishes', w.id, { saved: (w.saved ?? 0) + n })} />}
            </div>
          )
        })}
      </div>
      {done.length > 0 && (
        <div className="card">
          <h2>Erfüllt 🎁</h2>
          {done.map((w) => (
            <div key={w.id} className="check done" onClick={() => patch('wishes', w.id, { done: false, doneAt: undefined })}>
              <div className="box">✓</div><div className="name" style={{ flex: 1 }}>{w.name}</div>
              {w.price != null && <span className="small muted">{euro(w.price)}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SaveInput({ onAdd }: { onAdd: (n: number) => void }) {
  const [v, setV] = useState('')
  return (
    <div className="row" style={{ gap: 6, marginTop: 8 }}>
      <input className="mini-input" style={{ flex: 1 }} inputMode="decimal" placeholder="Betrag zurücklegen (€)" value={v} onChange={(e) => setV(e.target.value)} />
      <button className="btn ghost" disabled={!num(v)} onClick={() => { const n = num(v); if (n) { onAdd(n); setV('') } }}>Sparen</button>
    </div>
  )
}
