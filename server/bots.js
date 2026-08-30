import { getLegalCards, playCard, submitCall } from './gameLogic.js'

const BOT_NAMES = ['PC Anup', 'PC Dev', 'PC Sushil', 'PC Roshan']
const botTimers = new Map()

export function createBotPlayer(room, seat, botIndex) {
  return {
    id: `bot-${room.code}-${seat}`,
    playerKey: `bot-${room.code}-${seat}`,
    name: BOT_NAMES[botIndex] ?? `PC ${seat + 1}`,
    seat,
    connected: true,
    isBot: true,
  }
}

export function convertSeatToBot(room, player) {
  if (!player || player.isBot) return
  const botIndex = player.seat % BOT_NAMES.length
  player.isBot = true
  player.id = `bot-${room.code}-${player.seat}`
  player.playerKey = `bot-${room.code}-${player.seat}`
  player.name = BOT_NAMES[botIndex] ?? `PC ${player.seat + 1}`
  player.connected = true
}

export function replaceBotWithHuman(room, seat, { socketId, name, playerKey }) {
  const bot = room.players.find((player) => player.seat === seat && player.isBot)
  if (!bot) return { error: 'No PC at that seat' }

  bot.id = socketId
  bot.playerKey = playerKey
  bot.name = name?.trim() || bot.name
  bot.connected = true
  bot.isBot = false
  return { ok: true, seat }
}

export function fillEmptySeatsWithBots(room) {
  const usedSeats = new Set(room.players.map((player) => player.seat))
  let botIndex = 0
  for (let seat = 0; seat < 4; seat += 1) {
    if (!usedSeats.has(seat)) {
      room.players.push(createBotPlayer(room, seat, botIndex))
      botIndex += 1
    }
  }
  room.players.sort((a, b) => a.seat - b.seat)
}

function chooseBotCall(game, seat) {
  const hand = game.hands[seat] ?? []
  const spades = hand.filter((card) => card.s === 'S').length
  const highs = hand.filter((card) => card.r >= 11).length
  const estimate = Math.round(spades * 0.55 + highs * 0.45)
  return Math.min(13, Math.max(2, estimate || 2))
}

function wouldWinTrick(trick, seat, card) {
  const trial = { cards: [...trick.cards, { seat, card }] }
  const trumpCards = trial.cards.filter((play) => play.card.s === 'S')
  if (trumpCards.length > 0) {
    const best = trumpCards.reduce((bestPlay, play) =>
      play.card.r > bestPlay.card.r ? play : bestPlay,
    )
    return best.seat === seat
  }
  const leadSuit = trial.cards[0].card.s
  const suited = trial.cards.filter((play) => play.card.s === leadSuit)
  const best = suited.reduce((bestPlay, play) =>
    play.card.r > bestPlay.card.r ? play : bestPlay,
  )
  return best.seat === seat
}

function pickBotCard(game, seat) {
  const hand = game.hands[seat] ?? []
  const playOptions = {
    isFirstTrickOfRound: game.completedTricks === 0 && game.currentTrick.cards.length === 0,
  }
  const legal = getLegalCards(hand, game.currentTrick, playOptions)
  if (!legal.length) return null

  const winningCards = legal.filter((card) => wouldWinTrick(game.currentTrick, seat, card))
  const pool = winningCards.length > 0 ? winningCards : legal
  return pool.sort((a, b) => a.r - b.r || a.s.localeCompare(b.s))[0]
}

function clearBotTimer(roomCode) {
  const timer = botTimers.get(roomCode)
  if (timer) {
    clearTimeout(timer)
    botTimers.delete(roomCode)
  }
}

function fillBotCalls(room) {
  const game = room.game
  if (!game || game.phase !== 'bidding') return false

  const seat = game.currentTurn
  const player = room.players.find((entry) => entry.seat === seat)
  if (!player?.isBot || game.calls[seat] !== null) return false

  submitCall(game, seat, chooseBotCall(game, seat))
  return true
}

export function runBots(room, onUpdate) {
  const game = room.game
  if (!game || room.status !== 'playing') return

  if (game.phase === 'bidding') {
    if (fillBotCalls(room)) onUpdate()
    return
  }

  if (game.phase !== 'playing') return

  const player = room.players.find((entry) => entry.seat === game.currentTurn)
  if (!player?.isBot) return

  clearBotTimer(room.code)
  botTimers.set(
    room.code,
    setTimeout(() => {
      botTimers.delete(room.code)
      const card = pickBotCard(game, player.seat)
      if (!card) return
      const result = playCard(game, player.seat, card.id)
      if (result.error) return
      if (game.phase === 'finished') room.status = 'finished'
      onUpdate()
    }, 900),
  )
}

export function stopBots(roomCode) {
  clearBotTimer(roomCode)
}
