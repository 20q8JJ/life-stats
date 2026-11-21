import { useEffect, useRef, useState } from 'react'

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Number that counts up from 0 (or its previous value) to `value`. */
export function CountUp({ value, decimals = 0, duration = 1100 }: { value: number; decimals?: number; duration?: number }) {
  const [shown, setShown] = useState(reduced() ? value : 0)
  const from = useRef(0)
  useEffect(() => {
    if (reduced()) return setShown(value)
    const start = performance.now()
    const a = from.current
    let raf = 0
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / duration)
      const e = 1 - Math.pow(1 - k, 3)
      setShown(a + (value - a) * e)
      if (k < 1) raf = requestAnimationFrame(tick)
      else from.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  return <>{shown.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</>
}

/** Animated progress ring. `value`/`goal` drive the fill; center shows `center`. */
export function Ring({ value, goal, color, label, center, sub }: { value: number; goal: number; color: string; label: string; center: React.ReactNode; sub?: string }) {
  const r = 42
  const c = 2 * Math.PI * r
  const pct = goal > 0 ? Math.min(1, value / goal) : 0
  const [p, setP] = useState(reduced() ? pct : 0)
  useEffect(() => {
    const t = setTimeout(() => setP(pct), 60)
    return () => clearTimeout(t)
  }, [pct])
  return (
    <div className="ring">
      <div className="ring-wrap">
        <svg viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} fill="none" stroke="var(--hair)" strokeWidth="9" />
          <circle
            className="arc"
            cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - p)}
            style={{ ['--glow' as string]: color }}
          />
        </svg>
        <div className="ring-center">{center}</div>
      </div>
      <div className="ring-label">{label}</div>
      {sub && <div className="ring-sub">{sub}</div>}
    </div>
  )
}
