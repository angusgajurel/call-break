import { useMemo, useState } from 'react'

const DEFAULT_PLAYERS = ['Anup', 'Dev', 'Sushil', 'Roshan']
const DEFAULT_PAYOUTS = { second: 5, third: 10, fourth: 15 }
const ROUNDS = 5
const PLAYERS = 4

function createEmptyRound() {
  return Array.from({ length: PLAYERS }, () => ({ call: '', won: '' }))
}

function createEmptyRounds() {
  return Array.from({ length: ROUNDS }, () => createEmptyRound())
}

function parseNumber(value) {
  if (value === '' || value === null || value === undefined) return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function calculateRoundScore(call, won) {
  if (call === null || won === null) return null
  if (won >= call) {
    return call + (won - call) * 0.1
  }
  return -call
}

function formatScore(score) {
  if (score === null) return '—'
  return score.toFixed(1)
}

function formatMoney(amount) {
  if (amount === null || amount === undefined) return '—'
  const prefix = amount >= 0 ? '+' : '−'
  return `${prefix}${Math.abs(amount).toFixed(amount % 1 === 0 ? 0 : 1)}`
}

function isRoundComplete(round) {
  return round.every((entry) => {
    const call = parseNumber(entry.call)
    const won = parseNumber(entry.won)
    return call !== null && won !== null
  })
}

function isGameComplete(rounds) {
  return rounds.every(isRoundComplete)
}

function calculateRankings(totals) {
  return totals
    .map((total, index) => ({ index, total }))
    .sort((a, b) => b.total - a.total || a.index - b.index)
}

function calculatePositionMoney(totals, payouts, gameComplete) {
  if (!gameComplete) {
    return {
      money: Array(PLAYERS).fill(null),
      ranks: Array(PLAYERS).fill(null),
    }
  }

  const ranked = calculateRankings(totals)
  const money = Array(PLAYERS).fill(0)
  const ranks = Array(PLAYERS).fill(null)
  const loserPayouts = [payouts.second, payouts.third, payouts.fourth]
  const winnerCollects = loserPayouts.reduce((sum, value) => sum + value, 0)

  ranked.forEach((player, rank) => {
    ranks[player.index] = rank + 1
    if (rank === 0) {
      money[player.index] = winnerCollects
    } else {
      money[player.index] = -loserPayouts[rank - 1]
    }
  })

  return { money, ranks }
}

function ScoreBadge({ score }) {
  return (
    <div
      className={`rounded-lg px-2 py-1.5 text-center text-xs font-semibold sm:text-sm ${
        score === null
          ? 'bg-slate-100 text-slate-500'
          : score >= 0
            ? 'bg-emerald-100 text-emerald-800'
            : 'bg-red-100 text-red-700'
      }`}
    >
      {score === null ? '—' : formatScore(score)}
    </div>
  )
}

function MoneyBadge({ amount, large = false }) {
  const positive = amount >= 0
  return (
    <div
      className={`rounded-lg px-2 py-1.5 text-center font-semibold ${
        large ? 'text-base sm:text-lg' : 'text-xs sm:text-sm'
      } ${
        positive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
      }`}
    >
      {formatMoney(amount)}
    </div>
  )
}

function PlayerInputs({ entry, roundIndex, playerIndex, onUpdate }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="block text-xs font-medium text-slate-500">
        Call
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={8}
          placeholder="1–8"
          value={entry.call}
          onChange={(e) => onUpdate(roundIndex, playerIndex, 'call', e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2.5 text-center text-base text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
      </label>
      <label className="block text-xs font-medium text-slate-500">
        Won
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={13}
          placeholder="0–13"
          value={entry.won}
          onChange={(e) => onUpdate(roundIndex, playerIndex, 'won', e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2.5 text-center text-base text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
      </label>
    </div>
  )
}

function SetupScreen({ players, payouts, onPlayersChange, onPayoutChange, onStart }) {
  const canStart =
    players.every((name) => name.trim().length > 0) &&
    payouts.second > 0 &&
    payouts.third > 0 &&
    payouts.fourth > 0

  const winnerCollects = payouts.second + payouts.third + payouts.fourth

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-amber-50 px-4 py-8">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-8">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-emerald-900 sm:text-3xl">Nepali Call Break</h1>
          <p className="mt-2 text-sm text-slate-600">Set up players and payouts before starting</p>
        </header>

        <section className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Players
          </h2>
          <div className="space-y-3">
            {players.map((player, index) => (
              <label key={index} className="block text-sm font-medium text-slate-700">
                Player {index + 1}
                <input
                  type="text"
                  value={player}
                  onChange={(e) => onPlayersChange(index, e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </label>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Payouts by finish
          </h2>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              1st place collects
              <input
                type="text"
                readOnly
                value={winnerCollects}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-base text-slate-600"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              2nd place pays
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={payouts.second}
                onChange={(e) => onPayoutChange('second', e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              3rd place pays
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={payouts.third}
                onChange={(e) => onPayoutChange('third', e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              4th place pays
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={payouts.fourth}
                onChange={(e) => onPayoutChange('fourth', e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Rankings are set by total points after all 5 rounds. 1st collects what 2nd, 3rd, and 4th pay.
          </p>
        </section>

        <button
          type="button"
          disabled={!canStart}
          onClick={() => onStart(payouts)}
          className="w-full rounded-xl bg-emerald-700 px-4 py-3.5 text-base font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Start Game
        </button>
      </div>
    </div>
  )
}

function rankLabel(rank) {
  if (rank === 1) return '1st'
  if (rank === 2) return '2nd'
  if (rank === 3) return '3rd'
  if (rank === 4) return '4th'
  return null
}

export default function App() {
  const [gameStarted, setGameStarted] = useState(false)
  const [payouts, setPayouts] = useState(DEFAULT_PAYOUTS)
  const [players, setPlayers] = useState(DEFAULT_PLAYERS)
  const [rounds, setRounds] = useState(createEmptyRounds)

  const roundScores = useMemo(
    () =>
      rounds.map((round) =>
        round.map((entry) => {
          const call = parseNumber(entry.call)
          const won = parseNumber(entry.won)
          return calculateRoundScore(call, won)
        }),
      ),
    [rounds],
  )

  const totals = useMemo(
    () =>
      roundScores.reduce(
        (acc, round) =>
          acc.map((total, index) => {
            const score = round[index]
            return score === null ? total : total + score
          }),
        Array(PLAYERS).fill(0),
      ),
    [roundScores],
  )

  const gameComplete = isGameComplete(rounds)

  const { money: moneyTotals, ranks } = useMemo(
    () => calculatePositionMoney(totals, payouts, gameComplete),
    [totals, payouts, gameComplete],
  )

  const winnerIndex = useMemo(() => {
    if (!gameComplete) return null
    return calculateRankings(totals)[0].index
  }, [gameComplete, totals])

  const winnerCollects = payouts.second + payouts.third + payouts.fourth

  const updatePlayerName = (index, name) => {
    setPlayers((prev) => prev.map((player, i) => (i === index ? name : player)))
  }

  const updatePayout = (place, rawValue) => {
    if (rawValue === '') return
    const value = Number(rawValue)
    if (!Number.isFinite(value) || value <= 0) return
    setPayouts((prev) => ({ ...prev, [place]: value }))
  }

  const updateCell = (roundIndex, playerIndex, field, rawValue) => {
    if (rawValue !== '' && !/^\d+$/.test(rawValue)) return

    if (rawValue !== '') {
      const value = Number(rawValue)
      if (field === 'call' && (value < 1 || value > 8)) return
      if (field === 'won' && (value < 0 || value > 13)) return
    }

    setRounds((prev) =>
      prev.map((round, rIdx) =>
        rIdx === roundIndex
          ? round.map((entry, pIdx) =>
              pIdx === playerIndex ? { ...entry, [field]: rawValue } : entry,
            )
          : round,
      ),
    )
  }

  const startGame = (nextPayouts) => {
    setPayouts(nextPayouts)
    setGameStarted(true)
  }

  const resetGame = () => {
    setGameStarted(false)
    setPayouts(DEFAULT_PAYOUTS)
    setPlayers(DEFAULT_PLAYERS)
    setRounds(createEmptyRounds())
  }

  if (!gameStarted) {
    return (
      <SetupScreen
        players={players}
        payouts={payouts}
        onPlayersChange={updatePlayerName}
        onPayoutChange={updatePayout}
        onStart={startGame}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 pb-28 text-slate-800 sm:pb-8">
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-8">
        <header className="mb-4 text-center sm:mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-emerald-900 sm:text-4xl">
            Nepali Call Break
          </h1>
          <p className="mt-1 text-sm text-slate-600 sm:mt-2 sm:text-base">
            5 rounds · 2nd pays {payouts.second} · 3rd pays {payouts.third} · 4th pays {payouts.fourth}
          </p>
        </header>

        {gameComplete && winnerIndex !== null && (
          <div className="mb-4 rounded-2xl border-2 border-amber-400 bg-amber-100 px-4 py-4 text-center shadow-lg sm:mb-6 sm:px-6 sm:py-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-800 sm:text-sm">
              Winner
            </p>
            <p className="mt-1 text-2xl font-bold text-amber-950 sm:text-3xl">
              {players[winnerIndex]}
            </p>
            <p className="mt-1 text-base text-amber-900 sm:text-lg">
              {formatScore(totals[winnerIndex])} pts · collects {formatMoney(winnerCollects)}
            </p>
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 sm:mb-6">
          <p className="text-xs text-slate-500 sm:text-sm">
            1st collects {winnerCollects} · 2nd/3rd/4th pay {payouts.second}/{payouts.third}/{payouts.fourth}
          </p>
          <button
            type="button"
            onClick={resetGame}
            className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            New Game
          </button>
        </div>

        <div className="space-y-4 md:hidden">
          {rounds.map((round, roundIndex) => {
            const wonSum = round.reduce((sum, entry) => {
              const won = parseNumber(entry.won)
              return won === null ? sum : sum + won
            }, 0)
            const hasWonValues = round.some((entry) => parseNumber(entry.won) !== null)
            const wonMismatch = hasWonValues && wonSum !== 13

            return (
              <section
                key={roundIndex}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-lg font-bold text-emerald-900">Round {roundIndex + 1}</h2>
                  {wonMismatch && (
                    <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                      Won: {wonSum}/13
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {round.map((entry, playerIndex) => {
                    const score = roundScores[roundIndex][playerIndex]

                    return (
                      <div
                        key={playerIndex}
                        className="rounded-xl border border-slate-100 bg-slate-50/80 p-3"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={players[playerIndex]}
                            onChange={(e) => updatePlayerName(playerIndex, e.target.value)}
                            className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm font-semibold text-emerald-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                            aria-label={`Player ${playerIndex + 1} name`}
                          />
                          <ScoreBadge score={score} />
                        </div>
                        <PlayerInputs
                          entry={entry}
                          roundIndex={roundIndex}
                          playerIndex={playerIndex}
                          onUpdate={updateCell}
                        />
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}

          <section className="rounded-2xl border border-emerald-900 bg-emerald-950 p-4 text-white shadow-lg">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-200">
              Totals
            </h2>
            <div className="space-y-2">
              {players.map((player, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-xl bg-emerald-900/60 px-3 py-2.5"
                >
                  <div>
                    <span className="font-medium">{player}</span>
                    {ranks[index] && (
                      <span className="ml-2 text-xs text-emerald-300">{rankLabel(ranks[index])}</span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{formatScore(totals[index])} pts</div>
                    <div
                      className={`text-sm font-semibold ${
                        moneyTotals[index] === null
                          ? 'text-emerald-200/60'
                          : moneyTotals[index] >= 0
                            ? 'text-emerald-300'
                            : 'text-red-300'
                      }`}
                    >
                      {moneyTotals[index] === null ? '—' : formatMoney(moneyTotals[index])}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xl md:block">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-emerald-900 text-white">
                <th className="px-4 py-3 text-left font-semibold">Round</th>
                {players.map((player, index) => (
                  <th key={index} className="px-3 py-3 text-center font-semibold">
                    <input
                      type="text"
                      value={player}
                      onChange={(e) => updatePlayerName(index, e.target.value)}
                      className="w-full rounded-md border border-emerald-700 bg-emerald-800 px-2 py-1 text-center font-semibold text-white focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300"
                      aria-label={`Player ${index + 1} name`}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rounds.map((round, roundIndex) => {
                const wonSum = round.reduce((sum, entry) => {
                  const won = parseNumber(entry.won)
                  return won === null ? sum : sum + won
                }, 0)
                const hasWonValues = round.some((entry) => parseNumber(entry.won) !== null)
                const wonMismatch = hasWonValues && wonSum !== 13

                return (
                  <tr key={roundIndex} className="border-b border-slate-100 odd:bg-slate-50/60">
                    <td className="px-4 py-4 align-top font-semibold text-emerald-900">
                      <div>Round {roundIndex + 1}</div>
                      {wonMismatch && (
                        <div className="mt-2 rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                          Won total: {wonSum} (must be 13)
                        </div>
                      )}
                    </td>
                    {round.map((entry, playerIndex) => {
                      const score = roundScores[roundIndex][playerIndex]

                      return (
                        <td key={playerIndex} className="px-3 py-3 align-top">
                          <div className="space-y-2">
                            <PlayerInputs
                              entry={entry}
                              roundIndex={roundIndex}
                              playerIndex={playerIndex}
                              onUpdate={updateCell}
                            />
                            <ScoreBadge score={score} />
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-emerald-950 text-white">
                <td className="px-4 py-4 font-bold">Total</td>
                {totals.map((total, index) => (
                  <td key={index} className="px-3 py-4 text-center">
                    {ranks[index] && (
                      <div className="mb-1 text-xs font-medium text-emerald-300">
                        {rankLabel(ranks[index])}
                      </div>
                    )}
                    <div className="text-lg font-bold">{formatScore(total)} pts</div>
                    <div
                      className={`text-sm font-semibold ${
                        moneyTotals[index] === null
                          ? 'text-emerald-200/60'
                          : moneyTotals[index] >= 0
                            ? 'text-emerald-300'
                            : 'text-red-300'
                      }`}
                    >
                      {moneyTotals[index] === null ? '—' : formatMoney(moneyTotals[index])}
                    </div>
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>

        <section className="mt-6 hidden rounded-xl border border-slate-200 bg-white p-5 text-left text-sm text-slate-600 shadow-sm sm:mt-8 md:block">
          <h2 className="mb-2 font-semibold text-slate-800">Scoring Rules</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              If Won ≥ Call: <strong>Score = Call + ((Won − Call) × 0.1)</strong>
            </li>
            <li>
              If Won &lt; Call: <strong>Score = −Call</strong>
            </li>
            <li>The sum of Won hands in each round must equal 13.</li>
            <li>
              After all rounds: 1st collects {winnerCollects}, 2nd pays {payouts.second}, 3rd pays{' '}
              {payouts.third}, 4th pays {payouts.fourth}.
            </li>
          </ul>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 px-3 py-2 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-4 gap-1">
          {players.map((player, index) => (
            <div key={index} className="min-w-0 text-center">
              <div className="truncate text-[10px] font-medium text-slate-500">{player}</div>
              <div className="text-xs font-bold text-emerald-900">{formatScore(totals[index])}</div>
              <div
                className={`text-[10px] font-semibold ${
                  moneyTotals[index] === null
                    ? 'text-slate-400'
                    : moneyTotals[index] >= 0
                      ? 'text-emerald-600'
                      : 'text-red-600'
                }`}
              >
                {moneyTotals[index] === null ? '—' : formatMoney(moneyTotals[index])}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
