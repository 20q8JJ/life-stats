import { useState } from 'react'
import ConfirmButton from '../../ConfirmButton'
import { num, useLife, type Book } from '../../life'
import { todayStr } from '../../store'

const LABEL = { reading: 'Lese ich gerade', want: 'Will ich lesen', done: 'Gelesen' }

export default function Books() {
  const { books, add, patch, remove } = useLife()
  const [f, setF] = useState({ title: '', author: '', pages: '' })
  const year = todayStr().slice(0, 4)
  const doneYear = books.filter((b) => b.status === 'done' && b.doneAt?.startsWith(year)).length

  const save = () => {
    if (!f.title.trim()) return
    add('books', { title: f.title.trim(), author: f.author.trim() || undefined, pages: num(f.pages), status: 'want' })
    setF({ title: '', author: '', pages: '' })
  }
  const setStatus = (b: Book, status: Book['status']) => patch('books', b.id, { status, doneAt: status === 'done' ? todayStr() : undefined, page: status === 'done' ? b.pages : b.page })

  return (
    <div className="page">
      <h1>Bücher</h1>
      <p className="sub">{doneYear} {doneYear === 1 ? 'Buch' : 'Bücher'} gelesen in {year}</p>
      {(['reading', 'want', 'done'] as const).map((st) => {
        const list = books.filter((b) => b.status === st)
        if (!list.length) return null
        return (
          <div key={st} className="card">
            <h2>{LABEL[st]}</h2>
            {list.map((b) => (
              <div key={b.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <div className="row between" style={{ gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ overflowWrap: 'anywhere' }}>{b.title}</div>
                    <div className="small muted">{b.author ?? ''}{b.pages ? ` · ${b.pages} Seiten` : ''}</div>
                  </div>
                  <span className="row" style={{ gap: 4 }}>
                    {st !== 'reading' && st !== 'done' && <button className="btn ghost small" onClick={() => setStatus(b, 'reading')}>Anfangen</button>}
                    {st === 'reading' && <button className="btn ghost small" onClick={() => setStatus(b, 'done')}>Fertig ✓</button>}
                    <ConfirmButton onConfirm={() => remove('books', b.id)} />
                  </span>
                </div>
                {st === 'reading' && b.pages && (
                  <div className="row" style={{ gap: 8, marginTop: 8 }}>
                    <div className="bar" style={{ flex: 1 }}><div style={{ width: `${Math.min(100, ((b.page ?? 0) / b.pages) * 100)}%`, background: 'linear-gradient(90deg,var(--accent),var(--accent2))' }} /></div>
                    <input className="mini-input" style={{ width: 70 }} inputMode="numeric" defaultValue={b.page ?? ''} placeholder="Seite" onBlur={(e) => patch('books', b.id, { page: num(e.target.value) })} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      })}
      <div className="card">
        <h2>Buch hinzufügen</h2>
        <div className="form-grid">
          <div className="field" style={{ gridColumn: 'span 2' }}><label>Titel</label><input id="book-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div className="field"><label>Autor</label><input id="book-author" value={f.author} onChange={(e) => setF({ ...f, author: e.target.value })} /></div>
          <div className="field"><label>Seiten</label><input id="book-pages" inputMode="numeric" value={f.pages} onChange={(e) => setF({ ...f, pages: e.target.value })} /></div>
        </div>
        <button className="btn" onClick={save} disabled={!f.title.trim()}>Hinzufügen</button>
      </div>
    </div>
  )
}
