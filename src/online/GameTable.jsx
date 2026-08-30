import { useMemo, useState } from 'react'
import { formatMoney, formatScore, rankLabel } from '../lib/scoring.js'
import { canPlayCard } from '../lib/playRules.js'
import { PlayingCardFace } from './CardFlyAnimation.jsx'
import { useIsPortrait } from './useOrientation.js'
import './game-table.css'

const POSITIONS = ['bottom', 'left', 'top', 'right']

function relativeSeat(seat, mySeat) {
  return (seat - mySeat + 4) % 4
}

function seatPosition(seat, mySeat) {
  const rel = relativeSeat(seat, mySeat)
  return POSITIONS[rel]
}

function initials(name) {
  if (!name || name === '—') return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function TrickCenter({ trick, playerNames, mySeat, winnerSeat, trickDropRef }) {
  const hasCards = trick?.cards?.length > 0

  return (
    <div ref={trickDropRef} className="trick-center" aria-label="Current trick">
      {hasCards ? (
        trick.cards.map((play, index) => {
          const isWinner = winnerSeat !== undefined && winnerSeat !== null && play.seat === winnerSeat
          return (
            <div
              key={`${play.seat}-${play.card.id}`}
              className={`trick-chip-dark ${isWinner ? 'trick-chip-dark-winner' : ''}`}
            >
              <PlayingCardFace card={play.card} className="playing-card--compact" />
              <span className="trick-chip-name">
                {play.seat === mySeat ? 'You' : playerNames[play.seat]}
              </span>
            </div>
          )
        })
      ) : (
        <p className="trick-placeholder">Cards played this trick appear here</p>
      )}
    </div>
  )
}

function BidModal({ game, playerNames, mySeat, onSubmitCall }) {
  const min = game.minCall ?? 1
  const max = game.maxCall ?? 13
  const calls = Array.from({ length: max - min + 1 }, (_, i) => i + min)

  if (game.calls[mySeat] !== null && game.currentTurn !== mySeat) {
    return (
      <div className="bid-modal">
        <div className="bid-modal-tab game-serif">Your Call</div>
        <div className="bid-waiting">
          Your call: <strong>{game.calls[mySeat]}</strong>
          <br />
          Waiting for <strong>{playerNames[game.currentTurn]}</strong>…
        </div>
      </div>
    )
  }

  if (game.currentTurn !== mySeat) {
    return (
      <div className="bid-modal">
        <div className="bid-modal-tab game-serif">Bidding</div>
        <div className="bid-waiting">
          Waiting for <strong>{playerNames[game.currentTurn]}</strong> to call…
        </div>
      </div>
    )
  }

  return (
    <div className="bid-modal">
      <div className="bid-modal-tab game-serif">Your Call</div>
      <div className="bid-modal-body">
        <div className="bid-grid">
          {calls.map((call) => (
            <button
              key={call}
              type="button"
              className="bid-chip"
              onClick={() => onSubmitCall(call)}
            >
              {call}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function OpponentSeat({ seat, game, playerNames, mySeat, position }) {
  const name = playerNames[seat]
  const won = game.wonThisRound[seat] ?? 0
  const call = game.calls[seat]
  const isActive = game.currentTurn === seat
  const isDealer = game.dealer === seat
  const posClass = `opponent-seat opponent-seat-${position}`

  return (
    <div className={posClass}>
      <div
        className={`opponent-avatar ${isActive ? 'opponent-avatar-active' : ''} ${isDealer ? 'opponent-avatar-dealer' : ''}`}
        title={name}
      >
        {initials(name)}
      </div>
      <div className="opponent-cards-back" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <p className="opponent-score">
        {won}/{call !== null ? call : '—'}
      </p>
      <p className="opponent-name">{name}</p>
    </div>
  )
}

function HandFan({
  hand,
  phase,
  currentTurn,
  mySeat,
  onPlay,
  currentTrick,
  isFirstTrickOfRound,
  hiddenCardId,
  animating,
}) {
  if (!hand?.length) return null

  const isMyTurn = phase === 'playing' && currentTurn === mySeat
  const playOptions = {
    isFirstTrickOfRound: isFirstTrickOfRound && !currentTrick?.cards?.length,
  }

  return (
    <div className="hand-fan-bar">
      <div className="player-self-bar">
        {isMyTurn && <span className="your-turn-badge">Your turn</span>}
        <span>{hand.length} cards</span>
      </div>
      <div className="hand-fan">
        {hand.map((card) => {
          const playable =
            phase === 'playing' &&
            isMyTurn &&
            canPlayCard(hand, card, currentTrick, playOptions)

          if (phase !== 'playing') {
            return (
              <div key={card.id} className="hand-fan-card">
                <PlayingCardFace card={card} className="playing-card--compact" />
              </div>
            )
          }

          return (
            <button
              key={card.id}
              type="button"
              className={`hand-fan-card ${card.id === hiddenCardId ? 'hand-fan-card-hidden' : ''}`}
              disabled={animating || !playable}
              onClick={(event) => onPlay(card.id, event.currentTarget)}
            >
              <PlayingCardFace card={card} className="playing-card--compact" />
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ScoresDrawer({ game, playerNames, onClose }) {
  return (
    <div className="scores-drawer" role="dialog" aria-label="Scores" onClick={onClose}>
      <div className="scores-drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="game-serif text-lg font-semibold text-[var(--gold-light)]">Scores</h3>
          <button type="button" className="game-table-btn" onClick={onClose}>
            Close
          </button>
        </div>

        {game.lastRoundScores && (
          <div className="scores-section">
            <p className="scores-section-title">
              Last round {game.lastRoundNumber ? `(${game.lastRoundNumber})` : ''}
            </p>
            {playerNames.map((player, index) => (
              <div key={`last-${index}`} className="scores-row">
                <span>{player}</span>
                <span>{formatScore(game.lastRoundScores[index])} pts</span>
              </div>
            ))}
          </div>
        )}

        <div className="scores-section">
          <p className="scores-section-title">
            Round {game.round}
            {game.phase === 'bidding'
              ? ' · bidding'
              : game.phase === 'playing'
                ? ' · playing'
                : game.gameComplete
                  ? ' · finished'
                  : ''}
          </p>
          {playerNames.map((player, index) => (
            <div key={`round-${index}`} className="scores-row">
              <span>{player}</span>
              <span>
                {game.calls[index] !== null
                  ? `call ${game.calls[index]} · won ${game.wonThisRound[index]}`
                  : '—'}
              </span>
            </div>
          ))}
        </div>

        <div className="scores-section">
          <p className="scores-section-title">Total</p>
          {playerNames.map((player, index) => (
            <div key={`total-${index}`} className="scores-row scores-row-total">
              <span>
                {player}
                {game.ranks[index]
                  ? ` · ${rankLabel(game.ranks[index], game.tied[index])}`
                  : ''}
              </span>
              <span>
                {formatScore(game.totals[index])} pts
                {game.gameComplete && (
                  <span className={game.money[index] >= 0 ? 'money-positive' : 'money-negative'}>
                    {' '}
                    {formatMoney(game.money[index])}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function GameTable({
  game,
  playerNames,
  mySeat,
  roomCode,
  trickDropRef,
  onPlay,
  onSubmitCall,
  onLeave,
  onToggleMic,
  micOn,
  hiddenCardId,
  animating,
  error,
  voiceError,
}) {
  const portrait = useIsPortrait()
  const [scoresOpen, setScoresOpen] = useState(false)

  const opponents = useMemo(() => {
    return [0, 1, 2, 3]
      .filter((seat) => seat !== mySeat)
      .map((seat) => ({
        seat,
        position: seatPosition(seat, mySeat),
      }))
  }, [mySeat])

  const myWon = game.wonThisRound[mySeat] ?? 0
  const myCall = game.calls[mySeat]

  const phaseLabel =
    game.phase === 'bidding' ? 'Bidding' : game.phase === 'playing' ? 'Playing' : 'Finished'

  return (
    <div className="game-table-root">
      {portrait && (
        <div className="rotate-overlay">
          <div className="rotate-overlay-icon" />
          <p className="game-serif text-xl font-semibold text-[var(--gold-light)]">Rotate your device</p>
          <p className="max-w-xs text-sm text-slate-300">
            Turn your phone sideways for the best table view.
          </p>
        </div>
      )}

      <div className="game-table-shell">
        <header className="game-table-header">
          <button type="button" className="game-table-btn" onClick={onLeave} aria-label="Leave game">
            ←
          </button>
          <div className="player-self-header">
            <div className="opponent-avatar opponent-avatar-self">{initials(playerNames[mySeat])}</div>
            <span className="opponent-score">
              {myWon}/{myCall !== null ? myCall : '—'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`game-table-btn ${micOn ? 'game-table-btn-active' : ''}`}
              onClick={onToggleMic}
            >
              {micOn ? '🎤' : '🔇'}
            </button>
            <button type="button" className="game-table-btn" onClick={() => setScoresOpen(true)}>
              Scores
            </button>
            <span className="game-serif round-badge">Round {game.round}</span>
          </div>
        </header>

        {(error || voiceError) && (
          <p className="game-status-toast">{error || voiceError}</p>
        )}

        {game.statusMessage && (
          <p className="game-status-toast game-status-toast-amber">{game.statusMessage}</p>
        )}

        <div className="game-felt">
          {opponents.map(({ seat, position }) => (
            <OpponentSeat
              key={seat}
              seat={seat}
              game={game}
              playerNames={playerNames}
              mySeat={mySeat}
              position={position}
            />
          ))}

          <div className="table-center">
            {game.phase === 'bidding' && (
              <BidModal
                game={game}
                playerNames={playerNames}
                mySeat={mySeat}
                onSubmitCall={onSubmitCall}
              />
            )}

            {game.phase === 'playing' && (
              <TrickCenter
                trick={game.currentTrick}
                playerNames={playerNames}
                mySeat={mySeat}
                trickDropRef={trickDropRef}
              />
            )}

            {game.gameComplete && (
              <div className="bid-modal">
                <div className="bid-modal-tab game-serif">Game Over</div>
                <div className="bid-waiting">
                  Final standings — open Scores for payouts.
                </div>
              </div>
            )}
          </div>

          <p className="felt-phase-label">
            {phaseLabel}
            {game.phase === 'playing' && (
              <> · Turn: {playerNames[game.currentTurn]}</>
            )}
            {roomCode && <span className="felt-room-code">{roomCode}</span>}
          </p>

          {game.phase === 'playing' && game.lastTrick?.cards?.length > 0 && (
            <div className="last-trick-strip">
              <p className="last-trick-title">Last trick · {game.completedTricks}/13</p>
              <div className="last-trick-cards">
                {game.lastTrick.cards.map((play) => (
                  <PlayingCardFace
                    key={`${play.seat}-${play.card.id}`}
                    card={play.card}
                    className={`playing-card--compact ${play.seat === game.lastTrick.winner ? 'last-trick-winner' : ''}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <HandFan
          hand={game.hand}
          phase={game.phase}
          currentTurn={game.currentTurn}
          mySeat={mySeat}
          onPlay={onPlay}
          currentTrick={game.currentTrick}
          isFirstTrickOfRound={game.isFirstTrickOfRound}
          hiddenCardId={hiddenCardId}
          animating={animating}
        />
      </div>

      {scoresOpen && (
        <ScoresDrawer game={game} playerNames={playerNames} onClose={() => setScoresOpen(false)} />
      )}
    </div>
  )
}
