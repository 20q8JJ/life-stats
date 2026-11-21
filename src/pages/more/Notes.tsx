import { useState } from 'react'
import ConfirmButton from '../../ConfirmButton'
import { useLife } from '../../life'

export default function Notes() {
  const { notes, add, patch, remove } = useLife()
  const [text, setText] = useState('')
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState<string | null>(null)

  const save = () => {
    if (!text.trim()) return
    add('notes', { text: text.trim(), updatedAt: Date.now() })
    setText('')
  }
  const list = [...notes]
    .filter((n) => !q || n.text.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.updatedAt - a.updatedAt)

  return (
    <div className="page">
      <h1>Notizen</h1>
      <p className="sub">Schnell was aufschreiben, bevor es weg ist.</p>
      <div className="card">
        <textarea id="note-new" className="paste" style={{ minHeight: 90 }} placeholder="Neue Notiz…" value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save() }} />
        <div className="row between" style={{ marginTop: 8 }}>
          <span className="small muted">Strg + Enter speichert</span>
          <button className="btn" onClick={save} disabled={!text.trim()}>Speichern</button>
        </div>
      </div>
      {notes.length > 3 && <input id="note-search" className="mini-input" style={{ width: '100%', marginBottom: 14 }} placeholder="🔍 Suchen" value={q} onChange={(e) => setQ(e.target.value)} />}
      <div className="notes-grid">
        {list.map((n) => (
          <div key={n.id} className={`card note ${n.pinned ? 'pinned' : ''}`}>
            {edit === n.id ? (
              <textarea id={`note-${n.id}`} className="paste" autoFocus defaultValue={n.text}
                onBlur={(e) => { patch('notes', n.id, { text: e.target.value, updatedAt: Date.now() }); setEdit(null) }} />
            ) : (
              <div className="note-text" onClick={() => setEdit(n.id)}>{n.text}</div>
            )}
            <div className="row between small" style={{ marginTop: 10 }}>
              <span className="muted">{new Date(n.updatedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
              <span className="row" style={{ gap: 4 }}>
                <button className="btn danger" style={{ color: n.pinned ? 'var(--warn)' : 'var(--muted)' }} onClick={() => patch('notes', n.id, { pinned: !n.pinned })}>📌</button>
                <ConfirmButton onConfirm={() => remove('notes', n.id)} />
              </span>
            </div>
          </div>
        ))}
      </div>
      {!notes.length && <div className="empty">Noch keine Notizen.</div>}
    </div>
  )
}
