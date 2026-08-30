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

function leadOptions(hand, { isFirstTrickOfRound = false } = {}) {
  if (!isFirstTrickOfRound) return [...hand]
  const nonSpades = hand.filter((card) => card.s !== TRUMP)
  if (nonSpades.length > 0) return nonSpades
  return [...hand]
}

export function getLegalCards(hand, trick, options = {}) {
  if (!hand?.length) return []
  if (!trick?.cards?.length) return leadOptions(hand, options)

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
      if (beaters.length > 0) return beaters
      return [...hand]
    }
    return spadeCards
  }

  return [...hand]
}

export function canPlayCard(hand, card, trick, options = {}) {
  return getLegalCards(hand, trick, options).some((legal) => legal.id === card.id)
}

export function playHint(hand, trick, options = {}) {
  if (!trick?.cards?.length) {
    if (options.isFirstTrickOfRound && hand.some((card) => card.s !== TRUMP)) {
      return 'First trick lead — you cannot lead a spade unless spades are all you have left.'
    }
    return 'Your lead — play any card.'
  }

  const leadSuit = trick.cards[0].card.s
  const leadCards = hand.filter((card) => card.s === leadSuit)
  const spadeCards = hand.filter((card) => card.s === TRUMP)
  const legal = getLegalCards(hand, trick, options)

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
      return 'Cannot beat the trick — play any card.'
    }
    return 'Must trump with a spade.'
  }

  if (legal.length < hand.length) {
    return 'Void in led suit and spades — play any off-suit card (it cannot win).'
  }

  return 'Play any card.'
}

function suitLabel(suit) {
  const labels = { S: 'spades', H: 'hearts', D: 'diamonds', C: 'clubs' }
  return labels[suit] || suit
}
