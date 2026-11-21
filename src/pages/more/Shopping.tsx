import { useState } from 'react'
import { useLife } from '../../life'

export default function Shopping() {
  const { shop, add, patch, remove, set } = useLife()
  const [text, setText] = useState('')
  const open = shop.filter((s) => !s.done)
  const done = shop.filter((s) => s.done)
  const addAll = () => {
    // allow "Milch, Eier, Brot" in one go
    text.split(/[,\n]/).map((t) => t.trim()).filter(Boolean).forEach((t) => add('shop', { text: t, done: false }))
    setText('')
  }
  return (
    <div className="page">
      <h1>Einkaufsliste</h1>
      <p className="sub">Mehrere auf einmal mit Komma: „Milch, Eier, Haferflocken“.</p>
      <div className="card">
        <div className="todo-add">
          <input id="shop-text" placeholder="Was brauchst du?" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addAll()} />
          <button className="btn" onClick={addAll} disabled={!text.trim()}>+</button>
        </div>
      </div>
      <div className="card">
        {!shop.length && <div className="empty">Liste ist leer.</div>}
        {[...open, ...done].map((s) => (
          <div key={s.id} className={`check todo ${s.done ? 'done' : ''}`} onClick={() => patch('shop', s.id, { done: !s.done })}>
            <div className="box">{s.done ? '✓' : ''}</div>
            <div className="name" style={{ flex: 1 }}>{s.text}</div>
            <button className="btn danger" onClick={(e) => { e.stopPropagation(); remove('shop', s.id) }}>✕</button>
          </div>
        ))}
        {done.length > 0 && <button className="btn ghost" style={{ marginTop: 10 }} onClick={() => set({ shop: open })}>Erledigte entfernen</button>}
      </div>
    </div>
  )
}
