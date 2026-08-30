import { useEffect, useRef, useState } from 'react'
import './card-flight.css'

const RANK_MAP = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }
const SUIT_MAP = { S: '♠', H: '♥', D: '♦', C: '♣' }
const CARD_ASPECT = 1.4

function cardRank(card) {
  return RANK_MAP[card.r] || String(card.r)
}

function cardSuit(card) {
  return SUIT_MAP[card.s] || card.s
}

function isRedSuit(suit) {
  return suit === 'H' || suit === 'D'
}

export function shouldReduceMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function normalizeCardRect(rect) {
  const width = Math.max(rect.width, 44)
  const height = width * CARD_ASPECT
  return {
    width,
    height,
    left: rect.left + (rect.width - width) / 2,
    top: rect.top + (rect.height - height) / 2,
  }
}

export function PlayingCardFace({ card, className = '' }) {
  const rank = cardRank(card)
  const suit = cardSuit(card)
  const tone = isRedSuit(card.s) ? 'playing-card-red' : 'playing-card-black'

  return (
    <div className={`playing-card ${className}`}>
      <div className="playing-card-paper">
        <div className={`playing-card-corner playing-card-corner-tl ${tone}`}>
          <span className="playing-card-rank">{rank}</span>
          <span className="playing-card-suit-sm">{suit}</span>
        </div>
        <div className={`playing-card-center ${tone}`}>{suit}</div>
        <div className={`playing-card-corner playing-card-corner-br ${tone}`}>
          <span className="playing-card-rank">{rank}</span>
          <span className="playing-card-suit-sm">{suit}</span>
        </div>
      </div>
      <div className="playing-card-edge" aria-hidden />
    </div>
  )
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
    }, 900)

    return () => {
      cancelAnimationFrame(start)
      clearTimeout(fallback)
    }
  }, [flight, onComplete])

  if (!flight) return null

  const from = normalizeCardRect(flight.from)
  const to = normalizeCardRect(flight.to)
  const x0 = from.left
  const y0 = from.top
  const x1 = to.left + (to.width - from.width) / 2
  const y1 = to.top + (to.height - from.height) / 2
  const midX = (x0 + x1) / 2
  const midY = Math.min(y0, y1) - Math.max(56, Math.abs(x1 - x0) * 0.12)
  const travel = Math.hypot(x1 - x0, y1 - y0)
  const lift = Math.min(72, 28 + travel * 0.08)
  const tilt = x0 > x1 ? -14 : 14

  return (
    <div className="card-flight-stage" aria-hidden>
      <div
        className={`card-flight ${active ? 'card-flight-active' : ''}`}
        style={{
          width: from.width,
          height: from.height,
          '--x0': `${x0}px`,
          '--y0': `${y0}px`,
          '--x1': `${x1}px`,
          '--y1': `${y1}px`,
          '--mx': `${midX}px`,
          '--my': `${midY}px`,
          '--lift': `${lift}px`,
          '--tilt': `${tilt}deg`,
          '--scale': to.width / from.width,
        }}
        onAnimationEnd={() => {
          completedRef.current = true
          onComplete()
        }}
      >
        <PlayingCardFace card={flight.card} className="playing-card-flying" />
      </div>
    </div>
  )
}
