export const TRUMP = 'S'

export function trickWinner(trick) {
  if (!trick?.cards?.length) return null
  const trumpCards = trick.cards.filter((play) => play.card.s === TRUMP)
  if (trumpCards.length > 0) {
    return trumpCards.reduce((best, play) => (play.card.r > best.card.r ? play : best)).seat
  }
  const leadSuit = trick.cards[0].card.s
  const suited = trick.cards.filter((play) => play.card.s === leadSuit)
  return suited.reduce((best, play) => (play.card.r > best.card.r ? play : best)).seat
}

function winningCard(trick) {
  if (!trick?.cards?.length) return null
  const winnerSeat = trickWinner(trick)
  return trick.cards.find((play) => play.seat === winnerSeat)?.card ?? null
}

function beatsCurrentWinner(card, trick) {
  const winner = winningCard(trick)
  if (!winner) return false

  const leadSuit = trick.cards[0].card.s
  const trumpsInTrick = trick.cards.filter((play) => play.card.s === TRUMP)

  if (winner.s === TRUMP) {
    return card.s === TRUMP && card.r > winner.r
  }

  if (trumpsInTrick.length > 0) {
    return card.s === TRUMP
  }

  if (card.s === leadSuit && winner.s === leadSuit) {
    return card.r > winner.r
  }

  return false
}

export function getLegalCards(hand, trick) {
  if (!hand?.length) return []
  if (!trick?.cards?.length) return [...hand]

  const leadSuit = trick.cards[0].card.s
  const leadCards = hand.filter((card) => card.s === leadSuit)
  const spadeCards = hand.filter((card) => card.s === TRUMP)

  if (leadCards.length > 0) {
    const beaters = leadCards.filter((card) => beatsCurrentWinner(card, trick))
    return beaters.length > 0 ? beaters : leadCards
  }

  if (spadeCards.length > 0) {
    const trumpsInTrick = trick.cards.filter((play) => play.card.s === TRUMP)
    if (trumpsInTrick.length > 0) {
      const highTrumpRank = Math.max(...trumpsInTrick.map((play) => play.card.r))
      const beaters = spadeCards.filter((card) => card.r > highTrumpRank)
      return beaters.length > 0 ? beaters : spadeCards
    }
    return spadeCards
  }

  return [...hand]
}

export function canPlayCard(hand, card, trick) {
  return getLegalCards(hand, trick).some((legal) => legal.id === card.id)
}

export function playHint(hand, trick) {
  if (!trick?.cards?.length) return 'Your lead — play any card.'

  const leadSuit = trick.cards[0].card.s
  const leadCards = hand.filter((card) => card.s === leadSuit)
  const spadeCards = hand.filter((card) => card.s === TRUMP)
  const legal = getLegalCards(hand, trick)

  if (leadCards.length > 0) {
    const mustBeat = leadCards.some((card) => beatsCurrentWinner(card, trick))
    if (mustBeat) {
      return `Must follow ${suitLabel(leadSuit)} with a higher card than the current winner.`
    }
    return `Must follow ${suitLabel(leadSuit)}.`
  }

  if (spadeCards.length > 0) {
    const trumpsInTrick = trick.cards.filter((play) => play.card.s === TRUMP)
    if (trumpsInTrick.length > 0) {
      const highTrumpRank = Math.max(...trumpsInTrick.map((play) => play.card.r))
      if (spadeCards.some((card) => card.r > highTrumpRank)) {
        return 'Must play a higher spade than any spade already in the trick.'
      }
      return 'Must play a spade (trump).'
    }
    return 'Must trump with a spade.'
  }

  if (legal.length < hand.length) {
    return 'Only highlighted cards are legal.'
  }

  return 'Play any card.'
}

function suitLabel(suit) {
  const labels = { S: 'spades', H: 'hearts', D: 'diamonds', C: 'clubs' }
  return labels[suit] || suit
}
