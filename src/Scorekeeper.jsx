import { useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_PAYOUTS,
  PLAYERS,
  ROUNDS,
  calculatePositionMoney,
  calculateRankings,
  calculateRoundScore,
  formatDate,
  formatMoney,
  formatScore,
  rankLabel,
} from './lib/scoring.js'

const DEFAULT_PLAYERS = ['Anup', 'Dev', 'Sushil', 'Roshan']
const HISTORY_KEY = 'call-break-game-history'

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

function buildHistoryEntry(players, totals, ranks, moneyTotals, payouts, tied) {
  const results = calculateRankings(totals).map((entry) => ({
    name: players[entry.index],
    rank: ranks[entry.index],
    points: entry.total,
    money: moneyTotals[entry.index],
    tied: tied[entry.index],
  }))

  return {
    id: Date.now(),
    date: new Date().toISOString(),
    payouts: { ...payouts },
    results,
  }
}

function loadHistory() {
  try {
    const stored = localStorage.getItem(HISTORY_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
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

function PlayerInputs({ entry, roundIndex, playerIndex, onUpdate }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="block text-xs font-medium text-slate-500">
        Call
        <input
          type="number"
          inputMode="numeric"
          min={2}
          max={13}
          placeholder="2–13"
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

function GameHistory({ history, onClear }) {
  if (history.length === 0) return null

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Previous Games
        </h2>
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-medium text-slate-500 hover:text-red-600"
        >
          Clear history
        </button>
      </div>
      <div className="space-y-3">
        {history.map((game) => (
          <article
            key={game.id}
            className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 sm:p-4"
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-slate-500">{formatDate(game.date)}</p>
              <p className="text-xs text-slate-400">
                2nd/{game.payouts.second} · 3rd/{game.payouts.third} · 4th/{game.payouts.fourth}
              </p>
            </div>
            <div className="space-y-1.5">
              {game.results.map((result) => (
                <div
                  key={`${game.id}-${result.rank}`}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <div className="min-w-0">
                    <span className="font-medium text-slate-800">{result.name}</span>
                    <span className="ml-2 text-xs text-slate-500">
                      {rankLabel(result.rank, result.tied)}
                    </span>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-slate-600">{formatScore(result.points)} pts</span>
                    <span
                      className={`ml-2 font-semibold ${
                        result.money >= 0 ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {formatMoney(result.money)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function SetupScreen({
  players,
  payouts,
  history,
  onPlayersChange,
  onPayoutChange,
  onStart,
  onClearHistory,
  onBack,
}) {
  const canStart =
    players.every((name) => name.trim().length > 0) &&
    payouts.second > 0 &&
    payouts.third > 0 &&
    payouts.fourth > 0

  const winnerCollects = payouts.second + payouts.third + payouts.fourth

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 px-4 py-6 sm:py-8">
      <div className="mx-auto w-full max-w-lg space-y-6">
        {onBack && (
          <button type="button" onClick={onBack} className="text-sm text-slate-500 hover:text-slate-800">
            ← Back
          </button>
        )}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-8">
          <header className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-emerald-900 sm:text-3xl">Call Break</h1>
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

        <GameHistory history={history} onClear={onClearHistory} />
      </div>
    </div>
  )
}

export default function Scorekeeper({ onBack }) {
  const [gameStarted, setGameStarted] = useState(false)
  const [payouts, setPayouts] = useState(DEFAULT_PAYOUTS)
  const [players, setPlayers] = useState(DEFAULT_PLAYERS)
  const [rounds, setRounds] = useState(createEmptyRounds)
  const [history, setHistory] = useState(loadHistory)
  const [gameArchived, setGameArchived] = useState(false)

  useEffect(() => {
    saveHistory(history)
  }, [history])

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

  useEffect(() => {
    if (!gameComplete) setGameArchived(false)
  }, [gameComplete])

  const { money: moneyTotals, ranks, tied } = useMemo(
    () => calculatePositionMoney(totals, payouts, gameComplete),
    [totals, payouts, gameComplete],
  )

  const winners = useMemo(() => {
    if (!gameComplete) return []
    const ranked = calculateRankings(totals)
    const topScore = ranked[0].total
    return ranked.filter((player) => player.total === topScore)
  }, [gameComplete, totals])

  const winnerCollects = payouts.second + payouts.third + payouts.fourth

  const archiveCurrentGame = () => {
    if (!gameComplete || gameArchived) return
    const entry = buildHistoryEntry(players, totals, ranks, moneyTotals, payouts, tied)
    setHistory((prev) => [entry, ...prev])
    setGameArchived(true)
  }

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
      if (field === 'call' && (value < 2 || value > 13)) return
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

  const resetScores = () => {
    archiveCurrentGame()
    setRounds(createEmptyRounds())
  }

  const newGame = () => {
    archiveCurrentGame()
    setGameStarted(false)
    setRounds(createEmptyRounds())
  }

  const clearHistory = () => {
    setHistory([])
  }

  if (!gameStarted) {
    return (
      <SetupScreen
        players={players}
        payouts={payouts}
        history={history}
        onPlayersChange={updatePlayerName}
        onPayoutChange={updatePayout}
        onStart={startGame}
        onClearHistory={clearHistory}
        onBack={onBack}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 pb-28 text-slate-800 sm:pb-8">
      <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 px-3 py-3 backdrop-blur sm:px-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-emerald-900 sm:text-xl">Call Break</h1>
            <p className="truncate text-xs text-slate-500 sm:text-sm">
              5 rounds · 2nd {payouts.second} · 3rd {payouts.third} · 4th {payouts.fourth}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={resetScores}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={newGame}
              className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              New Game
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
        {gameComplete && winners.length > 0 && (
          <div className="mb-4 rounded-2xl border-2 border-amber-400 bg-amber-100 px-4 py-4 text-center shadow-lg sm:mb-6 sm:px-6 sm:py-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-800 sm:text-sm">
              {winners.length > 1 ? 'Winners (tie)' : 'Winner'}
            </p>
            <p className="mt-1 text-2xl font-bold text-amber-950 sm:text-3xl">
              {winners.map((winner) => players[winner.index]).join(' & ')}
            </p>
            <p className="mt-1 text-base text-amber-900 sm:text-lg">
              {formatScore(winners[0].total)} pts
              {winners.length === 1 && (
                <> · {formatMoney(moneyTotals[winners[0].index])}</>
              )}
            </p>
            {winners.length > 1 && (
              <p className="mt-1 text-sm text-amber-800">
                Each: {formatMoney(moneyTotals[winners[0].index])}
              </p>
            )}
          </div>
        )}

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
                      <span className="ml-2 text-xs text-emerald-300">
                        {rankLabel(ranks[index], tied[index])}
                      </span>
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

          <GameHistory history={history} onClear={clearHistory} />
        </div>

        <div className="hidden md:block">
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
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
                          {rankLabel(ranks[index], tied[index])}
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

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-5 text-left text-sm text-slate-600 shadow-sm">
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
                  {payouts.third}, 4th pays {payouts.fourth}. Tied players split the combined payout
                  for the positions they share.
                </li>
              </ul>
            </section>

            <GameHistory history={history} onClear={clearHistory} />
          </div>
        </div>
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
