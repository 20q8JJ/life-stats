/* Food data: a small built-in table of common foods, the free Open Food Facts database,
   and photo recognition with Google Gemini (free API key, stored only on this device). */

export type Macros = { kcal: number; protein: number; fat: number; carbs: number }
/** A food with values per 100 g (or 100 ml) and a typical portion. */
export type FoodItem = { name: string; per100: Macros; portion?: number; portionLabel?: string; brand?: string; source: 'basis' | 'eigen' | 'off' }

// name, kcal, protein, fat, carbs (per 100 g), typical portion in g, portion label
type Row = [string, number, number, number, number, number?, string?]
const ROWS: Row[] = [
  // Frühstück & Brot
  ['Haferflocken', 370, 13.5, 7, 59, 50, '1 Portion'],
  ['Müsli (ohne Zucker)', 360, 10, 8, 58, 60, '1 Schale'],
  ['Cornflakes', 375, 7, 1, 83, 30, '1 Schale'],
  ['Vollkornbrot', 215, 7, 1.5, 39, 50, '1 Scheibe'],
  ['Mischbrot', 230, 7, 1.5, 45, 50, '1 Scheibe'],
  ['Toastbrot', 260, 8, 3.5, 48, 25, '1 Scheibe'],
  ['Brötchen (Weizen)', 255, 9, 1.5, 50, 55, '1 Stück'],
  ['Vollkornbrötchen', 240, 9, 3, 43, 65, '1 Stück'],
  ['Laugenbrezel', 250, 7, 1.5, 51, 80, '1 Stück'],
  ['Croissant', 410, 8, 21, 46, 60, '1 Stück'],
  ['Knäckebrot', 350, 10, 2, 66, 10, '1 Scheibe'],
  ['Reiswaffel', 385, 8, 3, 80, 8, '1 Stück'],
  ['Butter', 740, 0.7, 83, 0.6, 10, '1 Portion'],
  ['Margarine', 720, 0.2, 80, 0.4, 10, '1 Portion'],
  ['Erdnussbutter', 600, 25, 50, 12, 15, '1 EL'],
  ['Nuss-Nougat-Creme', 540, 6, 31, 57, 15, '1 EL'],
  ['Marmelade', 250, 0.3, 0.1, 60, 20, '1 EL'],
  ['Honig', 305, 0.4, 0, 76, 20, '1 EL'],
  // Milchprodukte & Eier
  ['Ei (Hühnerei)', 140, 12.5, 9.5, 0.7, 60, '1 Ei'],
  ['Spiegelei', 195, 13, 15, 0.7, 60, '1 Ei'],
  ['Rührei', 160, 11, 12, 1.5, 120, '2 Eier'],
  ['Milch 1,5 %', 47, 3.4, 1.5, 4.9, 250, '1 Glas'],
  ['Milch 3,5 %', 64, 3.3, 3.5, 4.8, 250, '1 Glas'],
  ['Hafermilch', 46, 0.5, 1.5, 7, 250, '1 Glas'],
  ['Skyr', 63, 11, 0.2, 4, 150, '1 Becher'],
  ['Magerquark', 67, 12, 0.3, 4, 250, '1 Becher'],
  ['Joghurt 3,5 %', 66, 3.5, 3.5, 4.5, 150, '1 Becher'],
  ['Griechischer Joghurt 10 %', 120, 4, 10, 4, 150, '1 Portion'],
  ['Hüttenkäse', 98, 12, 4.5, 2, 200, '1 Becher'],
  ['Gouda', 360, 25, 29, 0, 30, '1 Scheibe'],
  ['Mozzarella', 250, 18, 19, 1, 125, '1 Kugel'],
  ['Feta', 265, 17, 21, 0.5, 50, '1 Portion'],
  ['Parmesan', 390, 35, 28, 0, 10, '1 EL gerieben'],
  ['Frischkäse', 250, 6, 23, 3.5, 30, '1 Portion'],
  ['Proteinpulver (Whey)', 380, 75, 6, 7, 30, '1 Shake'],
  ['Proteinriegel', 360, 33, 12, 30, 50, '1 Riegel'],
  // Fleisch & Fisch
  ['Hähnchenbrust', 110, 23, 1.5, 0, 150, '1 Filet'],
  ['Putenbrust', 105, 24, 1, 0, 150, '1 Filet'],
  ['Rinderhack', 250, 18, 20, 0, 125, '1 Portion'],
  ['Gemischtes Hack', 260, 18, 21, 0, 125, '1 Portion'],
  ['Rindersteak', 150, 22, 6, 0, 200, '1 Steak'],
  ['Schweineschnitzel', 120, 22, 3, 0, 150, '1 Schnitzel'],
  ['Wiener Schnitzel (paniert)', 230, 18, 12, 12, 180, '1 Schnitzel'],
  ['Bratwurst', 300, 13, 27, 1, 100, '1 Wurst'],
  ['Wiener Würstchen', 270, 13, 24, 0.5, 50, '1 Stück'],
  ['Salami', 400, 20, 35, 1, 15, '1 Scheibe'],
  ['Kochschinken', 115, 19, 4, 1, 20, '1 Scheibe'],
  ['Döner Kebab', 215, 11, 9, 22, 350, '1 Döner'],
  ['Lachs', 200, 20, 13, 0, 125, '1 Filet'],
  ['Thunfisch (in Wasser)', 110, 25, 1, 0, 130, '1 Dose'],
  ['Fischstäbchen', 210, 13, 9, 19, 120, '4 Stück'],
  ['Garnelen', 85, 19, 1, 0, 100, '1 Portion'],
  // Pflanzliches Eiweiß
  ['Tofu', 125, 13, 7, 2, 100, '1 Portion'],
  ['Linsen (gekocht)', 115, 9, 0.4, 17, 200, '1 Portion'],
  ['Kichererbsen (gekocht)', 140, 7, 2.5, 19, 150, '1 Portion'],
  ['Kidneybohnen (Dose)', 100, 7, 0.5, 14, 125, '1/2 Dose'],
  // Beilagen
  ['Reis (gekocht)', 130, 2.7, 0.3, 28, 180, '1 Portion'],
  ['Reis (roh)', 350, 7, 0.6, 78, 70, '1 Portion'],
  ['Nudeln (gekocht)', 150, 5.5, 1, 29, 220, '1 Portion'],
  ['Nudeln (roh)', 355, 12.5, 1.5, 70, 100, '1 Portion'],
  ['Kartoffeln (gekocht)', 72, 2, 0.1, 15, 200, '1 Portion'],
  ['Bratkartoffeln', 150, 2.5, 7, 19, 200, '1 Portion'],
  ['Pommes frites', 290, 3.5, 15, 35, 150, '1 Portion'],
  ['Süßkartoffel', 86, 1.6, 0.1, 20, 200, '1 Stück'],
  ['Couscous (gekocht)', 112, 3.8, 0.2, 23, 180, '1 Portion'],
  ['Quinoa (gekocht)', 120, 4.4, 1.9, 21, 180, '1 Portion'],
  ['Wrap (Tortilla)', 310, 8.5, 7, 52, 60, '1 Wrap'],
  // Gemüse
  ['Brokkoli', 35, 3, 0.4, 3, 150, '1 Portion'],
  ['Tomate', 18, 1, 0.2, 2.6, 100, '1 Stück'],
  ['Gurke', 12, 0.6, 0.2, 1.8, 150, '1/2 Gurke'],
  ['Paprika', 30, 1, 0.3, 5, 150, '1 Stück'],
  ['Karotte', 36, 0.9, 0.2, 7, 80, '1 Stück'],
  ['Salat (gemischt)', 17, 1.3, 0.2, 2, 100, '1 Schale'],
  ['Spinat', 23, 2.9, 0.4, 0.6, 150, '1 Portion'],
  ['Zucchini', 19, 1.5, 0.4, 2, 200, '1 Stück'],
  ['Champignons', 22, 3, 0.3, 0.5, 100, '1 Portion'],
  ['Zwiebel', 33, 1.2, 0.2, 6, 80, '1 Stück'],
  ['Mais (Dose)', 85, 3, 1.2, 15, 70, '1/2 Dose'],
  ['Avocado', 160, 2, 15, 3.5, 70, '1/2 Avocado'],
  // Obst
  ['Apfel', 54, 0.3, 0.2, 12, 150, '1 Stück'],
  ['Banane', 93, 1.1, 0.2, 21, 120, '1 Stück'],
  ['Orange', 47, 1, 0.2, 9, 150, '1 Stück'],
  ['Erdbeeren', 32, 0.8, 0.4, 5.5, 150, '1 Schale'],
  ['Heidelbeeren', 42, 0.6, 0.6, 7.4, 125, '1 Schale'],
  ['Weintrauben', 70, 0.7, 0.3, 16, 125, '1 Portion'],
  ['Kiwi', 55, 1, 0.6, 10, 75, '1 Stück'],
  ['Mango', 62, 0.6, 0.4, 13, 150, '1 Portion'],
  ['Beerenmischung (TK)', 40, 1, 0.4, 7, 125, '1 Portion'],
  // Nüsse & Snacks
  ['Mandeln', 600, 21, 52, 6, 30, '1 Handvoll'],
  ['Walnüsse', 680, 15, 65, 6, 30, '1 Handvoll'],
  ['Erdnüsse (geröstet)', 590, 25, 49, 12, 30, '1 Handvoll'],
  ['Cashews', 580, 18, 44, 30, 30, '1 Handvoll'],
  ['Zartbitterschokolade 70 %', 560, 8, 41, 34, 20, '2 Stückchen'],
  ['Milchschokolade', 535, 7, 30, 57, 25, '1 Reihe'],
  ['Chips', 535, 6, 33, 50, 50, '1/3 Tüte'],
  ['Gummibärchen', 345, 7, 0.2, 77, 50, '1 Handvoll'],
  ['Müsliriegel', 420, 6, 15, 63, 25, '1 Riegel'],
  ['Kuchen (Rührkuchen)', 400, 5.5, 20, 50, 80, '1 Stück'],
  ['Eis (Vanille)', 200, 3.5, 11, 23, 100, '2 Kugeln'],
  ['Popcorn (süß)', 470, 5, 18, 74, 50, '1 Portion'],
  // Gerichte
  ['Pizza Margherita', 240, 10, 9, 30, 350, '1 Pizza'],
  ['Pizza Salami', 270, 11, 12, 29, 350, '1 Pizza'],
  ['Spaghetti Bolognese', 150, 7, 5, 19, 400, '1 Teller'],
  ['Lasagne', 150, 8, 7.5, 13, 350, '1 Portion'],
  ['Burger (Rind)', 250, 13, 12, 22, 220, '1 Burger'],
  ['Currywurst', 260, 10, 21, 8, 200, '1 Portion'],
  ['Chili con Carne', 110, 8, 4, 10, 400, '1 Teller'],
  ['Sushi (Maki)', 145, 5, 1.5, 28, 150, '6 Stück'],
  ['Caesar Salad mit Hähnchen', 130, 10, 8, 5, 300, '1 Schale'],
  ['Gemüsesuppe', 40, 1.5, 1.5, 5, 350, '1 Teller'],
  ['Bowl (Reis, Hähnchen, Gemüse)', 140, 9, 4, 17, 450, '1 Bowl'],
  // Getränke (pro 100 ml)
  ['Cola', 42, 0, 0, 10.6, 330, '1 Dose'],
  ['Cola Zero', 0.3, 0, 0, 0, 330, '1 Dose'],
  ['Orangensaft', 44, 0.7, 0.2, 9, 250, '1 Glas'],
  ['Apfelschorle', 25, 0, 0, 6, 330, '1 Glas'],
  ['Bier', 43, 0.5, 0, 3, 500, '1 Flasche'],
  ['Wein (rot)', 85, 0, 0, 2.6, 200, '1 Glas'],
  ['Kaffee mit Milch', 15, 1, 0.6, 1.4, 250, '1 Tasse'],
  ['Cappuccino', 40, 2, 2, 3, 200, '1 Tasse'],
  ['Latte Macchiato', 50, 2.5, 2.5, 4, 300, '1 Glas'],
  ['Energy Drink', 45, 0, 0, 11, 250, '1 Dose'],
  // Öle & Soßen
  ['Olivenöl', 880, 0, 100, 0, 10, '1 EL'],
  ['Ketchup', 100, 1.2, 0.2, 23, 15, '1 EL'],
  ['Mayonnaise', 680, 1, 75, 1.5, 15, '1 EL'],
  ['Pesto', 450, 5, 45, 5, 30, '2 EL'],
]

export const BASE_FOODS: FoodItem[] = ROWS.map(([name, kcal, protein, fat, carbs, portion, portionLabel]) => ({
  name, per100: { kcal, protein, fat, carbs }, portion, portionLabel, source: 'basis',
}))

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss')

/** Simple ranking: names starting with the query first, then word starts, then anywhere. */
export function searchFoods(q: string, list: FoodItem[], limit = 8): FoodItem[] {
  const n = norm(q.trim())
  if (!n) return []
  const parts = n.split(/\s+/)
  const scored: { f: FoodItem; s: number }[] = []
  for (const f of list) {
    const name = norm(f.name + ' ' + (f.brand ?? ''))
    if (!parts.every((p) => name.includes(p))) continue
    const s = name.startsWith(n) ? 0 : name.split(/[\s(,-]+/).some((w) => w.startsWith(parts[0])) ? 1 : 2
    scored.push({ f, s: s - (f.source === 'eigen' ? 0.5 : 0) })
  }
  return scored.sort((a, b) => a.s - b.s || a.f.name.length - b.f.name.length).slice(0, limit).map((x) => x.f)
}

export const scale = (m: Macros, grams: number): Macros => {
  const k = grams / 100
  const r = (v: number) => Math.round(v * k * 10) / 10
  return { kcal: Math.round(m.kcal * k), protein: r(m.protein), fat: r(m.fat), carbs: r(m.carbs) }
}

/* ---------- Open Food Facts (free, no key) ---------- */

type OffProduct = {
  product_name?: string; product_name_de?: string; brands?: string | string[]; serving_quantity?: number | string; serving_size?: string
  nutriments?: Record<string, number | string | undefined>
}

function fromOff(p: OffProduct): FoodItem | undefined {
  const n = p.nutriments ?? {}
  const v = (k: string) => Number(n[k] ?? 0) || 0
  let kcal = v('energy-kcal_100g')
  if (!kcal && v('energy_100g')) kcal = Math.round(v('energy_100g') / 4.184)
  const name = (p.product_name_de || p.product_name || '').trim()
  if (!name || !kcal) return
  const portion = Number(p.serving_quantity) || undefined
  return {
    name, brand: (Array.isArray(p.brands) ? p.brands[0] : p.brands?.split(',')[0])?.trim() || undefined, source: 'off',
    per100: { kcal: Math.round(kcal), protein: v('proteins_100g'), fat: v('fat_100g'), carbs: v('carbohydrates_100g') },
    portion, portionLabel: portion ? p.serving_size || '1 Portion' : undefined,
  }
}

const OFF_FIELDS = 'product_name,product_name_de,brands,serving_quantity,serving_size,nutriments'

/** fetch JSON with a timeout, so a slow database never leaves the screen hanging. */
async function getJson(url: string, ms = 7000, outer?: AbortSignal) {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), ms)
  const stop = () => c.abort()
  outer?.addEventListener('abort', stop)
  try {
    const r = await fetch(url, { signal: c.signal })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return await r.json()
  } finally {
    clearTimeout(t)
    outer?.removeEventListener('abort', stop)
  }
}

export async function offBarcode(code: string): Promise<FoodItem | undefined> {
  const j = await getJson(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code.trim())}.json?fields=${OFF_FIELDS}`)
  return j.status === 1 && j.product ? fromOff(j.product) : undefined
}

const offCache = new Map<string, FoodItem[]>()

/** Brand products. Uses the fast new search service and falls back to the classic one.
    Throws only when both fail; callers treat that as "no brand results". */
export async function offSearch(q: string, signal?: AbortSignal): Promise<FoodItem[]> {
  const key = q.trim().toLowerCase()
  const hit = offCache.get(key)
  if (hit) return hit
  const enc = encodeURIComponent(q.trim())
  let products: OffProduct[]
  try {
    const j = await getJson(`https://search.openfoodfacts.org/search?q=${enc}&langs=de&page_size=15&fields=${OFF_FIELDS}`, 6000, signal)
    products = j.hits ?? []
  } catch (e) {
    if (signal?.aborted) throw e
    const j = await getJson(`https://de.openfoodfacts.org/cgi/search.pl?search_terms=${enc}&search_simple=1&action=process&json=1&page_size=15&fields=${OFF_FIELDS}`, 8000, signal)
    products = j.products ?? []
  }
  const seen = new Set<string>()
  const res = products.map(fromOff).filter((x): x is FoodItem => {
    if (!x) return false
    const k = (x.name + x.brand).toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
  offCache.set(key, res)
  return res
}

/* ---------- Photo recognition (Google Gemini) ---------- */

export type PhotoGuess = { name: string; grams: number; kcal: number; protein: number; fat: number; carbs: number }

/** Shrinks the photo so the upload is small and fast. Returns base64 JPEG without prefix. */
export function shrinkImage(file: File, max = 1024): Promise<{ b64: string; url: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * k)
      c.height = Math.round(img.height * k)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      const url = c.toDataURL('image/jpeg', 0.82)
      URL.revokeObjectURL(img.src)
      resolve({ b64: url.split(',')[1], url })
    }
    img.onerror = () => reject(new Error('Bild konnte nicht gelesen werden'))
    img.src = URL.createObjectURL(file)
  })
}

const PROMPT = `Du bist ein Ernährungsexperte. Erkenne alle Lebensmittel und Getränke auf dem Foto.
Schätze für jedes die Menge in Gramm (bzw. ml) und die Nährwerte für genau diese Menge.
Antworte nur mit JSON: {"items":[{"name":"deutscher Name","grams":Zahl,"kcal":Zahl,"protein":Zahl,"fat":Zahl,"carbs":Zahl}]}.
Wenn eine Verpackung mit Nährwerttabelle zu sehen ist, nutze deren Werte. Wenn kein Essen zu sehen ist, gib {"items":[]} zurück.`

// Tried in order. When one is overloaded or its free limit is used up, the next one takes over.
const MODELS = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-2.0-flash']
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function analyzePhoto(b64: string, key: string, hint?: string): Promise<PhotoGuess[]> {
  let busy = 0, limited = 0, other = ''
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      let r: Response
      try {
        r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key.trim() },
          body: JSON.stringify({
            contents: [{ parts: [{ text: PROMPT + (hint ? `\nHinweis vom Nutzer: ${hint}` : '') }, { inline_data: { mime_type: 'image/jpeg', data: b64 } }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
          }),
        })
      } catch {
        throw new Error('Keine Verbindung zum Internet. Versuch es gleich nochmal.')
      }
      if (r.status === 404) break // model not offered for this key → next model
      const j = await r.json().catch(() => ({}))
      if (r.ok) {
        const text: string = j?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? ''
        let parsed: unknown
        try { parsed = JSON.parse(text.replace(/^```json|```$/g, '').trim()) } catch { other = 'Die KI hat keine lesbare Antwort geliefert.'; break }
        const items = (Array.isArray(parsed) ? parsed : (parsed as { items?: PhotoGuess[] }).items ?? []) as PhotoGuess[]
        return items.map((x) => ({
          name: String(x.name ?? 'Essen'), grams: Math.round(Number(x.grams) || 0), kcal: Math.round(Number(x.kcal) || 0),
          protein: Math.round((Number(x.protein) || 0) * 10) / 10, fat: Math.round((Number(x.fat) || 0) * 10) / 10, carbs: Math.round((Number(x.carbs) || 0) * 10) / 10,
        }))
      }
      const msg: string = j?.error?.message ?? `Fehler ${r.status}`
      if ((r.status === 400 || r.status === 403) && /api key|permission|unauthori/i.test(msg)) throw new Error('Der API-Schlüssel ist ungültig. Tippe oben rechts auf „Schlüssel“ und füge ihn neu ein.')
      if (r.status === 429) { limited++; break } // this model's free limit → next model
      if (r.status === 503 || r.status === 500 || /overloaded|high demand|unavailable/i.test(msg)) {
        busy++
        if (attempt === 0) { await wait(1500); continue } // short pause, same model once more
        break
      }
      other = msg
      break
    }
  }
  if (busy) throw new Error('Googles KI ist gerade überlastet. Das passiert manchmal kurz. Bitte in ein, zwei Minuten nochmal versuchen, oder trag das Essen über die Suche ein.')
  if (limited) throw new Error('Das kostenlose Kontingent für heute ist aufgebraucht. Morgen geht es wieder, bis dahin hilft die Suche.')
  throw new Error(other || 'Erkennung hat nicht geklappt. Bitte nochmal versuchen.')
}
