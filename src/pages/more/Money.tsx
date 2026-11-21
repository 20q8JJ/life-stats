import { TIP } from '../../theme'
import { useMemo, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import ConfirmButton from '../../ConfirmButton'
import { euro, fmtDate, monthlySubs, num, useLife } from '../../life'
import { todayStr } from '../../store'

const CATS = ['Essen', 'Einkauf', 'Freizeit', 'Auto', 'Wohnen', 'Fitness', 'Kleidung', 'Sonstiges']
const COLORS = ['var(--accent)', 'var(--ink)', 'var(--muted)', 'var(--good)', 'var(--warn)', 'var(--bad)', 'var(--hair)', 'color-mix(in srgb, var(--accent) 45%, transparent)']

export default function Money() {
  const { txs, subs, budget, add, remove, set } = useLife()
  const [f, setF] = useState({ amount: '', category: 'Essen', note: '', income: false, date: todayStr() })
  const [s, setS] = useState({ name: '', amount: '', cycle: 'month' as 'month' | 'year' })
  const month = todayStr().slice(0, 7)
  const mTx = txs.filter((t) => t.date.startsWith(month))
  const spent = -mTx.filter((t) => t.amount < 0).reduce((a, t) => a + t.amount, 0)
  const income = mTx.filter((t) => t.amount > 0).reduce((a, t) => a + t.amount, 0)
  const subM = monthlySubs(subs)
  const left = budget - spent - subM

  const byCat = useMemo(() => {
    const m: Record<string, number> = {}
    mTx.filter((t) => t.amount < 0).forEach((t) => (m[t.category] = (m[t.category] ?? 0) - t.amount))
    if (subM) m['Abos'] = subM
    return Object.entries(m).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 })).sort((a, b) => b.value - a.value)
  }, [mTx, subM])

  const save = () => {
    const a = num(f.amount)
    if (!a) return
    add('txs', { date: f.date, amount: f.income ? Math.abs(a) : -Math.abs(a), category: f.income ? 'Einnahme' : f.category, note: f.note.trim() || undefined })
    setF({ ...f, amount: '', note: '' })
  }

  return (
    <div className="page">
      <h1>Geld</h1>
      <p className="sub">{new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}</p>
      <div className="card">
        <div className="grid">
          <div className="stat"><div className="label">Ausgegeben</div><div className="value">{euro(spent)}</div></div>
          <div className="stat"><div className="label">Abos / Monat</div><div className="value">{euro(subM)}</div></div>
          <div className="stat"><div className="label">Noch im Budget</div><div className="value" style={{ color: left < 0 ? 'var(--bad)' : 'var(--good)' }}>{euro(left)}</div></div>
          <div className="stat"><div className="label">Einnahmen</div><div className="value">{euro(income)}</div></div>
        </div>
        <div className="bar" style={{ marginTop: 12 }}><div style={{ width: `${Math.min(100, ((spent + subM) / Math.max(1, budget)) * 100)}%`, background: left < 0 ? 'var(--bad)' : 'linear-gradient(90deg,var(--accent),var(--accent2))' }} /></div>
        <div className="row between small" style={{ marginTop: 6 }}>
          <span className="muted">Monatsbudget</span>
          <input className="mini-input" style={{ width: 100, textAlign: 'right' }} inputMode="decimal" defaultValue={budget} onBlur={(e) => set({ budget: num(e.target.value) ?? budget })} />
        </div>
      </div>

      <div className="card">
        <div className="row" style={{ gap: 6, marginBottom: 10 }}>
          <span className={`chip ${!f.income ? 'on' : ''}`} onClick={() => setF({ ...f, income: false })}>Ausgabe</span>
          <span className={`chip ${f.income ? 'on' : ''}`} onClick={() => setF({ ...f, income: true })}>Einnahme</span>
        </div>
        <div className="form-grid">
          <div className="field"><label>Betrag (€)</label><input id="tx-amount" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && save()} /></div>
          {!f.income && <div className="field"><label>Kategorie</label><select id="tx-cat" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></div>}
          <div className="field"><label>Notiz</label><input id="tx-note" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="optional" /></div>
          <div className="field"><label>Datum</label><input id="tx-date" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
        </div>
        <button className="btn" onClick={save} disabled={!num(f.amount)}>Eintragen</button>
      </div>

      {byCat.length > 0 && (
        <div className="card">
          <h2>Wohin geht dein Geld?</h2>
          <div className="row wrap" style={{ gap: 16 }}>
            <div style={{ width: 160, height: 160 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byCat} dataKey="value" innerRadius={48} outerRadius={75} paddingAngle={3} stroke="none" animationDuration={900}>
                    {byCat.map((c, i) => <Cell key={c.name} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={TIP} formatter={(v) => euro(Number(v ?? 0))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              {byCat.map((c, i) => (
                <div key={c.name} className="row between small" style={{ padding: '4px 0' }}>
                  <span><span className="dot" style={{ background: COLORS[i % COLORS.length] }} /> {c.name}</span><span>{euro(c.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h2>Abos</h2>
        {subs.map((x) => (
          <div key={x.id} className="row between small" style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
            <span>{x.name}</span>
            <span className="row" style={{ gap: 8 }}><span className="muted">{euro(x.amount)} / {x.cycle === 'month' ? 'Monat' : 'Jahr'} · {euro(x.cycle === 'month' ? x.amount * 12 : x.amount)} im Jahr</span><ConfirmButton onConfirm={() => remove('subs', x.id)} /></span>
          </div>
        ))}
        <div className="row wrap" style={{ gap: 6, marginTop: 10 }}>
          <input className="mini-input" style={{ flex: 2, minWidth: 120 }} placeholder="z. B. Netflix" value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} />
          <input className="mini-input" style={{ flex: 1, minWidth: 70 }} inputMode="decimal" placeholder="€" value={s.amount} onChange={(e) => setS({ ...s, amount: e.target.value })} />
          <select className="mini-input" value={s.cycle} onChange={(e) => setS({ ...s, cycle: e.target.value as 'month' | 'year' })}><option value="month">monatlich</option><option value="year">jährlich</option></select>
          <button className="btn ghost" disabled={!s.name.trim() || !num(s.amount)} onClick={() => { add('subs', { name: s.name.trim(), amount: num(s.amount)!, cycle: s.cycle }); setS({ name: '', amount: '', cycle: 'month' }) }}>+</button>
        </div>
        {subs.length > 0 && <p className="small muted" style={{ marginTop: 8 }}>Abos kosten dich {euro(subM * 12)} im Jahr.</p>}
      </div>

      {mTx.length > 0 && (
        <div className="card">
          <h2>Diesen Monat</h2>
          {[...mTx].reverse().map((t) => (
            <div key={t.id} className="row between small" style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
              <span>{t.category}{t.note ? ` · ${t.note}` : ''} <span className="muted">· {fmtDate(t.date)}</span></span>
              <span className="row" style={{ gap: 8 }}><span style={{ color: t.amount > 0 ? 'var(--good)' : undefined }}>{euro(t.amount)}</span><ConfirmButton onConfirm={() => remove('txs', t.id)} /></span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
