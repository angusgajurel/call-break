export const DEFAULT_PAYOUTS = { second: 5, third: 10, fourth: 15 }
export const ROUNDS = 5
export const PLAYERS = 4

export function calculateRoundScore(call, won) {
  if (call === null || won === null) return null
  if (won >= call) {
    return call + (won - call) * 0.1
  }
  return -call
}

export function formatScore(score) {
  if (score === null) return '—'
  return score.toFixed(1)
}

export function formatMoney(amount) {
  if (amount === null || amount === undefined) return '—'
  const prefix = amount >= 0 ? '+' : '−'
  return `${prefix}${Math.abs(amount).toFixed(amount % 1 === 0 ? 0 : 1)}`
}

export function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function calculateRankings(totals) {
  return totals
    .map((total, index) => ({ index, total }))
    .sort((a, b) => b.total - a.total || a.index - b.index)
}

function getPayoutForRank(rank, payouts) {
  const loserPayouts = [payouts.second, payouts.third, payouts.fourth]
  const winnerCollects = loserPayouts.reduce((sum, value) => sum + value, 0)
  if (rank === 1) return winnerCollects
  if (rank >= 2 && rank <= 4) return -loserPayouts[rank - 2]
  return 0
}

export function calculatePositionMoney(totals, payouts, gameComplete) {
  if (!gameComplete) {
    return {
      money: Array(PLAYERS).fill(null),
      ranks: Array(PLAYERS).fill(null),
      tied: Array(PLAYERS).fill(false),
    }
  }

  const ranked = calculateRankings(totals)
  const money = Array(PLAYERS).fill(0)
  const ranks = Array(PLAYERS).fill(null)
  const tied = Array(PLAYERS).fill(false)

  let i = 0
  while (i < ranked.length) {
    let j = i + 1
    while (j < ranked.length && ranked[j].total === ranked[i].total) {
      j += 1
    }

    const groupSize = j - i
    const rankStart = i + 1
    const rankEnd = j

    let payoutSum = 0
    for (let rank = rankStart; rank <= rankEnd; rank += 1) {
      payoutSum += getPayoutForRank(rank, payouts)
    }
    const avgPayout = payoutSum / groupSize

    for (let k = i; k < j; k += 1) {
      ranks[ranked[k].index] = rankStart
      money[ranked[k].index] = avgPayout
      tied[ranked[k].index] = groupSize > 1
    }

    i = j
  }

  return { money, ranks, tied }
}

export function rankLabel(rank, isTied = false) {
  if (rank === 1) return isTied ? '1st (tie)' : '1st'
  if (rank === 2) return isTied ? '2nd (tie)' : '2nd'
  if (rank === 3) return isTied ? '3rd (tie)' : '3rd'
  if (rank === 4) return isTied ? '4th (tie)' : '4th'
  return null
}
