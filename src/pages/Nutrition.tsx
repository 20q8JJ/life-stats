import { TIP } from '../theme'
import { useEffect, useMemo, useRef, useState } from 'react'
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

/* ---------- Photo recognition (opens from the camera button) ---------- */

type Guess = PhotoGuess & { on: boolean; base: PhotoGuess }

function PhotoPanel({ onAdd, onClose }: { onAdd: (items: PhotoGuess[]) => void; onClose: () => void }) {
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
      setErr(/fetch|network|load failed|abort/i.test(msg) ? 'Die Foto-KI hat gerade nicht geantwortet. Versuch es gleich nochmal.' : msg)
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
  const head = (
    <div className="row between" style={{ marginBottom: 8 }}>
      <span className="label">Foto</span>
      <span className="row" style={{ gap: 14 }}>
        {geminiKey && !editKey && <button className="link" onClick={() => setEditKey(true)}>Schlüssel</button>}
        <button className="link" onClick={onClose}>Schließen</button>
      </span>
    </div>
  )

  if (!geminiKey || editKey) return (
    <div className="panel">
      {head}
      <p className="small muted" style={{ marginTop: 0 }}>Für die Foto-Erkennung brauchst du einmal einen kostenlosen Schlüssel von Google:</p>
      <ol className="small" style={{ paddingLeft: 20, margin: '0 0 12px', lineHeight: 1.6 }}>
        <li>Öffne <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>aistudio.google.com/apikey</a> und melde dich an.</li>
        <li>Tippe auf „API-Schlüssel erstellen“ und kopiere ihn.</li>
        <li>Hier einfügen. Er bleibt nur auf diesem Gerät.</li>
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
    <div className="panel">
      {head}
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
      {!img ? (
        <button className="photo-drop" onClick={() => fileRef.current?.click()}>
          <span style={{ fontSize: 30 }}>📷</span>
          <b>Foto aufnehmen oder auswählen</b>
          <span className="small muted">Teller, Snack oder Nährwerttabelle</span>
        </button>
      ) : (
        <>
          <div className="photo-prev"><img src={img} alt="Dein Essen" /><button className="icon-btn" onClick={() => { setImg(undefined); setItems(undefined) }}>✕</button></div>
          {!items && <>
            <input className="mini-input" style={{ width: '100%', margin: '10px 0' }} placeholder="Optional: Hinweis, z. B. „große Portion“" value={hint} onChange={(e) => setHint(e.target.value)} />
            <button className="btn" style={{ width: '100%' }} disabled={busy} onClick={run}>{busy ? 'Erkenne Essen …' : 'Erkennen'}</button>
          </>}
        </>
      )}
      {err && <p className="small" style={{ color: 'var(--bad)', marginBottom: 0 }}>{err}</p>}
      {items && items.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {items.map((x, i) => (
            <div key={i} className="guess">
              <span className={`box ${x.on ? 'on' : ''}`} onClick={() => setItems(items.map((y, j) => (j === i ? { ...y, on: !y.on } : y)))}>{x.on ? '✓' : ''}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{x.name}</div>
                <div className="small muted num">{macroLine(x)}</div>
              </div>
              <input className="mini-input num" style={{ width: 64, textAlign: 'right' }} inputMode="numeric" value={x.grams || ''} onChange={(e) => setGrams(i, num(e.target.value) ?? 0)} /><span className="small muted">g</span>
            </div>
          ))}
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn" style={{ flex: 1 }} disabled={!chosen.length} onClick={() => { onAdd(chosen); onClose() }}>
              Eintragen · {Math.round(chosen.reduce((a, x) => a + x.kcal, 0))} kcal
            </button>
            <button className="btn ghost" onClick={run} disabled={busy} title="Nochmal erkennen">↻</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- Entry: one search field is the main way ---------- */

function ResultRow({ f, onPick }: { f: FoodItem; onPick: () => void }) {
  return (
    <button className="result" onClick={onPick}>
      <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <span className="result-name">{f.name}{f.brand && <span className="muted"> · {f.brand}</span>}</span>
        <span className="small muted num">{f.per100.kcal} kcal · {fmt(f.per100.protein)} g Eiweiß / 100 g</span>
      </span>
      {f.source === 'eigen' && <span className="pill">eigen</span>}
      {f.source === 'off' && <span className="pill">Marke</span>}
    </button>
  )
}

/** Amount picker: big number with − / + and the usual portions as one-tap buttons. */
function PortionPanel({ sel, meal, onAdd, onCancel }: { sel: FoodItem; meal: Food['meal']; onAdd: (g: number) => void; onCancel: () => void }) {
  const [grams, setGrams] = useState(String(sel.portion ?? 100))
  const g = num(grams) ?? 0
  const calc = scale(sel.per100, g)
  const step = (sel.portion ?? 100) <= 40 ? 5 : 10
  const presets = [...new Set([sel.portion, sel.portion ? sel.portion * 2 : undefined, 100].filter((x): x is number => !!x))]
  const label = (p: number) => p === sel.portion ? (sel.portionLabel ?? 'Portion') : p === (sel.portion ?? 0) * 2 ? '2×' : `${p} g`
  return (
    <div className="panel">
      <div className="row between">
        <b style={{ minWidth: 0 }}>{sel.name}{sel.brand && <span className="muted" style={{ fontWeight: 400 }}> · {sel.brand}</span>}</b>
        <button className="link" onClick={onCancel}>Zurück</button>
      </div>
      <div className="amount">
        <button className="btn ghost" aria-label="weniger" onClick={() => setGrams(String(Math.max(0, g - step)))}>−</button>
        <label className="amount-val">
          <input id="food-grams" className="num" inputMode="decimal" value={grams} onFocus={(e) => e.target.select()} onChange={(e) => setGrams(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && g > 0 && onAdd(g)} />
          <span>g</span>
        </label>
        <button className="btn ghost" aria-label="mehr" onClick={() => setGrams(String(g + step))}>+</button>
        <div className="amount-kcal"><b className="num">{g > 0 ? calc.kcal : 0}</b><span className="muted"> kcal</span></div>
      </div>
      <div className="portion-btns">
        {presets.map((p) => <button key={p} className={`chip ${g === p ? 'on' : ''}`} onClick={() => setGrams(String(p))}>{label(p)}{p !== 100 || p === sel.portion ? ` · ${p} g` : ''}</button>)}
      </div>
      {g > 0 && <div className="small muted num" style={{ marginBottom: 12 }}>{fmt(calc.protein)} g Eiweiß · {fmt(calc.fat)} g Fett · {fmt(calc.carbs)} g Kohlenhydrate</div>}
      <button className="btn" style={{ width: '100%' }} disabled={!g} onClick={() => onAdd(g)}>Zu {meal} hinzufügen</button>
    </div>
  )
}

function ManualPanel({ name, onSave, onClose }: { name: string; onSave: (f: Omit<Food, 'id' | 'date' | 'meal'>, keep: boolean) => void; onClose: () => void }) {
  const [m, setM] = useState({ name, grams: '', kcal: '', protein: '', fat: '', carbs: '', keep: true })
  const save = () => {
    const kcal = num(m.kcal)
    if (!m.name.trim() || kcal == null) return
    const vals = { kcal, protein: num(m.protein) ?? 0, fat: num(m.fat) ?? 0, carbs: num(m.carbs) ?? 0 }
    const gm = num(m.grams)
    onSave({ name: m.name.trim(), ...vals, grams: gm, per100: gm ? per100Of(vals, gm) : undefined }, m.keep)
  }
  const f = (k: 'grams' | 'kcal' | 'protein' | 'fat' | 'carbs', label: string, id?: string) => (
    <div className="field"><label>{label}</label><input id={id} className="num" inputMode="decimal" value={m[k]} onChange={(e) => setM({ ...m, [k]: e.target.value })} /></div>
  )
  return (
    <div className="panel">
      <div className="row between" style={{ marginBottom: 8 }}><span className="label">Selbst eintragen</span><button className="link" onClick={onClose}>Schließen</button></div>
      <div className="form-grid">
        <div className="field" style={{ gridColumn: '1 / -1' }}><label>Was?</label><input id="food-name" value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} placeholder="z. B. Omas Linsensuppe" /></div>
        {f('kcal', 'kcal', 'food-kcal')}
        {f('grams', 'Menge in g (optional)')}
        {f('protein', 'Eiweiß g')}
        {f('fat', 'Fett g')}
        {f('carbs', 'Kohlenh. g')}
      </div>
      <label className="row small" style={{ marginBottom: 12, cursor: 'pointer' }}>
        <input type="checkbox" checked={m.keep} onChange={(e) => setM({ ...m, keep: e.target.checked })} /> Für die Suche merken
      </label>
      <button className="btn" style={{ width: '100%' }} onClick={save} disabled={!m.name.trim() || num(m.kcal) == null}>Eintragen</button>
    </div>
  )
}

type Panel = { kind: 'portion'; item: FoodItem } | { kind: 'photo' } | { kind: 'barcode' } | { kind: 'manual'; name: string }

function EntryCard({ meal, setMeal, date }: { meal: Food['meal']; setMeal: (m: Food['meal']) => void; date: string }) {
  const { food, myFoods, add } = useLife()
  const [q, setQ] = useState('')
  const [panel, setPanel] = useState<Panel>()
  const [off, setOff] = useState<{ q: string; items: FoodItem[] }>()
  const [offBusy, setOffBusy] = useState(false)
  const [code, setCode] = useState('')
  const [codeMsg, setCodeMsg] = useState('')
  const [flash, setFlash] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const own: FoodItem[] = useMemo(() => myFoods.map((f) => ({ ...f, source: 'eigen' as const })), [myFoods])
  const term = q.trim()
  const hits = useMemo(() => searchFoods(term, [...own, ...BASE_FOODS]), [term, own])

  // Brand products load by themselves while typing. If the database is slow or offline
  // the list simply stays with the built-in foods, no error message.
  useEffect(() => {
    if (term.length < 3 || (typeof navigator !== 'undefined' && !navigator.onLine)) return
    const c = new AbortController()
    const t = setTimeout(() => {
      setOffBusy(true)
      offSearch(term, c.signal)
        .then((items) => setOff({ q: term, items }))
        .catch(() => setOff({ q: term, items: [] }))
        .finally(() => { if (!c.signal.aborted) setOffBusy(false) })
    }, 650)
    return () => { clearTimeout(t); c.abort(); setOffBusy(false) }
  }, [term])
  const brands = off?.q === term ? off.items.filter((b) => !hits.some((h) => h.name === b.name)).slice(0, 8) : []

  // Recently eaten, newest first, each food once
  const recent = useMemo(() => {
    const seen = new Set<string>()
    const out: Food[] = []
    for (let i = food.length - 1; i >= 0 && out.length < 8; i--) {
      const k = food[i].name.toLowerCase()
      if (seen.has(k)) continue
      seen.add(k)
      out.push(food[i])
    }
    return out
  }, [food])

  const done = (name: string) => {
    setFlash(`${name} eingetragen`)
    setTimeout(() => setFlash(''), 1800)
  }
  const reset = () => { setPanel(undefined); setQ(''); setOff(undefined) }
  const addItem = (f: FoodItem, g: number) => {
    const name = f.name + (f.brand ? ` (${f.brand})` : '')
    add('food', { date, meal, name, ...scale(f.per100, g), grams: g, per100: f.per100 })
    reset(); done(name)
  }
  const addAgain = (x: Food) => {
    add('food', { date, meal, name: x.name, kcal: x.kcal, protein: x.protein, fat: x.fat, carbs: x.carbs, grams: x.grams, per100: x.per100 })
    done(x.name)
  }
  const openRecent = (x: Food) => x.per100
    ? setPanel({ kind: 'portion', item: { name: x.name, per100: x.per100, portion: x.grams, portionLabel: 'Wie zuletzt', source: 'eigen' } })
    : addAgain(x)
  const lookupCode = async () => {
    setCodeMsg('Suche …')
    try {
      const r = await offBarcode(code)
      if (r) { setCode(''); setCodeMsg(''); setPanel({ kind: 'portion', item: r }) }
      else setCodeMsg('Diesen Barcode kennt die Datenbank nicht. Trag es selbst ein.')
    } catch {
      setCodeMsg('Konnte gerade nicht nachschauen. Versuch es gleich nochmal oder trag es selbst ein.')
    }
  }
  const addPhoto = (items: PhotoGuess[]) => {
    items.forEach((x) => add('food', {
      date, meal, name: x.name, kcal: x.kcal, protein: x.protein, fat: x.fat, carbs: x.carbs,
      grams: x.grams || undefined, per100: x.grams ? per100Of(x, x.grams) : undefined,
    }))
    if (items.length) done(items.length === 1 ? items[0].name : `${items.length} Sachen`)
  }

  return (
    <div className="card entry-card">
      <div className="row between wrap" style={{ marginBottom: 10 }}>
        <h2 style={{ margin: 0 }}>Eintragen</h2>
        <div className="tabs" style={{ margin: 0 }}>
          {MEALS.map((x) => <span key={x} className={`chip ${meal === x ? 'on' : ''}`} onClick={() => setMeal(x)}>{x}</span>)}
        </div>
      </div>

      {panel?.kind === 'portion' ? (
        <PortionPanel key={panel.item.name} sel={panel.item} meal={meal} onAdd={(g) => addItem(panel.item, g)} onCancel={() => setPanel(undefined)} />
      ) : panel?.kind === 'photo' ? (
        <PhotoPanel onAdd={addPhoto} onClose={() => setPanel(undefined)} />
      ) : panel?.kind === 'manual' ? (
        <ManualPanel name={panel.name} onClose={() => setPanel(undefined)} onSave={(f, keep) => {
          add('food', { ...f, date, meal })
          if (keep && !myFoods.some((x) => x.name.toLowerCase() === f.name.toLowerCase()))
            add('myFoods', { name: f.name, per100: f.per100 ?? { kcal: f.kcal, protein: f.protein, fat: f.fat, carbs: f.carbs }, portion: f.grams ?? 100, portionLabel: f.grams ? undefined : '1 Portion' })
          reset(); done(f.name)
        }} />
      ) : (
        <>
          <div className="searchbar">
            <span className="searchbar-ico" aria-hidden>⌕</span>
            <input ref={inputRef} id="food-search" placeholder="Was hast du gegessen?" autoComplete="off" value={q}
              onChange={(e) => { setQ(e.target.value); if (panel?.kind === 'barcode') setPanel(undefined) }}
              onKeyDown={(e) => e.key === 'Enter' && hits[0] && setPanel({ kind: 'portion', item: hits[0] })} />
            {q ? <button className="searchbar-btn" onClick={() => { setQ(''); inputRef.current?.focus() }} aria-label="Leeren">✕</button> : <>
              <button className={`searchbar-btn ${panel?.kind === 'barcode' ? 'on' : ''}`} onClick={() => setPanel(panel?.kind === 'barcode' ? undefined : { kind: 'barcode' })} title="Barcode">▥</button>
              <button className="searchbar-btn" onClick={() => setPanel({ kind: 'photo' })} title="Foto">📷</button>
            </>}
          </div>

          {panel?.kind === 'barcode' && (
            <div className="panel">
              <p className="small muted" style={{ marginTop: 0 }}>Die Zahl unter dem Strichcode eintippen.</p>
              <div className="todo-add">
                <input id="food-barcode" className="num" inputMode="numeric" placeholder="z. B. 4008400401621" value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setCodeMsg('') }} onKeyDown={(e) => e.key === 'Enter' && code.length >= 8 && lookupCode()} />
                <button className="btn" disabled={code.length < 8} onClick={lookupCode}>Suchen</button>
              </div>
              {codeMsg && <p className="small muted" style={{ marginBottom: 0 }}>{codeMsg}</p>}
            </div>
          )}

          {flash && <div className="flash">✓ {flash}</div>}

          {term ? (
            <div className="results">
              {hits.map((f, i) => <ResultRow key={f.name + i} f={f} onPick={() => setPanel({ kind: 'portion', item: f })} />)}
              {brands.map((f, i) => <ResultRow key={'off' + i} f={f} onPick={() => setPanel({ kind: 'portion', item: f })} />)}
              {offBusy && <div className="small muted" style={{ padding: '8px 2px' }}>Suche Markenprodukte …</div>}
              {!offBusy && !hits.length && !brands.length && <div className="small muted" style={{ padding: '8px 2px' }}>Nichts gefunden.</div>}
              <button className="result" onClick={() => setPanel({ kind: 'manual', name: term })}>
                <span>„{term}“ selbst eintragen</span><span className="muted">＋</span>
              </button>
            </div>
          ) : recent.length > 0 ? (
            <div className="results">
              <div className="label" style={{ margin: '4px 0 2px' }}>Zuletzt gegessen</div>
              {recent.map((x) => (
                <div key={x.id} className="recent">
                  <button className="recent-main" onClick={() => openRecent(x)}>
                    <span className="result-name">{x.name}</span>
                    <span className="small muted num">{x.grams ? `${x.grams} g · ` : ''}{Math.round(x.kcal)} kcal</span>
                  </button>
                  <button className="recent-add" onClick={() => addAgain(x)} aria-label={`${x.name} nochmal eintragen`}>＋</button>
                </div>
              ))}
              <div className="row" style={{ marginTop: 10 }}>
                <button className="link" onClick={() => setPanel({ kind: 'manual', name: '' })}>Selbst eintragen</button>
              </div>
            </div>
          ) : (
            <p className="small muted" style={{ marginBottom: 0 }}>Tipp einfach los, z. B. „Skyr“ oder „Banane“. Was du isst, steht danach hier zum schnellen Wiedereintragen. <button className="link" onClick={() => setPanel({ kind: 'manual', name: '' })}>Selbst eintragen</button></p>
          )}
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
  const { food } = useLife()
  const [date, setDate] = useState(todayStr())
  const [meal, setMeal] = useState<Food['meal']>(defaultMeal())
  const t = macroTargets(profile, body[body.length - 1]?.weight)
  const tot = foodTotals(food, date)
  const left = t ? t.kcal - Math.round(tot.kcal) : undefined

  return (
    <div className="page">
      <h1>Ernährung</h1>
      <div className="row between" style={{ marginBottom: 14 }}>
        <button className="btn ghost" onClick={() => setDate(shiftDay(date, -1))}>‹</button>
        <b>{date === todayStr() ? 'Heute' : fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}</b>
        <button className="btn ghost" disabled={date >= todayStr()} onClick={() => setDate(shiftDay(date, 1))}>›</button>
      </div>

      <div className="card">
        {t && left != null && (
          <div className="kcal-left">
            <span className="big">{Math.abs(left).toLocaleString('de-DE')}</span>
            <span className="label">{left >= 0 ? 'kcal frei' : 'kcal über dem Ziel'}</span>
            <span className="small muted" style={{ marginLeft: 'auto' }}>{tot.protein < t.protein ? `noch ${Math.round(t.protein - tot.protein)} g Eiweiß` : 'Eiweißziel erreicht'}</span>
          </div>
        )}
        <div className="rings">
          <Ring value={tot.kcal} goal={t?.kcal ?? 0} color="var(--accent)" label="Kalorien" center={<>{Math.round(tot.kcal)}</>} sub={t ? `von ${t.kcal}` : 'Profil fehlt'} />
          <Ring value={tot.protein} goal={t?.protein ?? 0} color="var(--protein)" label="Eiweiß" center={<>{Math.round(tot.protein)}g</>} sub={t ? `von ${t.protein} g` : ''} />
          <Ring value={tot.fat} goal={t?.fat ?? 0} color="var(--warn)" label="Fett" center={<>{Math.round(tot.fat)}g</>} sub={t ? `von ${t.fat} g` : ''} />
          <Ring value={tot.carbs} goal={t?.carbs ?? 0} color="var(--good)" label="Kohlenh." center={<>{Math.round(tot.carbs)}g</>} sub={t ? `von ${t.carbs} g` : ''} />
        </div>
        {!t && <p className="small muted" style={{ marginTop: 10, marginBottom: 0 }}>Trag im Profil Größe, Geburtsjahr und Geschlecht und unter Körper dein Gewicht ein, dann rechnet die App deine Tagesziele aus.</p>}
      </div>

      <EntryCard meal={meal} setMeal={setMeal} date={date} />
      <DayLog date={date} />
      <WeekCard target={t?.kcal} proteinTarget={t?.protein} />
      <WaterCard />
      <HealthyShopCard />
    </div>
  )
}
