import { useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_PAYOUTS,
  formatMoney,
  formatScore,
  rankLabel,
} from '../lib/scoring.js'
import { createGameSocket } from './socket.js'
import { canPlayCard } from '../lib/playRules.js'
import { clearSession, getOrCreatePlayerKey, loadSession, saveSession } from './session.js'
import { useVoiceChat, VoiceAudio } from './useVoiceChat.jsx'

function cardLabel(card) {
  const rankMap = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }
  const suitMap = { S: '♠', H: '♥', D: '♦', C: '♣' }
  const rank = rankMap[card.r] || String(card.r)
  return `${rank}${suitMap[card.s]}`
}

function suitColor(suit, onDark = false) {
  if (suit === 'H' || suit === 'D') return onDark ? 'text-red-300' : 'text-red-600'
  return onDark ? 'text-white' : 'text-slate-900'
}

function CardButton({ card, onPlay, disabled, vertical = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onPlay(card.id)}
      className={`rounded-lg border border-slate-300 bg-white font-semibold shadow-sm transition hover:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-40 ${suitColor(card.s)} ${
        vertical ? 'w-full px-1 py-2.5 text-sm' : 'px-2 py-2 text-sm'
      }`}
    >
      {cardLabel(card)}
    </button>
  )
}

function CardBadge({ card, large = false, fullWidth = false }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white font-semibold shadow-sm ${fullWidth ? 'w-full' : ''} ${large ? 'min-w-[3.25rem] px-3 py-3 text-lg' : 'px-2 py-2 text-sm'} ${suitColor(card.s)}`}
    >
      {cardLabel(card)}
    </span>
  )
}

function suitLabel(suit) {
  const labels = { S: 'Spades', H: 'Hearts', D: 'Diamonds', C: 'Clubs' }
  return labels[suit] || suit
}

function TrickChips({ trick, playerNames, mySeat, winnerSeat }) {
  if (!trick?.cards?.length) return null

  return (
    <div className="flex flex-wrap gap-2">
      {trick.cards.map((play, index) => {
        const isWinner = winnerSeat !== undefined && winnerSeat !== null && play.seat === winnerSeat

        return (
          <div
            key={`${play.seat}-${play.card.id}`}
            className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm ${
              isWinner ? 'border-amber-300 bg-amber-50' : 'border-emerald-100 bg-white'
            }`}
          >
            <span className="text-[10px] font-semibold text-slate-400">{index + 1}</span>
            <span
              className={
                play.seat === mySeat
                  ? 'font-semibold text-emerald-800'
                  : isWinner
                    ? 'font-semibold text-amber-900'
                    : 'text-slate-600'
              }
            >
              {playerNames[play.seat]}
            </span>
            <span className={`font-semibold ${suitColor(play.card.s)}`}>{cardLabel(play.card)}</span>
          </div>
        )
      })}
    </div>
  )
}

function CurrentTrickPanel({ trick, playerNames, mySeat }) {
  if (!trick?.cards?.length) return null

  return (
    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-800">Current trick</p>
      <TrickChips trick={trick} playerNames={playerNames} mySeat={mySeat} />
    </div>
  )
}

function LastTrickPanel({ trick, playerNames, mySeat, trickNumber }) {
  if (!trick?.cards?.length || trick.winner === undefined || trick.winner === null) return null

  const leadSuit = trick.cards[0]?.card.s

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-800">
        Last trick · {trickNumber}/13
        {leadSuit ? ` · led ${suitLabel(leadSuit)}` : ''}
      </p>
      <TrickChips
        trick={trick}
        playerNames={playerNames}
        mySeat={mySeat}
        winnerSeat={trick.winner}
      />
    </div>
  )
}

function HandDisplay({
  hand,
  phase,
  currentTurn,
  mySeat,
  onPlay,
  currentTrick,
  isFirstTrickOfRound,
  vertical = false,
}) {
  if (!hand?.length) return null

  const isMyTurn = phase === 'playing' && currentTurn === mySeat
  const playOptions = {
    isFirstTrickOfRound: isFirstTrickOfRound && !currentTrick?.cards?.length,
  }

  if (vertical) {
    return (
      <aside className="flex h-full min-h-0 flex-col rounded-2xl border border-emerald-200 bg-white/95 p-2 shadow-lg backdrop-blur-sm">
        <div className="mb-2 border-b border-slate-100 pb-2 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800">Your hand</p>
          <p className="text-xs text-slate-500">{hand.length} cards</p>
          {isMyTurn && (
            <p className="mt-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
              Your turn
            </p>
          )}
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
          {hand.map((card) =>
            phase === 'playing' ? (
              <CardButton
                key={card.id}
                card={card}
                vertical
                disabled={!isMyTurn || !canPlayCard(hand, card, currentTrick, playOptions)}
                onPlay={onPlay}
              />
            ) : (
              <span key={card.id} className="block w-full">
                <CardBadge card={card} fullWidth />
              </span>
            ),
          )}
        </div>
      </aside>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 font-semibold text-slate-800">
        Your hand <span className="text-sm font-normal text-slate-500">({hand.length} cards)</span>
      </h3>
      <div className="flex flex-wrap gap-2">
        {hand.map((card) =>
          phase === 'playing' ? (
            <CardButton
              key={card.id}
              card={card}
              disabled={!isMyTurn || !canPlayCard(hand, card, currentTrick, playOptions)}
              onPlay={onPlay}
            />
          ) : (
            <CardBadge key={card.id} card={card} />
          ),
        )}
      </div>
    </div>
  )
}

export default function OnlineApp({ onBack }) {
  const savedSession = loadSession()
  const [socket] = useState(() => createGameSocket())
  const [screen, setScreen] = useState(savedSession?.roomCode ? 'reconnecting' : 'menu')
  const [name, setName] = useState(savedSession?.name ?? '')
  const [roomCode, setRoomCode] = useState(savedSession?.roomCode ?? '')
  const [playerKey] = useState(() => savedSession?.playerKey ?? getOrCreatePlayerKey())
  const [error, setError] = useState('')
  const [room, setRoom] = useState(null)
  const [game, setGame] = useState(null)
  const [you, setYou] = useState(null)
  const [payouts, setPayouts] = useState(DEFAULT_PAYOUTS)
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(true)
  const [reconnecting, setReconnecting] = useState(Boolean(savedSession?.roomCode))
  const [availableRooms, setAvailableRooms] = useState([])
  const [pcSeatOffer, setPcSeatOffer] = useState(null)

  const inRoom = Boolean(room?.code)
  const { micOn, voiceError, remoteStreams, toggleMic } = useVoiceChat(socket, room?.code, inRoom)

  useEffect(() => {
    const tryRejoin = () => {
      const session = loadSession()
      if (!session?.roomCode || !session?.playerKey) return
      setReconnecting(true)
      setScreen('reconnecting')
      socket.emit('rejoin-room', {
        code: session.roomCode,
        name: session.name,
        playerKey: session.playerKey,
      })
    }

    const onConnect = () => {
      setConnected(true)
      setConnecting(false)
      setError('')
      tryRejoin()
    }

    const onDisconnect = () => {
      setConnected(false)
      setConnecting(false)
    }

    const onConnectError = () => {
      setConnected(false)
      setConnecting(false)
      setReconnecting(false)
      if (loadSession()?.roomCode) {
        setScreen('reconnecting')
        setError('Lost connection. Reconnecting when server is back…')
      } else {
        setError(
          'Cannot reach the game server. Use the full app URL (npm start), not the static-only link.',
        )
      }
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('connect_error', onConnectError)

    socket.on('state', (payload) => {
      setRoom(payload.room)
      setGame(payload.game)
      setYou(payload.you)
      setError('')
      setReconnecting(false)
      setPcSeatOffer(null)
      if (payload.room) {
        setScreen('room')
        const myPlayer = payload.room.players.find((p) => p.playerKey === payload.you?.playerKey)
        saveSession({
          name: myPlayer?.name || loadSession()?.name || '',
          roomCode: payload.room.code,
          playerKey: payload.you?.playerKey || loadSession()?.playerKey || getOrCreatePlayerKey(),
        })
      }
    })

    socket.on('error-msg', (message) => {
      setReconnecting(false)
      setError(message)
    })

    socket.on('session-expired', (message) => {
      clearSession()
      setReconnecting(false)
      setRoom(null)
      setGame(null)
      setYou(null)
      setScreen('menu')
      setError(message || 'Session ended. Please join again.')
    })

    socket.on('left-room', () => {
      clearSession()
      setReconnecting(false)
      setRoom(null)
      setGame(null)
      setYou(null)
      setScreen('menu')
      socket.emit('list-rooms')
    })

    socket.on('choose-pc-seat', (offer) => {
      setPcSeatOffer(offer)
      setError('')
    })

    const onRoomList = (rooms) => setAvailableRooms(rooms)
    socket.on('room-list', onRoomList)

    socket.connect()

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('connect_error', onConnectError)
      socket.off('room-list', onRoomList)
      socket.disconnect()
    }
  }, [socket])

  useEffect(() => {
    if (screen !== 'menu' || !connected) return undefined
    socket.emit('list-rooms')
    const interval = setInterval(() => socket.emit('list-rooms'), 10000)
    return () => clearInterval(interval)
  }, [screen, connected, socket])

  const players = room?.players ?? []
  const isHost = room && you && room.hostPlayerKey === you.playerKey
  const mySeat = you?.seat ?? 0

  const playerNames = useMemo(() => {
    const names = Array(4).fill('—')
    players.forEach((player) => {
      names[player.seat] = player.name
    })
    return names
  }, [players])

  const retryConnection = () => {
    setConnecting(true)
    setError('')
    if (!socket.connected) socket.connect()
  }

  const requireConnection = () => {
    if (socket.connected) return true
    setError('Not connected to server yet. Tap Retry connection below.')
    retryConnection()
    return false
  }

  const createRoom = () => {
    if (!name.trim()) {
      setError('Enter your name first')
      return
    }
    if (!requireConnection()) return
    setError('')
    saveSession({ name: name.trim(), roomCode: '', playerKey })
    socket.emit('create-room', { name: name.trim(), payouts, playerKey })
  }

  const joinRoomByCode = (code, replaceSeat = null) => {
    if (!name.trim()) {
      setError('Enter your name first')
      return
    }
    if (!requireConnection()) return
    setError('')
    setPcSeatOffer(null)
    const normalized = code.trim().toUpperCase()
    setRoomCode(normalized)
    saveSession({ name: name.trim(), roomCode: normalized, playerKey })
    socket.emit('join-room', {
      code: normalized,
      name: name.trim(),
      playerKey,
      replaceSeat,
    })
  }

  const replacePcSeat = (seat) => {
    if (!pcSeatOffer?.code) return
    joinRoomByCode(pcSeatOffer.code, seat)
  }

  const joinRoom = () => {
    if (!roomCode.trim()) {
      setError('Enter a room code')
      return
    }
    joinRoomByCode(roomCode)
  }

  const startGame = () => socket.emit('start-game')
  const submitCall = (call) => {
    if (call > 5 && !window.confirm(`You're bidding ${call}. Are you sure?`)) return
    socket.emit('submit-call', { call })
  }
  const playCard = (cardId) => socket.emit('play-card', { cardId })
  const leaveRoom = () => {
    socket.emit('leave-room', { playerKey })
    clearSession()
    setRoom(null)
    setGame(null)
    setYou(null)
    setReconnecting(false)
    setScreen('menu')
  }

  const connectionBanner = (
    <div
      className={`mt-3 rounded-lg px-3 py-2 text-sm ${
        connected
          ? 'bg-emerald-50 text-emerald-800'
          : connecting
            ? 'bg-amber-50 text-amber-800'
            : 'bg-red-50 text-red-700'
      }`}
    >
      {connected
        ? 'Connected to game server'
        : connecting
          ? 'Connecting to game server…'
          : 'Not connected to game server'}
      {!connected && (
        <button
          type="button"
          onClick={retryConnection}
          className="ml-2 font-semibold underline"
        >
          Retry
        </button>
      )}
    </div>
  )

  if (screen === 'reconnecting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 px-4 py-8">
        <div className="mx-auto w-full max-w-lg space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl text-center">
            <h1 className="text-2xl font-bold text-emerald-900">Reconnecting…</h1>
            <p className="mt-3 text-sm text-slate-600">
              Restoring your session
              {roomCode ? (
                <>
                  {' '}
                  in room <span className="font-mono font-bold">{roomCode}</span>
                </>
              ) : null}
              {name ? (
                <>
                  {' '}
                  as <strong>{name}</strong>
                </>
              ) : null}
              .
            </p>
            {connectionBanner}
            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
            {!reconnecting && (
              <button
                type="button"
                onClick={() => {
                  setScreen('menu')
                  setError('')
                }}
                className="mt-6 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
              >
                Back to menu
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (screen === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 px-4 py-8">
        <div className="mx-auto w-full max-w-lg space-y-4">
          <button type="button" onClick={onBack} className="text-sm text-slate-500 hover:text-slate-800">
            ← Back
          </button>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h1 className="text-2xl font-bold text-emerald-900">Play Online</h1>
            <p className="mt-2 text-sm text-slate-600">
              Create a room, join an open lobby, or take over a PC seat in a game already in
              progress.
            </p>
            {connectionBanner}

            <label className="mt-6 block text-sm font-medium text-slate-700">
              Your name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base"
                placeholder="Enter your name"
              />
            </label>

            <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
              <label className="block">
                2nd pays
                <input
                  type="number"
                  min={1}
                  value={payouts.second}
                  onChange={(e) =>
                    setPayouts((prev) => ({ ...prev, second: Number(e.target.value) || 1 }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-center"
                />
              </label>
              <label className="block">
                3rd pays
                <input
                  type="number"
                  min={1}
                  value={payouts.third}
                  onChange={(e) =>
                    setPayouts((prev) => ({ ...prev, third: Number(e.target.value) || 1 }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-center"
                />
              </label>
              <label className="block">
                4th pays
                <input
                  type="number"
                  min={1}
                  value={payouts.fourth}
                  onChange={(e) =>
                    setPayouts((prev) => ({ ...prev, fourth: Number(e.target.value) || 1 }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-center"
                />
              </label>
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <button
              type="button"
              onClick={createRoom}
              disabled={!connected || connecting}
              className="mt-6 w-full cursor-pointer rounded-xl bg-emerald-700 py-3.5 text-base font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {connecting ? 'Connecting…' : connected ? 'Create Room' : 'Server Offline'}
            </button>

            <section className="mt-6">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Open rooms
                </h2>
                <button
                  type="button"
                  onClick={() => socket.emit('list-rooms')}
                  disabled={!connected}
                  className="text-xs font-medium text-emerald-700 hover:text-emerald-900 disabled:text-slate-400"
                >
                  Refresh
                </button>
              </div>

              {pcSeatOffer && (
                <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
                  <h3 className="font-semibold text-amber-950">Take over a PC seat</h3>
                  <p className="mt-1 text-sm text-amber-900">
                    Game <span className="font-mono font-bold">{pcSeatOffer.code}</span> is in
                    progress. Choose which PC to replace:
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {pcSeatOffer.seats.map((seat) => (
                      <button
                        key={seat.seat}
                        type="button"
                        onClick={() => replacePcSeat(seat.seat)}
                        className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
                      >
                        Replace {seat.name}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPcSeatOffer(null)}
                    className="mt-3 text-sm text-amber-800 underline"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {!connected ? (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  Connect to see open rooms.
                </p>
              ) : availableRooms.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  No open rooms right now. Create one or join a game in progress when a PC seat is
                  open.
                </p>
              ) : (
                <ul className="space-y-3">
                  {availableRooms.map((openRoom) => (
                    <li
                      key={openRoom.code}
                      className="rounded-xl border border-slate-200 bg-slate-50/80 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800">
                            {openRoom.hostName}&apos;s room
                            {openRoom.inProgress ? (
                              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                                Round {openRoom.round}
                              </span>
                            ) : null}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {openRoom.inProgress
                              ? `${openRoom.playerCount} human${openRoom.playerCount === 1 ? '' : 's'} · ${openRoom.openSeats} PC seat${openRoom.openSeats === 1 ? '' : 's'}`
                              : `${openRoom.playerCount}/4 players · ${openRoom.openSeats} seat${openRoom.openSeats === 1 ? '' : 's'} open`}
                            {openRoom.payouts
                              ? ` · 2nd/${openRoom.payouts.second} 3rd/${openRoom.payouts.third} 4th/${openRoom.payouts.fourth}`
                              : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => joinRoomByCode(openRoom.code)}
                          disabled={!connected || connecting}
                          className="shrink-0 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:bg-slate-300"
                        >
                          {openRoom.inProgress ? 'Take PC seat' : 'Join'}
                        </button>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {openRoom.players.map((player) => (
                          <span
                            key={`${openRoom.code}-${player.seat}`}
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              player.isBot
                                ? 'bg-violet-100 text-violet-800'
                                : player.connected
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {player.name}
                            {player.isBot ? ' · PC' : !player.connected ? ' · offline' : ''}
                          </span>
                        ))}
                      </div>
                      {openRoom.inProgress && openRoom.replaceableSeats?.length > 1 && (
                        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-200 pt-3">
                          {openRoom.replaceableSeats.map((seat) => (
                            <button
                              key={`${openRoom.code}-seat-${seat.seat}`}
                              type="button"
                              onClick={() => joinRoomByCode(openRoom.code, seat.seat)}
                              className="rounded-lg border border-violet-300 bg-white px-2.5 py-1.5 text-xs font-medium text-violet-900 hover:bg-violet-50"
                            >
                              Replace {seat.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <details className="mt-6 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <summary className="cursor-pointer text-sm font-medium text-slate-700">
                Join with room code
              </summary>
              <label className="mt-4 block text-sm font-medium text-slate-700">
                Room code
                <input
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base uppercase tracking-widest"
                  placeholder="ABC123"
                  maxLength={6}
                />
              </label>
              <button
                type="button"
                onClick={joinRoom}
                disabled={!connected || connecting || !roomCode.trim()}
                className="mt-4 w-full cursor-pointer rounded-xl border border-emerald-700 bg-white py-3 text-base font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
              >
                Join with code
              </button>
            </details>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 px-3 py-4 pb-24">
      <VoiceAudio remoteStreams={remoteStreams} players={players} />

      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-emerald-900">Call Break Online</h1>
            <p className="text-sm text-slate-500">
              Room <span className="font-mono font-bold text-emerald-800">{room?.code}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={toggleMic}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                micOn
                  ? 'bg-emerald-700 text-white'
                  : 'border border-slate-300 bg-white text-slate-700'
              }`}
            >
              {micOn ? '🎤 On' : '🎤 Talk'}
            </button>
            <button
              type="button"
              onClick={leaveRoom}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              Leave
            </button>
          </div>
        </div>

        {(error || voiceError) && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error || voiceError}
          </p>
        )}

        {room?.status === 'lobby' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-800">Waiting for players ({players.length}/4)</h2>
            <ul className="mt-3 space-y-2">
              {players.map((player) => (
                <li key={player.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span>
                    {player.name}
                    {player.isBot ? ' 🤖' : ''}
                  </span>
                  <span className="text-xs text-slate-500">
                    Seat {player.seat + 1}
                    {player.playerKey === room.hostPlayerKey ? ' · Host' : ''}
                    {player.isBot ? ' · PC' : !player.connected ? ' · Offline' : ''}
                  </span>
                </li>
              ))}
            </ul>
            {isHost && (
              <button
                type="button"
                disabled={players.length < 1}
                onClick={startGame}
                className="mt-4 w-full rounded-xl bg-emerald-700 py-3 font-semibold text-white disabled:bg-slate-300"
              >
                Start Game
              </button>
            )}
            {!isHost && (
              <p className="mt-4 text-center text-sm text-slate-500">Waiting for host to start…</p>
            )}
          </div>
        )}

        {game && (
          <div className="flex flex-col gap-4">
            <div className="flex min-h-0 items-stretch gap-3 sm:gap-4">
              <div className="min-w-0 flex-1 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-emerald-900">
                      Round {game.round}/5 ·{' '}
                      {game.phase === 'bidding'
                        ? 'Bidding'
                        : game.phase === 'playing'
                          ? 'Playing'
                          : 'Finished'}
                    </p>
                    <p className="text-sm text-slate-500">Dealer: {playerNames[game.dealer]}</p>
                  </div>

                  {game.statusMessage && (
                    <p className="mt-2 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">
                      {game.statusMessage}
                    </p>
                  )}

                  {game.phase === 'bidding' && (
                    <p className="mt-2 text-sm text-slate-600">
                      Calling: <strong>{playerNames[game.currentTurn]}</strong>
                      {game.currentTurn === mySeat ? ' (you)' : ''}
                    </p>
                  )}

                  {game.phase === 'playing' && (
                    <p className="mt-2 text-sm text-slate-600">
                      Turn: <strong>{playerNames[game.currentTurn]}</strong>
                      {game.currentTurn === mySeat ? ' (you)' : ''}
                    </p>
                  )}

                  {game.phase === 'playing' && game.currentTrick?.cards?.length > 0 && (
                    <CurrentTrickPanel
                      trick={game.currentTrick}
                      playerNames={playerNames}
                      mySeat={mySeat}
                    />
                  )}
                </div>

                {(game.phase === 'playing' || game.gameComplete) && game.lastTrick?.cards?.length > 0 && (
                  <LastTrickPanel
                    trick={game.lastTrick}
                    playerNames={playerNames}
                    mySeat={mySeat}
                    trickNumber={game.completedTricks}
                  />
                )}

                {game.phase === 'bidding' && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <h3 className="font-semibold text-amber-900">
                      Call ({game.minCall ?? 1}–{game.maxCall ?? 13})
                    </h3>
                    {game.calls[mySeat] !== null ? (
                      <p className="mt-2 text-sm text-amber-800">
                        Your call: {game.calls[mySeat]}. Waiting for{' '}
                        {playerNames[game.currentTurn]} to call…
                      </p>
                    ) : game.currentTurn === mySeat ? (
                      <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                        {Array.from({ length: (game.maxCall ?? 13) - (game.minCall ?? 1) + 1 }, (_, i) => {
                          const call = i + (game.minCall ?? 1)
                          return (
                            <button
                              key={call}
                              type="button"
                              onClick={() => submitCall(call)}
                              className="rounded-lg bg-white py-3 font-semibold shadow-sm hover:bg-emerald-50"
                            >
                              {call}
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-amber-800">
                        Waiting for <strong>{playerNames[game.currentTurn]}</strong> to call…
                      </p>
                    )}
                    <div className="mt-4 space-y-1 border-t border-amber-200 pt-3 text-sm text-amber-900">
                      {playerNames.map((player, index) => (
                        <div key={player} className="flex justify-between">
                          <span>{player}</span>
                          <span>{game.calls[index] !== null ? `call ${game.calls[index]}` : '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {game.gameComplete && (
                  <div className="rounded-2xl border-2 border-amber-400 bg-amber-100 p-5 text-center">
                    <h3 className="text-lg font-bold text-amber-950">Game Over</h3>
                    <p className="mt-2 text-amber-900">
                      Final standings below. Tied payouts are averaged.
                    </p>
                  </div>
                )}
              </div>

              {game.hand?.length > 0 && (
                <div className="w-[4.5rem] shrink-0 sm:w-24 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:min-h-[20rem]">
                  <HandDisplay
                    hand={game.hand}
                    phase={game.phase}
                    currentTurn={game.currentTurn}
                    mySeat={mySeat}
                    currentTrick={game.currentTrick}
                    isFirstTrickOfRound={game.isFirstTrickOfRound}
                    onPlay={playCard}
                    vertical
                  />
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-emerald-900 bg-emerald-950 p-4 text-white">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-200">
                Scores
              </h3>
              <div className="space-y-2">
                {playerNames.map((player, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg bg-emerald-900/60 px-3 py-2 text-sm"
                  >
                    <span>
                      {player}
                      {game.ranks[index]
                        ? ` · ${rankLabel(game.ranks[index], game.tied[index])}`
                        : ''}
                    </span>
                    <span>
                      {formatScore(game.totals[index])} pts
                      {game.callsRevealed && game.calls[index] !== null && (
                        <span className="ml-2 text-emerald-300">
                          call {game.calls[index]} · won {game.wonThisRound[index]}
                        </span>
                      )}
                      {game.gameComplete && (
                        <span
                          className={`ml-2 ${game.money[index] >= 0 ? 'text-emerald-300' : 'text-red-300'}`}
                        >
                          {formatMoney(game.money[index])}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
