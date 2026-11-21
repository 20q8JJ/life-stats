// Makes the aurora background and glass cards react to the mouse / finger.
// Writes CSS variables only; all visuals live in index.css.
const root = document.documentElement
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

let tx = innerWidth / 2, ty = innerHeight / 3 // target
let x = tx, y = ty // smoothed
let raf = 0

function frame() {
  x += (tx - x) * 0.08
  y += (ty - y) * 0.08
  root.style.setProperty('--mx', `${x}px`)
  root.style.setProperty('--my', `${y}px`)
  // -1..1 offsets drive the parallax of the aurora blobs
  root.style.setProperty('--px', ((x / innerWidth) * 2 - 1).toFixed(3))
  root.style.setProperty('--py', ((y / innerHeight) * 2 - 1).toFixed(3))
  // hue of the cursor glow drifts from blue (left) to violet/teal (right)
  root.style.setProperty('--hue', String(Math.round(220 + (x / innerWidth) * 110)))
  raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.5 ? requestAnimationFrame(frame) : 0
}

function onMove(e: PointerEvent) {
  tx = e.clientX
  ty = e.clientY
  if (!raf) raf = requestAnimationFrame(frame)
  const card = (e.target as HTMLElement | null)?.closest?.('.card') as HTMLElement | null
  if (card) {
    const r = card.getBoundingClientRect()
    card.style.setProperty('--cx', `${e.clientX - r.left}px`)
    card.style.setProperty('--cy', `${e.clientY - r.top}px`)
  }
}

if (!reduced) {
  addEventListener('pointermove', onMove, { passive: true })
  addEventListener('pointerdown', onMove, { passive: true })
  frame()
}
