import { useMemo, useState } from 'react'

const DEFAULT_PLAYERS = ['Anup', 'Dev', 'Sushil', 'Roshan']
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

export default function App() {
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

  const winnerIndex = useMemo(() => {
    if (!gameComplete) return null
    let bestIndex = 0
    for (let i = 1; i < totals.length; i += 1) {
      if (totals[i] > totals[bestIndex]) bestIndex = i
    }
    return bestIndex
  }, [gameComplete, totals])

  const updatePlayerName = (index, name) => {
    setPlayers((prev) => prev.map((player, i) => (i === index ? name : player)))
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

  const resetGame = () => {
    setPlayers(DEFAULT_PLAYERS)
    setRounds(createEmptyRounds())
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 px-4 py-8 text-slate-800">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-emerald-900 sm:text-4xl">
            Nepali Call Break
          </h1>
          <p className="mt-2 text-slate-600">5-round scorekeeper for 4 players</p>
        </header>

        {gameComplete && winnerIndex !== null && (
          <div className="mb-6 rounded-2xl border-2 border-amber-400 bg-amber-100 px-6 py-5 text-center shadow-lg">
            <p className="text-sm font-semibold uppercase tracking-widest text-amber-800">
              Winner
            </p>
            <p className="mt-1 text-3xl font-bold text-amber-950">
              {players[winnerIndex]}
            </p>
            <p className="mt-1 text-lg text-amber-900">
              {formatScore(totals[winnerIndex])} total points
            </p>
          </div>
        )}

        <div className="mb-6 flex justify-end">
          <button
            type="button"
            onClick={resetGame}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Reset Game
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-emerald-900 text-white">
                <th className="px-4 py-3 text-left font-semibold">Round</th>
                {players.map((player, index) => (
                  <th key={index} className="px-3 py-3 text-center font-semibold">
                    <input
                      type="text"
                      value={player}
                      onChange={(e) => updatePlayerName(index, e.target.value)}
                      className="w-full rounded-md border border-emerald-700 bg-emerald-800 px-2 py-1 text-center font-semibold text-white placeholder-emerald-300 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300"
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
                  <tr
                    key={roundIndex}
                    className="border-b border-slate-100 odd:bg-slate-50/60"
                  >
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
                            <label className="block text-left text-xs font-medium text-slate-500">
                              Call (1–8)
                              <input
                                type="number"
                                min={1}
                                max={8}
                                value={entry.call}
                                onChange={(e) =>
                                  updateCell(
                                    roundIndex,
                                    playerIndex,
                                    'call',
                                    e.target.value,
                                  )
                                }
                                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-center text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                              />
                            </label>
                            <label className="block text-left text-xs font-medium text-slate-500">
                              Won (0–13)
                              <input
                                type="number"
                                min={0}
                                max={13}
                                value={entry.won}
                                onChange={(e) =>
                                  updateCell(
                                    roundIndex,
                                    playerIndex,
                                    'won',
                                    e.target.value,
                                  )
                                }
                                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-center text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                              />
                            </label>
                            <div
                              className={`rounded-md px-2 py-1 text-center text-xs font-semibold ${
                                score === null
                                  ? 'bg-slate-100 text-slate-500'
                                  : score >= 0
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-red-100 text-red-700'
                              }`}
                            >
                              Score: {formatScore(score)}
                            </div>
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
                <td className="px-4 py-4 font-bold">Total Points</td>
                {totals.map((total, index) => (
                  <td key={index} className="px-3 py-4 text-center text-lg font-bold">
                    {formatScore(total)}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>

        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5 text-left text-sm text-slate-600 shadow-sm">
          <h2 className="mb-2 font-semibold text-slate-800">Scoring Rules</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              If Won ≥ Call: <strong>Score = Call + ((Won − Call) × 0.1)</strong>
            </li>
            <li>
              If Won &lt; Call: <strong>Score = −Call</strong>
            </li>
            <li>The sum of Won hands in each round must equal 13.</li>
          </ul>
        </section>
      </div>
    </div>
  )
}
