import { useState } from 'react'
import Today from './pages/Today'
import Hub from './pages/Hub'
import { GameLayer } from './game'
import { GROUPS, MODULES, type Page } from './modules'

export type { Page } from './modules'

// Phone bottom bar: the few things used every day, plus the overview of everything.
const BAR: { id: Page; label: string; ico: string }[] = [
  { id: 'today', label: 'Heute', ico: '◧' },
  { id: 'nutrition', label: 'Essen', ico: '🍽️' },
  { id: 'training', label: 'Training', ico: '🏋️' },
  { id: 'todos', label: 'To-dos', ico: '✅' },
  { id: 'hub', label: 'Alle', ico: '▦' },
]

export default function App() {
  const [page, setPage] = useState<Page>('today')
  const go = (p: Page) => {
    setPage(p)
    window.scrollTo({ top: 0 })
  }
  const mod = MODULES.find((m) => m.id === page)
  const inHub = page === 'hub' || (!!mod && !BAR.some((b) => b.id === page))

  return (
    <>
      <div className="aurora" aria-hidden="true"><i /><i /><i /></div>
      <main className="app" key={page}>
        {page !== 'today' && page !== 'hub' && !BAR.some((b) => b.id === page) && (
          <button className="back" onClick={() => go('hub')}>‹ Alle Bereiche</button>
        )}
        {page === 'today' && <Today go={go} />}
        {page === 'hub' && <Hub go={go} />}
        {mod && <mod.C go={go} />}
      </main>
      <GameLayer />

      <nav className="bottom mobile-only">
        {BAR.map((n) => (
          <button key={n.id} className={page === n.id || (n.id === 'hub' && inHub) ? 'on' : ''} onClick={() => go(n.id)}>
            <span className="ico">{n.ico}</span>
            {n.label}
          </button>
        ))}
      </nav>

      <nav className="side desk-only">
        <div className="side-logo"><span className="wordmark">Life<span className="slash">/</span>Stats</span></div>
        <button className={page === 'today' ? 'on' : ''} onClick={() => go('today')}><span className="ico">◧</span>Heute</button>
        {GROUPS.map((g) => (
          <div key={g}>
            <div className="side-group">{g}</div>
            {MODULES.filter((m) => m.group === g).map((m) => (
              <button key={m.id} className={page === m.id ? 'on' : ''} onClick={() => go(m.id)}><span className="ico">{m.ico}</span>{m.label}</button>
            ))}
          </div>
        ))}
      </nav>
    </>
  )
}
