import { useState } from 'react'
import ConfirmButton from '../ConfirmButton'
import { todayStr, useStore, type Todo } from '../store'

export function dueLabel(due?: string) {
  if (!due) return null
  const today = todayStr()
  const tomorrow = todayStr(new Date(Date.now() + 864e5))
  if (due < today) return { text: 'überfällig', cls: 'late' }
  if (due === today) return { text: 'heute', cls: 'today' }
  if (due === tomorrow) return { text: 'morgen', cls: '' }
  return { text: new Date(due + 'T12:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }), cls: '' }
}

/** Sort: important first, then by due date (no date last), then newest. */
export function sortTodos(list: Todo[]) {
  return [...list].sort(
    (a, b) =>
      Number(!!b.important) - Number(!!a.important) ||
      (a.due ?? '9999').localeCompare(b.due ?? '9999') ||
      b.createdAt - a.createdAt,
  )
}

export function TodoRow({ t, showDelete = false }: { t: Todo; showDelete?: boolean }) {
  const { toggleTodo, removeTodo } = useStore()
  const d = dueLabel(t.due)
  return (
    <div className={`check todo ${t.done ? 'done' : ''}`}>
      <div className="box" onClick={() => toggleTodo(t.id)}>{t.done ? '✓' : ''}</div>
      <div style={{ flex: 1, minWidth: 0 }} onClick={() => toggleTodo(t.id)}>
        <div className="name" style={{ overflowWrap: 'anywhere' }}>{t.text}</div>
      </div>
      {d && !t.done && <span className={`due ${d.cls}`}>{d.text}</span>}
      {t.important && !t.done && <span title="wichtig">⭐</span>}
      {showDelete && <ConfirmButton onConfirm={() => removeTodo(t.id)} />}
    </div>
  )
}

export default function Todos() {
  const { todos, addTodo, clearDoneTodos } = useStore()
  const [text, setText] = useState('')
  const [due, setDue] = useState('')
  const [important, setImportant] = useState(false)
  const [filter, setFilter] = useState<'all' | 'today' | 'done'>('all')

  const add = () => {
    if (!text.trim()) return
    addTodo({ text: text.trim(), due: due || undefined, important })
    setText('')
    setDue('')
    setImportant(false)
  }

  const today = todayStr()
  const open = sortTodos(todos.filter((t) => !t.done))
  // Done items stay visible below the open ones, newest first
  const doneSorted = todos.filter((t) => t.done).sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? '') || b.createdAt - a.createdAt)
  const list =
    filter === 'all'
      ? [...open, ...doneSorted]
      : filter === 'today'
        ? [...open.filter((t) => t.due && t.due <= today), ...doneSorted.filter((t) => t.doneAt === today)]
        : doneSorted
  const doneToday = todos.filter((t) => t.doneAt === today).length

  return (
    <div className="page">
      <h1>To-dos</h1>
      <p className="sub">{open.length} offen · {doneToday} heute erledigt</p>

      <div className="card">
        <div className="todo-add">
          <input
            id="todo-text"
            placeholder="Was steht an?"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <button className="btn" onClick={add} disabled={!text.trim()}>+</button>
        </div>
        <div className="row wrap" style={{ marginTop: 10 }}>
          <input id="todo-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} className="chip" style={{ padding: '6px 10px' }} />
          <span className={`chip ${important ? 'on' : ''}`} onClick={() => setImportant(!important)}>⭐ Wichtig</span>
          {[['Heute', today], ['Morgen', todayStr(new Date(Date.now() + 864e5))]].map(([l, d]) => (
            <span key={l} className={`chip ${due === d ? 'on' : ''}`} onClick={() => setDue(due === d ? '' : d)}>{l}</span>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="tabs">
          {([['all', 'Alle'], ['today', 'Heute'], ['done', 'Erledigt']] as const).map(([k, l]) => (
            <span key={k} className={`chip ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>{l}</span>
          ))}
        </div>
        {filter !== 'done' && open.length === 0 && doneSorted.length > 0 && <div className="all-done">Alles erledigt. Stark! 🎉</div>}
        {list.length === 0 ? (
          <div className="empty">{filter === 'done' ? 'Noch nichts erledigt.' : 'Keine To-dos. Leg oben eins an.'}</div>
        ) : (
          list.map((t) => <TodoRow key={t.id} t={t} showDelete />)
        )}
        {doneSorted.length > 0 && (
          <button className="btn ghost" style={{ marginTop: 12 }} onClick={clearDoneTodos}>Erledigte entfernen</button>
        )}
      </div>
    </div>
  )
}
