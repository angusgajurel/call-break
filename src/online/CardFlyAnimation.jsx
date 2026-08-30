import { useEffect, useRef } from 'react'
import './card-flight.css'

const RANK_MAP = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }
const SUIT_MAP = { S: '♠', H: '♥', D: '♦', C: '♣' }
const FLIGHT_MS = 460

function cardRank(card) {
  return RANK_MAP[card.r] || String(card.r)
}

function cardSuit(card) {
  return SUIT_MAP[card.s] || card.s
}

function isRedSuit(suit) {
  return suit === 'H' || suit === 'D'
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3
}

function quadPoint(t, a, b, c) {
  const u = 1 - t
  return u * u * a + 2 * u * t * b + t * t * c
}

export function shouldReduceMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function getTrickLandingRect(dropEl, cardIndex = 0) {
  const box = dropEl.getBoundingClientRect()
  const slotWidth = 72
  return {
    left: box.left + 10 + cardIndex * slotWidth,
    top: box.top + 36,
    width: 64,
    height: 28,
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
    </div>
  )
}

export function FlyingCardOverlay({ flight, onComplete }) {
  const cardRef = useRef(null)
  const completedRef = useRef(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    if (!flight) return undefined

    completedRef.current = false
    const el = cardRef.current
    if (!el) return undefined

    const { from, to, card } = flight
    const w = from.width
    const h = from.height
    const x0 = from.left
    const y0 = from.top
    const x1 = to.left + (to.width - w) / 2
    const y1 = to.top + (to.height - h) / 2
    const cx = x0 + (x1 - x0) * 0.55
    const cy = Math.min(y0, y1) - 24 - Math.hypot(x1 - x0, y1 - y0) * 0.1
    const lean = x0 > x1 ? 8 : -8
    const endScale = Math.min(0.92, Math.max(0.72, to.width / w))

    const paint = (progress) => {
      const x = quadPoint(progress, x0, cx, x1)
      const y = quadPoint(progress, y0, cy, y1)
      const arc = Math.sin(progress * Math.PI)
      const rotateX = (1 - progress) * 10 - arc * 3
      const rotateY = (1 - progress) * lean
      const rotateZ = (1 - progress) * (lean * 0.35)
      const scale = 1 - progress * (1 - endScale)
      const shadowY = 4 + arc * 14
      const shadowBlur = 8 + arc * 16

      el.style.transform = `translate3d(${x}px, ${y}px, 0) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale(${scale})`
      el.style.filter = `drop-shadow(0 ${shadowY}px ${shadowBlur}px rgb(15 23 42 / ${0.1 + arc * 0.12}))`
    }

    paint(0)

    const start = performance.now()
    let frame = 0

    const tick = (now) => {
      const raw = Math.min(1, (now - start) / FLIGHT_MS)
      const progress = easeOutCubic(raw)
      paint(progress)

      if (raw < 1) {
        frame = requestAnimationFrame(tick)
        return
      }

      if (!completedRef.current) {
        completedRef.current = true
        onCompleteRef.current()
      }
    }

    frame = requestAnimationFrame(tick)
    const fallback = setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true
        onCompleteRef.current()
      }
    }, FLIGHT_MS + 80)

    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(fallback)
    }
  }, [flight])

  if (!flight) return null

  return (
    <div className="card-flight-stage" aria-hidden>
      <div
        ref={cardRef}
        className="card-flight"
        style={{ width: flight.from.width, height: flight.from.height }}
      >
        <PlayingCardFace card={flight.card} className="playing-card-flying" />
      </div>
    </div>
  )
}
