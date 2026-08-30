import { useEffect, useRef, useState } from 'react'

function cardLabel(card) {
  const rankMap = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }
  const suitMap = { S: '♠', H: '♥', D: '♦', C: '♣' }
  const rank = rankMap[card.r] || String(card.r)
  return `${rank}${suitMap[card.s]}`
}

function suitColor(suit) {
  if (suit === 'H' || suit === 'D') return 'text-red-600'
  return 'text-slate-900'
}

export function shouldReduceMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function FlyingCardOverlay({ flight, onComplete }) {
  const [active, setActive] = useState(false)
  const completedRef = useRef(false)

  useEffect(() => {
    if (!flight) {
      setActive(false)
      return undefined
    }

    completedRef.current = false
    setActive(false)
    const start = requestAnimationFrame(() => {
      requestAnimationFrame(() => setActive(true))
    })
    const fallback = setTimeout(() => {
      if (!completedRef.current) onComplete()
    }, 700)

    return () => {
      cancelAnimationFrame(start)
      clearTimeout(fallback)
    }
  }, [flight, onComplete])

  if (!flight) return null

  const { card, from, to } = flight
  const scale = to.width / from.width
  const x0 = from.left
  const y0 = from.top
  const x1 = to.left + (to.width - from.width) / 2
  const y1 = to.top + (to.height - from.height) / 2

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[100]"
      style={{ perspective: '1200px' }}
      aria-hidden
    >
      <div
        className={`card-fly-3d absolute left-0 top-0 flex items-center justify-center rounded-xl border-2 border-white bg-white font-bold shadow-2xl ${suitColor(card.s)} ${
          active ? 'card-fly-3d-active' : ''
        }`}
        style={{
          width: from.width,
          height: from.height,
          fontSize: Math.max(14, Math.min(20, from.width * 0.28)),
          '--x0': `${x0}px`,
          '--y0': `${y0}px`,
          '--x1': `${x1}px`,
          '--y1': `${y1}px`,
          '--scale': scale,
        }}
        onAnimationEnd={() => {
          completedRef.current = true
          onComplete()
        }}
      >
        <span className="card-fly-face">{cardLabel(card)}</span>
      </div>
    </div>
  )
}
