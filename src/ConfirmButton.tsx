import { useEffect, useState } from 'react'

/** Delete button that asks "Sicher?" on the first tap instead of a browser dialog. */
export default function ConfirmButton({ onConfirm, label = '✕' }: { onConfirm: () => void; label?: string }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 3000)
    return () => clearTimeout(t)
  }, [armed])
  return (
    <button className="btn danger" onClick={() => (armed ? onConfirm() : setArmed(true))}>
      {armed ? 'Löschen?' : label}
    </button>
  )
}
