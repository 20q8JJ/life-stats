import { TIP } from '../theme'
import { useMemo, useRef, useState } from 'react'
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Ring } from '../anim'
import ConfirmButton from '../ConfirmButton'
import { analyzePhoto, BASE_FOODS, offBarcode, offSearch, scale, searchFoods, shrinkImage, type FoodItem, type Macros, type PhotoGuess } from '../foods'
import { foodTotals, fmtDate, num, shiftDay, useLife, type Food } from '../life'
import { macroTargets, todayStr, useStore } from '../store'

const MEALS: Food['meal'][] = ['Frühstück', 'Mittag', 'Abend', 'Snack']
const MEAL_ICO: Record<Food['meal'], string> = { Frühstück: '🌅', Mittag: '☀️', Abend: '🌙', Snack: '🍎' }
const defaultMeal = (): Food['meal'] => {
  const h = new Date().getHours()
  return h < 11 ? 'Frühstück' : h < 15 ? 'Mittag' : h < 21 ? 'Abend' : 'Snack'
}
const fmt = (v: number) => (Math.round(v * 10) / 10).toLocaleString('de-DE')
const macroLine = (m: Macros) => `${Math.round(m.kcal)} kcal · ${fmt(m.protein)} E · ${fmt(m.fat)} F · ${fmt(m.carbs)} K`
const per100Of = (m: Macros, g: number): Macros => ({
  kcal: Math.round((m.kcal / g) * 100), protein: Math.round((m.protein / g) * 1000) / 10, fat: Math.round((m.fat / g) * 1000) / 10, carbs: Math.round((m.carbs / g) * 1000) / 10,
})

export function WaterCard() {
  const { water, waterGoal, addWater } = useLife()
  const today = todayStr()
  const ml = water[today] ?? 0
  const pct = Math.min(1, ml / waterGoal)
  return (
    <div className="card">
      <div className="row between"><h2>💧 Wasser</h2><span className="small muted">{(ml / 1000).toFixed(2).replace('.', ',')} / {(waterGoal / 1000).toFixed(1).replace('.', ',')} L</span></div>
      <div className="water"><div style={{ height: `${pct * 100}%` }} /></div>
      <div className="row" style={{ gap: 6, marginTop: 10 }}>
        {[250, 500].map((v) => <button key={v} className="btn ghost" style={{ flex: 1 }} onClick={() => addWater(today, v)}>+{v} ml</button>)}
        <button className="btn ghost" onClick={() => addWater(today, -250)} disabled={!ml}>−</button>
      </div>
    </div>
  )
}

/* ---------- Photo recognition ---------- */

type Guess = PhotoGuess & { on: boolean; base: PhotoGuess }

function PhotoCard({ onAdd }: { onAdd: (items: PhotoGuess[]) => void }) {
  const { geminiKey, set } = useLife()
  const [keyInput, setKeyInput] = useState('')
  const [editKey, setEditKey] = useState(false)
  const [img, setImg] = useState<string>()
  const [hint, setHint] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [items, setItems] = useState<Guess[]>()
  const b64 = useRef('')
  const fileRef = useRef<HTMLInputElement>(null)

  const run = async () => {
    setBusy(true); setErr(''); setItems(undefined)
    try {
      const res = await analyzePhoto(b64.current, geminiKey, hint.trim() || undefined)
      if (!res.length) setErr('Auf dem Foto wurde kein Essen erkannt.')
      setItems(res.map((x) => ({ ...x, on: true, base: x })))
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Fehler'
      setErr(/fetch|network|load failed/i.test(msg) ? 'Keine Verbindung zur KI. Bist du online?' : msg)
    }
    setBusy(false)
  }
  const pick = async (f?: File) => {
    if (!f) return
    try {
      const r = await shrinkImage(f)
      b64.current = r.b64
      setImg(r.url); setItems(undefined); setErr('')
    } catch (e) { setErr(e instanceof Error ? e.message : 'Bild konnte nicht gelesen werden') }
  }
  const setGrams = (i: number, g: number) => setItems((xs) => xs?.map((x, j) => {
    if (j !== i) return x
    const k = x.base.grams ? g / x.base.grams : 1
    const r = (v: number) => Math.round(v * k * 10) / 10
    return { ...x, grams: g, kcal: Math.round(x.base.kcal * k), protein: r(x.base.protein), fat: r(x.base.fat), carbs: r(x.base.carbs) }
  }))
  const chosen = items?.filter((x) => x.on) ?? []

  if (!geminiKey || editKey) return (
    <div className="card">
      <div className="row between"><h2>📸 Foto-Erkennung</h2><span className="pill">kostenlos</span></div>
      <p className="small muted" style={{ marginTop: 0 }}>Essen fotografieren, die KI von Google (Gemini) erkennt es und schätzt Kalorien und Makros. Einmalig brauchst du dafür einen kostenlosen Schlüssel:</p>
      <ol className="small" style={{ paddingLeft: 20, margin: '0 0 12px', lineHeight: 1.6 }}>
        <li>Öffne <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>aistudio.google.com/apikey</a> und melde dich mit deinem Google-Konto an.</li>
        <li>Tippe auf „API-Schlüssel erstellen“ und kopiere ihn.</li>
        <li>Füge ihn hier ein. Er bleibt nur auf diesem Gerät.</li>
      </ol>
      <div className="todo-add">
        <input id="gemini-key" placeholder="API-Schlüssel einfügen" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} />
        <button className="btn" disabled={keyInput.trim().length < 20} onClick={() => { set({ geminiKey: keyInput.trim() }); setKeyInput(''); setEditKey(false) }}>Speichern</button>
      </div>
      {editKey && <div className="row" style={{ marginTop: 10, gap: 14 }}>
        <button className="link" onClick={() => setEditKey(false)}>Abbrechen</button>
        <button className="link" style={{ color: 'var(--bad)' }} onClick={() => { set({ geminiKey: '' }); setEditKey(false) }}>Schlüssel entfernen</button>
      </div>}
    </div>
  )

  return (
    <div className="card">
      <div className="row between"><h2>📸 Foto-Erkennung</h2><button className="link" onClick={() => setEditKey(true)}>Schlüssel</button></div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
      {!img ? (
        <button className="photo-drop" onClick={() => fileRef.current?.click()}>
          <span style={{ fontSize: 34 }}>📷</span>
          <b>Foto aufnehmen oder auswählen</b>
          <span className="small muted">Teller, Snack oder Nährwerttabelle</span>
        </button>
      ) : (
        <>
          <div className="photo-prev"><img src={img} alt="Dein Essen" /><button className="icon-btn" onClick={() => { setImg(undefined); setItems(undefined) }}>✕</button></div>
          {!items && <>
            <input className="mini-input" style={{ width: '100%', margin: '10px 0' }} placeholder="Optional: Hinweis, z. B. „große Portion, mit Vollkornreis“" value={hint} onChange={(e) => setHint(e.target.value)} />
            <button className="btn" style={{ width: '100%' }} disabled={busy} onClick={run}>{busy ? 'Erkenne Essen …' : '✨ Erkennen'}</button>
          </>}
        </>
      )}
      {err && <p className="small" style={{ color: 'var(--bad)', marginBottom: 0 }}>{err}</p>}
      {items && items.length > 0 && (
        <div className="preview">
          <div className="small muted" style={{ marginBottom: 6 }}>Erkannt. Mengen anpassen, Falsches abwählen:</div>
          {items.map((x, i) => (
            <div key={i} className="guess">
              <span className={`box ${x.on ? 'on' : ''}`} onClick={() => setItems(items.map((y, j) => (j === i ? { ...y, on: !y.on } : y)))}>{x.on ? '✓' : ''}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{x.name}</div>
                <div className="small muted">{macroLine(x)}</div>
              </div>
              <input className="mini-input" style={{ width: 64, textAlign: 'right' }} inputMode="numeric" value={x.grams || ''} onChange={(e) => setGrams(i, num(e.target.value) ?? 0)} /><span className="small muted">g</span>
            </div>
          ))}
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn" style={{ flex: 1 }} disabled={!chosen.length} onClick={() => { onAdd(chosen); setImg(undefined); setItems(undefined); setHint('') }}>
              Eintragen ({Math.round(chosen.reduce((a, x) => a + x.kcal, 0))} kcal)
            </button>
            <button className="btn ghost" onClick={run} disabled={busy} title="Nochmal erkennen">↻</button>
          </div>
          <p className="small muted" style={{ margin: '8px 0 0' }}>Die KI schätzt. Bei Verpackungen ist der Barcode genauer.</p>
        </div>
      )}
    </div>
  )
}

/* ---------- Search, portion and manual entry ---------- */

function ResultRow({ f, onPick }: { f: FoodItem; onPick: () => void }) {
  return (
    <button className="result" onClick={onPick}>
      <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <span className="result-name">{f.name}{f.brand && <span className="muted"> · {f.brand}</span>}</span>
        <span className="small muted">{f.per100.kcal} kcal · {fmt(f.per100.protein)} g Eiweiß pro 100 g</span>
      </span>
      {f.source === 'eigen' && <span className="pill">eigen</span>}
      {f.source === 'off' && <span className="pill">Marke</span>}
    </button>
  )
}

function AddCard({ meal, setMeal, date }: { meal: Food['meal']; setMeal: (m: Food['meal']) => void; date: string }) {
  const { food, myFoods, add } = useLife()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<FoodItem>()
  const [grams, setGrams] = useState('')
  const [off, setOff] = useState<FoodItem[]>()
  const [offBusy, setOffBusy] = useState(false)
  const [offErr, setOffErr] = useState('')
  const [mode, setMode] = useState<'search' | 'barcode' | 'manual'>('search')
  const [code, setCode] = useState('')
  const [m, setM] = useState({ name: '', grams: '', kcal: '', protein: '', fat: '', carbs: '', keep: false })

  const own: FoodItem[] = useMemo(() => myFoods.map((f) => ({ ...f, source: 'eigen' as const })), [myFoods])
  const hits = useMemo(() => searchFoods(q, [...own, ...BASE_FOODS]), [q, own])

  // Recent favourites: what was logged most often in the last 60 days
  const favs = useMemo(() => {
    const since = shiftDay(todayStr(), -60)
    const map: Record<string, { f: Food; n: number }> = {}
    food.filter((x) => x.date >= since).forEach((x) => { const k = x.name.toLowerCase(); map[k] = { f: x, n: (map[k]?.n ?? 0) + 1 } })
    return Object.values(map).sort((a, b) => b.n - a.n).slice(0, 8).map((x) => x.f)
  }, [food])

  const choose = (f: FoodItem) => { setSel(f); setGrams(String(f.portion ?? 100)); setQ(''); setOff(undefined); setOffErr('') }
  const g = num(grams) ?? 0
  const calc = sel ? scale(sel.per100, g) : undefined
  const addSel = () => {
    if (!sel || !calc || !g) return
    add('food', { date, meal, name: sel.name + (sel.brand ? ` (${sel.brand})` : ''), ...calc, grams: g, per100: sel.per100 })
    setSel(undefined); setGrams('')
  }
  const searchOff = async () => {
    setOffBusy(true); setOffErr('')
    try { const r = await offSearch(q); setOff(r); if (!r.length) setOffErr('Keine Markenprodukte gefunden.') } catch { setOffErr('Datenbank gerade nicht erreichbar. Bist du online?') }
    setOffBusy(false)
  }
  const lookupCode = async () => {
    setOffBusy(true); setOffErr('')
    try { const r = await offBarcode(code); if (r) { choose(r); setCode('') } else setOffErr('Dieser Barcode ist nicht in der Datenbank. Trag es von Hand ein.') } catch { setOffErr('Datenbank gerade nicht erreichbar. Bist du online?') }
    setOffBusy(false)
  }
  const saveManual = () => {
    const kcal = num(m.kcal)
    if (!m.name.trim() || kcal == null) return
    const vals = { kcal, protein: num(m.protein) ?? 0, fat: num(m.fat) ?? 0, carbs: num(m.carbs) ?? 0 }
    const gm = num(m.grams)
    const per100 = gm ? per100Of(vals, gm) : undefined
    add('food', { date, meal, name: m.name.trim(), ...vals, grams: gm, per100 })
    if (m.keep) add('myFoods', { name: m.name.trim(), per100: per100 ?? vals, portion: gm ?? 100, portionLabel: gm ? undefined : '1 Portion' })
    setM({ name: '', grams: '', kcal: '', protein: '', fat: '', carbs: '', keep: false })
  }

  return (
    <div className="card">
      <h2>Essen eintragen</h2>
      <div className="tabs">
        {MEALS.map((x) => <span key={x} className={`chip ${meal === x ? 'on' : ''}`} onClick={() => setMeal(x)}>{MEAL_ICO[x]} {x}</span>)}
      </div>

      {sel ? (
        <div className="preview" style={{ marginTop: 0 }}>
          <div className="row between">
            <b>{sel.name}{sel.brand && <span className="muted" style={{ fontWeight: 400 }}> · {sel.brand}</span>}</b>
            <button className="link" onClick={() => setSel(undefined)}>Ändern</button>
          </div>
          <div className="small muted" style={{ margin: '2px 0 10px' }}>pro 100 g: {macroLine(sel.per100)}</div>
          <div className="tabs" style={{ flexWrap: 'wrap' }}>
            {sel.portion && <span className={`chip ${g === sel.portion ? 'on' : ''}`} onClick={() => setGrams(String(sel.portion))}>{sel.portionLabel ?? 'Portion'} ({sel.portion} g)</span>}
            {sel.portion && <span className={`chip ${g === sel.portion * 2 ? 'on' : ''}`} onClick={() => setGrams(String(sel.portion! * 2))}>2× ({sel.portion * 2} g)</span>}
            {sel.portion !== 100 && <span className={`chip ${g === 100 ? 'on' : ''}`} onClick={() => setGrams('100')}>100 g</span>}
          </div>
          <div className="row">
            <input id="food-grams" className="mini-input" style={{ width: 90 }} inputMode="decimal" value={grams} onChange={(e) => setGrams(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addSel()} />
            <span className="muted">g</span>
            <span style={{ flex: 1, textAlign: 'right', fontWeight: 600 }}>{calc && g > 0 ? `${calc.kcal} kcal` : ''}</span>
          </div>
          {calc && g > 0 && <div className="small muted" style={{ textAlign: 'right', marginTop: 4 }}>{fmt(calc.protein)} g Eiweiß · {fmt(calc.fat)} g Fett · {fmt(calc.carbs)} g Kohlenh.</div>}
          <button className="btn" style={{ width: '100%', marginTop: 12 }} disabled={!g} onClick={addSel}>Zu {meal} hinzufügen</button>
        </div>
      ) : (
        <>
          <div className="tabs">
            {([['search', '🔎 Suchen'], ['barcode', '▥ Barcode'], ['manual', '✍️ Von Hand']] as const).map(([k, l]) => (
              <span key={k} className={`chip ${mode === k ? 'on' : ''}`} onClick={() => { setMode(k); setOffErr('') }}>{l}</span>
            ))}
          </div>

          {mode === 'search' && <>
            <div className="todo-add">
              <input id="food-search" placeholder="z. B. Skyr, Banane, Pizza …" value={q} onChange={(e) => { setQ(e.target.value); setOff(undefined); setOffErr('') }} onKeyDown={(e) => e.key === 'Enter' && hits[0] && choose(hits[0])} />
            </div>
            {!q && favs.length > 0 && (
              <>
                <div className="small muted" style={{ margin: '10px 0 6px' }}>Oft gegessen, ein Tipp trägt es ein:</div>
                <div className="tabs" style={{ flexWrap: 'wrap', marginBottom: 0 }}>
                  {favs.map((x) => <span key={x.id} className="chip" onClick={() => add('food', { date, meal, name: x.name, kcal: x.kcal, protein: x.protein, fat: x.fat, carbs: x.carbs, grams: x.grams, per100: x.per100 })}>+ {x.name}{x.grams ? ` ${x.grams} g` : ''}</span>)}
                </div>
              </>
            )}
            {q && (
              <div className="results">
                {hits.map((f, i) => <ResultRow key={f.name + i} f={f} onPick={() => choose(f)} />)}
                {off?.map((f, i) => <ResultRow key={'off' + i} f={f} onPick={() => choose(f)} />)}
                {!off && <button className="btn ghost" style={{ width: '100%', marginTop: 8 }} disabled={offBusy} onClick={searchOff}>{offBusy ? 'Suche …' : `„${q}“ in Markenprodukten suchen`}</button>}
                {offErr && <p className="small muted">{offErr}</p>}
                {!hits.length && <p className="small muted" style={{ marginBottom: 0 }}>Nicht dabei? Trag es <button className="link" onClick={() => { setMode('manual'); setM({ ...m, name: q }) }}>von Hand</button> ein.</p>}
              </div>
            )}
          </>}

          {mode === 'barcode' && <>
            <p className="small muted" style={{ marginTop: 0 }}>Die Zahl unter dem Strichcode auf der Verpackung eingeben. Die Nährwerte kommen aus der freien Datenbank Open Food Facts.</p>
            <div className="todo-add">
              <input id="food-barcode" inputMode="numeric" placeholder="z. B. 4008400401621" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => e.key === 'Enter' && code.length >= 8 && lookupCode()} />
              <button className="btn" disabled={code.length < 8 || offBusy} onClick={lookupCode}>{offBusy ? '…' : 'Suchen'}</button>
            </div>
            {offErr && <p className="small muted">{offErr}</p>}
          </>}

          {mode === 'manual' && <>
            <div className="form-grid">
              <div className="field" style={{ gridColumn: '1 / -1' }}><label>Was?</label><input id="food-name" value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} placeholder="z. B. Omas Linsensuppe" /></div>
              <div className="field"><label>Menge (g, optional)</label><input inputMode="decimal" value={m.grams} onChange={(e) => setM({ ...m, grams: e.target.value })} /></div>
              <div className="field"><label>kcal</label><input id="food-kcal" inputMode="decimal" value={m.kcal} onChange={(e) => setM({ ...m, kcal: e.target.value })} /></div>
              <div className="field"><label>Eiweiß (g)</label><input inputMode="decimal" value={m.protein} onChange={(e) => setM({ ...m, protein: e.target.value })} /></div>
              <div className="field"><label>Fett (g)</label><input inputMode="decimal" value={m.fat} onChange={(e) => setM({ ...m, fat: e.target.value })} /></div>
              <div className="field"><label>Kohlenh. (g)</label><input inputMode="decimal" value={m.carbs} onChange={(e) => setM({ ...m, carbs: e.target.value })} /></div>
            </div>
            <label className="row small" style={{ marginBottom: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={m.keep} onChange={(e) => setM({ ...m, keep: e.target.checked })} /> Merken, damit die Suche es nächstes Mal findet
            </label>
            <button className="btn" onClick={saveManual} disabled={!m.name.trim() || num(m.kcal) == null}>Eintragen</button>
          </>}
        </>
      )}
    </div>
  )
}

/* ---------- Day log ---------- */

function EntryRow({ x }: { x: Food }) {
  const { patch, remove, add, myFoods } = useLife()
  const [open, setOpen] = useState(false)
  const [g, setG] = useState(String(x.grams ?? ''))
  const saved = myFoods.some((f) => f.name.toLowerCase() === x.name.toLowerCase())
  const applyGrams = () => {
    const v = num(g)
    if (!v || !x.per100) return
    patch('food', x.id, { grams: v, ...scale(x.per100, v) })
    setOpen(false)
  }
  return (
    <div className="entry">
      <div className="row between" style={{ cursor: 'pointer', padding: '8px 0' }} onClick={() => setOpen(!open)}>
        <span style={{ minWidth: 0 }}>{x.name}{x.grams ? <span className="muted small"> · {x.grams} g</span> : null}</span>
        <span className="small muted" style={{ whiteSpace: 'nowrap' }}>{Math.round(x.kcal)} kcal · {fmt(x.protein)} g E</span>
      </div>
      {open && (
        <div className="row wrap" style={{ paddingBottom: 10, gap: 8 }}>
          {x.per100 && <><input className="mini-input" style={{ width: 70 }} inputMode="decimal" value={g} onChange={(e) => setG(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applyGrams()} /><span className="small muted">g</span><button className="btn ghost" onClick={applyGrams}>Menge ändern</button></>}
          {!saved && <button className="btn ghost" onClick={() => add('myFoods', { name: x.name, per100: x.per100 ?? { kcal: x.kcal, protein: x.protein, fat: x.fat, carbs: x.carbs }, portion: x.grams ?? 100, portionLabel: x.grams ? undefined : '1 Portion' })}>☆ Merken</button>}
          <span style={{ flex: 1 }} />
          <ConfirmButton onConfirm={() => remove('food', x.id)} />
        </div>
      )}
    </div>
  )
}

function DayLog({ date }: { date: string }) {
  const { food, add } = useLife()
  const dayFood = food.filter((x) => x.date === date)
  const yesterday = shiftDay(date, -1)
  const copyMeal = (meal: Food['meal']) =>
    food.filter((x) => x.date === yesterday && x.meal === meal).forEach(({ id: _id, ...rest }) => add('food', { ...rest, date }))
  return (
    <div className="card">
      <h2>Mahlzeiten</h2>
      {MEALS.map((meal) => {
        const list = dayFood.filter((x) => x.meal === meal)
        const prev = food.some((x) => x.date === yesterday && x.meal === meal)
        const kcal = list.reduce((a, x) => a + x.kcal, 0)
        return (
          <div key={meal} style={{ marginBottom: 10 }}>
            <div className="slot-title"><span>{MEAL_ICO[meal]} {meal}</span><span>{list.length ? `${Math.round(kcal)} kcal` : ''}</span></div>
            {list.map((x) => <EntryRow key={x.id} x={x} />)}
            {!list.length && (
              <div className="small muted" style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                Noch nichts. {prev && <button className="link" onClick={() => copyMeal(meal)}>Wie gestern übernehmen</button>}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ---------- Week overview ---------- */

function WeekCard({ target, proteinTarget }: { target?: number; proteinTarget?: number }) {
  const { food } = useLife()
  const days = Array.from({ length: 7 }, (_, i) => shiftDay(todayStr(), i - 6))
  const data = days.map((d) => ({ d: fmtDate(d, { weekday: 'short' }), date: d, ...foodTotals(food, d) }))
  const logged = data.filter((x) => x.kcal > 0)
  if (logged.length < 2) return null
  const avg = (k: 'kcal' | 'protein') => Math.round(logged.reduce((a, x) => a + x[k], 0) / logged.length)
  const hitProtein = proteinTarget ? logged.filter((x) => x.protein >= proteinTarget * 0.95).length : 0
  return (
    <div className="card">
      <h2>📊 Letzte 7 Tage</h2>
      <div style={{ height: 150 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="d" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis hide domain={[0, (max: number) => Math.max(max, (target ?? 0) * 1.1)]} />
            <Tooltip cursor={{ fill: 'var(--card2)' }} contentStyle={TIP} formatter={(v) => [`${Math.round(Number(v))} kcal`, 'Gegessen']} />
            {target && <ReferenceLine y={target} stroke="var(--accent)" strokeDasharray="4 4" />}
            <Bar dataKey="kcal" radius={0}>
              {data.map((x) => <Cell key={x.date} fill={!target ? 'var(--accent)' : x.kcal > target * 1.1 ? 'var(--warn)' : 'var(--good)'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid" style={{ marginTop: 12 }}>
        <div className="stat"><div className="small muted">Ø Kalorien</div><b>{avg('kcal')} kcal</b></div>
        <div className="stat"><div className="small muted">Ø Eiweiß</div><b>{avg('protein')} g</b></div>
        {proteinTarget && <div className="stat"><div className="small muted">Eiweißziel erreicht</div><b>{hitProtein} von {logged.length} Tagen</b></div>}
      </div>
    </div>
  )
}

/* ---------- Healthy weekly shopping ---------- */

const HEALTHY: [string, string[]][] = [
  ['🥦 Gemüse', ['Brokkoli', 'Spinat oder Feldsalat', 'Paprika', 'Tomaten', 'Gurke', 'Karotten', 'Zucchini', 'Zwiebeln', 'TK-Gemüse']],
  ['🍎 Obst', ['Bananen', 'Äpfel', 'Orangen', 'TK-Beeren']],
  ['🍗 Eiweiß', ['Eier', 'Hähnchenbrust', 'Lachs oder Thunfisch', 'Rinderhack', 'Linsen oder Kichererbsen']],
  ['🥛 Milchprodukte', ['Skyr oder Magerquark', 'Hüttenkäse', 'Milch', 'Feta']],
  ['🌾 Vollkorn', ['Haferflocken', 'Vollkornbrot', 'Vollkornnudeln oder Naturreis', 'Kartoffeln']],
  ['🥜 Fette', ['Olivenöl', 'Nüsse', 'Avocado']],
]

function HealthyShopCard() {
  const { shop, add } = useLife()
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const addAll = () => {
    const have = new Set(shop.filter((s) => !s.done).map((s) => s.text.toLowerCase()))
    HEALTHY.flatMap(([, xs]) => xs).filter((t) => !have.has(t.toLowerCase())).forEach((t) => add('shop', { text: t, done: false }))
    setDone(true)
  }
  return (
    <div className="card">
      <div className="row between" style={{ cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <h2 style={{ margin: 0 }}>🛒 Gesunder Wocheneinkauf</h2><span className="muted">{open ? '▴' : '▾'}</span>
      </div>
      {open && <>
        <p className="small muted">Viel Unverarbeitetes, viel Eiweiß, Vollkorn statt Weißmehl. Reicht etwa eine Woche für eine Person.</p>
        {HEALTHY.map(([group, xs]) => (
          <div key={group} style={{ marginBottom: 8 }}>
            <div className="small" style={{ fontWeight: 600 }}>{group}</div>
            <div className="small muted">{xs.join(' · ')}</div>
          </div>
        ))}
        <button className="btn" style={{ width: '100%', marginTop: 6 }} disabled={done} onClick={addAll}>{done ? '✓ In der Einkaufsliste' : 'Alles in die Einkaufsliste'}</button>
      </>}
    </div>
  )
}

/* ---------- Page ---------- */

export default function Nutrition() {
  const { profile, body } = useStore()
  const { food, add } = useLife()
  const [date, setDate] = useState(todayStr())
  const [meal, setMeal] = useState<Food['meal']>(defaultMeal())
  const t = macroTargets(profile, body[body.length - 1]?.weight)
  const tot = foodTotals(food, date)
  const left = t ? t.kcal - Math.round(tot.kcal) : undefined

  const addPhoto = (items: PhotoGuess[]) => items.forEach((x) => add('food', {
    date, meal, name: x.name, kcal: x.kcal, protein: x.protein, fat: x.fat, carbs: x.carbs,
    grams: x.grams || undefined, per100: x.grams ? per100Of(x, x.grams) : undefined,
  }))

  return (
    <div className="page">
      <h1>Ernährung</h1>
      <div className="row between" style={{ marginBottom: 14 }}>
        <button className="btn ghost" onClick={() => setDate(shiftDay(date, -1))}>‹</button>
        <b>{date === todayStr() ? 'Heute' : fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}</b>
        <button className="btn ghost" disabled={date >= todayStr()} onClick={() => setDate(shiftDay(date, 1))}>›</button>
      </div>

      <div className="card">
        <div className="rings">
          <Ring value={tot.kcal} goal={t?.kcal ?? 0} color="var(--accent)" label="Kalorien" center={<>{Math.round(tot.kcal)}</>} sub={t ? `von ${t.kcal}` : 'Profil fehlt'} />
          <Ring value={tot.protein} goal={t?.protein ?? 0} color="var(--ink)" label="Eiweiß" center={<>{Math.round(tot.protein)}g</>} sub={t ? `von ${t.protein} g` : ''} />
          <Ring value={tot.fat} goal={t?.fat ?? 0} color="var(--warn)" label="Fett" center={<>{Math.round(tot.fat)}g</>} sub={t ? `von ${t.fat} g` : ''} />
          <Ring value={tot.carbs} goal={t?.carbs ?? 0} color="var(--good)" label="Kohlenh." center={<>{Math.round(tot.carbs)}g</>} sub={t ? `von ${t.carbs} g` : ''} />
        </div>
        {t && left != null ? (
          <p className="small muted" style={{ textAlign: 'center', marginTop: 10, marginBottom: 0 }}>
            {left >= 0 ? <>Noch <b style={{ color: 'var(--text)' }}>{left} kcal</b> frei</> : <>{-left} kcal über dem Ziel</>}
            {' · '}
            {tot.protein < t.protein ? `noch ${Math.round(t.protein - tot.protein)} g Eiweiß` : 'Eiweißziel erreicht 💪'}
          </p>
        ) : (
          <p className="small muted" style={{ textAlign: 'center', marginTop: 10, marginBottom: 0 }}>Trag im Profil Größe, Geburtsjahr und Geschlecht und unter Körper dein Gewicht ein, dann rechnet die App deine Tagesziele aus.</p>
        )}
      </div>

      <PhotoCard onAdd={addPhoto} />
      <AddCard meal={meal} setMeal={setMeal} date={date} />
      <DayLog date={date} />
      <WeekCard target={t?.kcal} proteinTarget={t?.protein} />
      <WaterCard />
      <HealthyShopCard />
    </div>
  )
}
