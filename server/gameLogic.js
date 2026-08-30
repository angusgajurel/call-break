import {
  DEFAULT_PAYOUTS,
  PLAYERS,
  ROUNDS,
  calculatePositionMoney,
  calculateRoundScore,
} from '../shared/scoring.js'
import { TRUMP, canPlayCard, getLegalCards, trickWinner } from '../shared/playRules.js'

const SUITS = ['C', 'D', 'H', 'S']
const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]

export { TRUMP, canPlayCard, getLegalCards, trickWinner }

export function nextSeatCCW(seat) {
  return (seat - 1 + PLAYERS) % PLAYERS
}

export function createDeck() {
  const deck = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ s: suit, r: rank, id: `${suit}${rank}` })
    }
  }
  return shuffle(deck)
}

function shuffle(deck) {
  const copy = [...deck]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function dealHands(deck) {
  const hands = Array.from({ length: PLAYERS }, () => [])
  for (let i = 0; i < 52; i += 1) {
    hands[i % PLAYERS].push(deck[i])
  }
  for (const hand of hands) {
    hand.sort((a, b) => a.s.localeCompare(b.s) || a.r - b.r)
  }
  return hands
}

export function createRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export function createGameState(payouts = DEFAULT_PAYOUTS) {
  return {
    round: 1,
    dealer: 0,
    phase: 'bidding',
    hands: Array.from({ length: PLAYERS }, () => []),
    calls: Array(PLAYERS).fill(null),
    wonThisRound: Array(PLAYERS).fill(0),
    totals: Array(PLAYERS).fill(0),
    currentTrick: { cards: [] },
    trickLeader: 0,
    currentTurn: 0,
    payouts: { ...payouts },
    completedTricks: 0,
    lastTrickWinner: null,
  }
}

export function startRound(game) {
  const deck = createDeck()
  game.hands = dealHands(deck)
  game.calls = Array(PLAYERS).fill(null)
  game.wonThisRound = Array(PLAYERS).fill(0)
  game.currentTrick = { cards: [] }
  game.trickLeader = nextSeatCCW(game.dealer)
  game.currentTurn = game.trickLeader
  game.completedTricks = 0
  game.phase = 'bidding'
  game.lastTrickWinner = null
}

export function allCallsSubmitted(game) {
  return game.calls.every((call) => call !== null)
}

export function beginPlay(game) {
  game.phase = 'playing'
  game.currentTurn = game.trickLeader
}

export function submitCall(game, seat, call) {
  if (game.phase !== 'bidding') return { error: 'Not in bidding phase' }
  if (game.calls[seat] !== null) return { error: 'Call already submitted' }
  if (!Number.isInteger(call) || call < 1 || call > 8) return { error: 'Call must be 1–8' }
  game.calls[seat] = call
  if (allCallsSubmitted(game)) beginPlay(game)
  return { ok: true }
}

export function playCard(game, seat, cardId) {
  if (game.phase !== 'playing') return { error: 'Not in playing phase' }
  if (game.currentTurn !== seat) return { error: 'Not your turn' }

  const hand = game.hands[seat]
  const card = hand.find((c) => c.id === cardId)
  if (!card) return { error: 'Card not in hand' }
  if (!canPlayCard(hand, card, game.currentTrick)) return { error: 'Illegal card for this trick' }

  hand.splice(hand.indexOf(card), 1)
  game.currentTrick.cards.push({ seat, card })

  if (game.currentTrick.cards.length === PLAYERS) {
    const winner = trickWinner(game.currentTrick)
    game.wonThisRound[winner] += 1
    game.completedTricks += 1
    game.lastTrickWinner = winner
    game.currentTrick = { cards: [] }
    game.trickLeader = winner
    game.currentTurn = winner

    if (game.completedTricks === 13) {
      finishRound(game)
    }
  } else {
    game.currentTurn = nextSeatCCW(game.currentTurn)
  }

  return { ok: true }
}

function finishRound(game) {
  for (let seat = 0; seat < PLAYERS; seat += 1) {
    const roundScore = calculateRoundScore(game.calls[seat], game.wonThisRound[seat])
    game.totals[seat] += roundScore
  }

  if (game.round >= ROUNDS) {
    game.phase = 'finished'
    return
  }

  game.round += 1
  game.dealer = nextSeatCCW(game.dealer)
  startRound(game)
}

export function getPublicGameState(game, seat) {
  const gameComplete = game.phase === 'finished'
  const { money, ranks, tied } = calculatePositionMoney(game.totals, game.payouts, gameComplete)

  return {
    round: game.round,
    dealer: game.dealer,
    phase: game.phase,
    calls: game.calls.map((call) => (call !== null ? call : null)),
    callsRevealed: game.phase !== 'bidding',
    wonThisRound: [...game.wonThisRound],
    totals: [...game.totals],
    currentTrick: game.currentTrick,
    trickLeader: game.trickLeader,
    currentTurn: game.currentTurn,
    payouts: game.payouts,
    completedTricks: game.completedTricks,
    lastTrickWinner: game.lastTrickWinner,
    hand: game.hands[seat] ? [...game.hands[seat]] : [],
    money,
    ranks,
    tied,
    gameComplete,
    playDirection: 'ccw',
  }
}

export function cardLabel(card) {
  const rankMap = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }
  const suitMap = { S: '♠', H: '♥', D: '♦', C: '♣' }
  const rank = rankMap[card.r] || String(card.r)
  return `${rank}${suitMap[card.s]}`
}
