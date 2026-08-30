import { createServer } from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { Server } from 'socket.io'
import {
  createGameState,
  createRoomCode,
  getPublicGameState,
  playCard,
  startRound,
  submitCall,
} from './gameLogic.js'
import { fillEmptySeatsWithBots, runBots, stopBots } from './bots.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT) || 3001
const rooms = new Map()

const app = express()
const distPath = path.join(__dirname, '..', 'dist')

app.get('/health', (_req, res) => {
  res.json({ ok: true, rooms: rooms.size })
})

app.get('/api/rooms', (_req, res) => {
  res.json(getJoinableRooms())
})

if (fs.existsSync(path.join(distPath, 'index.html'))) {
  app.use(express.static(distPath))
  app.get(/^(?!\/socket\.io).*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
} else {
  app.get('/', (_req, res) => {
    res.type('text').send('Call Break server running. Run npm run build then npm start.')
  })
}

function getRoom(code) {
  if (!code) return undefined
  return rooms.get(code.toUpperCase())
}

function sanitizeRoom(room) {
  return {
    code: room.code,
    hostPlayerKey: room.hostPlayerKey,
    status: room.status,
    players: room.players.map((player) => ({
      id: player.id,
      playerKey: player.playerKey,
      name: player.name,
      seat: player.seat,
      connected: player.connected,
      isBot: Boolean(player.isBot),
    })),
    payouts: room.game?.payouts ?? room.pendingPayouts ?? null,
  }
}

function findPlayerBySocket(room, socketId) {
  return room.players.find((player) => player.id === socketId)
}

function findPlayerByKey(room, playerKey) {
  return room.players.find((player) => player.playerKey === playerKey)
}

function attachSocketToPlayer(room, player, socket) {
  player.id = socket.id
  player.connected = true
  socket.join(room.code)
}

function removePlayerFromRoom(room, playerKey) {
  const index = room.players.findIndex((player) => player.playerKey === playerKey)
  if (index === -1) return
  room.players.splice(index, 1)
  if (room.hostPlayerKey === playerKey) {
    room.hostPlayerKey = room.players[0]?.playerKey ?? null
  }
}

function publicRoomListItem(room) {
  const host = room.players.find((player) => player.playerKey === room.hostPlayerKey)
  return {
    code: room.code,
    hostName: host?.name ?? 'Host',
    players: room.players
      .slice()
      .sort((a, b) => a.seat - b.seat)
      .map((player) => ({
        name: player.name,
        connected: player.connected,
        seat: player.seat,
      })),
    playerCount: room.players.length,
    openSeats: 4 - room.players.length,
    payouts: room.pendingPayouts ?? room.game?.payouts ?? null,
  }
}

function getJoinableRooms() {
  return [...rooms.values()]
    .filter(
      (room) =>
        room.status === 'lobby' &&
        room.players.length < 4 &&
        room.players.some((player) => player.connected),
    )
    .map(publicRoomListItem)
    .sort((a, b) => b.playerCount - a.playerCount || a.code.localeCompare(b.code))
}

function broadcastRoomList() {
  io.emit('room-list', getJoinableRooms())
}

function assignSeat(room) {
  const used = new Set(room.players.map((player) => player.seat))
  for (let seat = 0; seat < 4; seat += 1) {
    if (!used.has(seat)) return seat
  }
  return null
}

function emitRoomState(room) {
  room.players.forEach((player) => {
    if (player.isBot || !player.connected) return
    const payload = {
      room: sanitizeRoom(room),
      game:
        room.status === 'playing' || room.status === 'finished'
          ? getPublicGameState(room.game, player.seat)
          : null,
      you: { seat: player.seat, id: player.id, playerKey: player.playerKey },
    }
    io.to(player.id).emit('state', payload)
  })
}

function queueBotTurn(room) {
  runBots(room, () => {
    if (room.game?.phase === 'finished') room.status = 'finished'
    emitRoomState(room)
    broadcastRoomList()
    queueBotTurn(room)
  })
}

function broadcastRoom(room) {
  emitRoomState(room)
  broadcastRoomList()
  queueBotTurn(room)
}

function notifyVoicePeerLeft(room, peerId) {
  room.players.forEach((player) => {
    if (player.id !== peerId && player.connected) {
      io.to(player.id).emit('voice-peer-left', { peerId })
    }
  })
}

function notifyVoicePeers(room, socketId) {
  room.players.forEach((player) => {
    if (player.id !== socketId && player.connected) {
      io.to(player.id).emit('voice-peer-ready', { peerId: socketId })
      io.to(socketId).emit('voice-peer-ready', { peerId: player.id })
    }
  })
}

const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: { origin: '*' },
})

io.on('connection', (socket) => {
  let joinedCode = null

  socket.emit('room-list', getJoinableRooms())

  socket.on('list-rooms', () => {
    socket.emit('room-list', getJoinableRooms())
  })

  socket.on('create-room', ({ name, payouts, playerKey }) => {
    let code = createRoomCode()
    while (rooms.has(code)) code = createRoomCode()

    const key = playerKey || socket.id
    const room = {
      code,
      hostPlayerKey: key,
      status: 'lobby',
      players: [
        {
          id: socket.id,
          playerKey: key,
          name: name?.trim() || 'Host',
          seat: 0,
          connected: true,
        },
      ],
      game: null,
    }

    if (payouts) room.pendingPayouts = payouts
    rooms.set(code, room)
    joinedCode = code
    socket.join(code)
    broadcastRoom(room)
  })

  socket.on('join-room', ({ code, name, playerKey }) => {
    const room = getRoom(code)
    if (!room) {
      socket.emit('error-msg', 'Room not found')
      return
    }

    const key = playerKey || socket.id
    const existing = findPlayerByKey(room, key)
    if (existing) {
      if (name?.trim()) existing.name = name.trim()
      attachSocketToPlayer(room, existing, socket)
      joinedCode = room.code
      broadcastRoom(room)
      return
    }

    if (room.status !== 'lobby') {
      socket.emit('error-msg', 'Game already started')
      return
    }
    if (room.players.length >= 4) {
      socket.emit('error-msg', 'Room is full')
      return
    }

    const seat = assignSeat(room)
    if (seat === null) {
      socket.emit('error-msg', 'Room is full')
      return
    }
    room.players.push({
      id: socket.id,
      playerKey: key,
      name: name?.trim() || `Player ${seat + 1}`,
      seat,
      connected: true,
    })

    joinedCode = room.code
    socket.join(room.code)
    broadcastRoom(room)
  })

  socket.on('rejoin-room', ({ code, name, playerKey }) => {
    if (!code || !playerKey) {
      socket.emit('session-expired', 'Missing session')
      return
    }

    const room = getRoom(code)
    if (!room) {
      socket.emit('session-expired', 'Room no longer exists')
      return
    }

    const existing = findPlayerByKey(room, playerKey)
    if (existing) {
      if (name?.trim()) existing.name = name.trim()
      attachSocketToPlayer(room, existing, socket)
      joinedCode = room.code
      broadcastRoom(room)
      return
    }

    if (room.status !== 'lobby') {
      socket.emit('session-expired', 'You were removed from this game')
      return
    }
    if (room.players.length >= 4) {
      socket.emit('error-msg', 'Room is full')
      return
    }

    const seat = assignSeat(room)
    if (seat === null) {
      socket.emit('error-msg', 'Room is full')
      return
    }
    room.players.push({
      id: socket.id,
      playerKey,
      name: name?.trim() || `Player ${seat + 1}`,
      seat,
      connected: true,
    })

    joinedCode = room.code
    socket.join(room.code)
    broadcastRoom(room)
  })

  socket.on('start-game', () => {
    const room = getRoom(joinedCode)
    if (!room) return
    const me = findPlayerBySocket(room, socket.id)
    if (!me || room.hostPlayerKey !== me.playerKey) {
      socket.emit('error-msg', 'Only the host can start')
      return
    }
    if (room.players.length < 1) {
      socket.emit('error-msg', 'Need at least 1 player')
      return
    }

    fillEmptySeatsWithBots(room)
    room.game = createGameState(room.pendingPayouts)
    room.status = 'playing'
    startRound(room.game)
    broadcastRoom(room)
  })

  socket.on('submit-call', ({ call }) => {
    const room = getRoom(joinedCode)
    if (!room?.game) return
    const player = findPlayerBySocket(room, socket.id)
    if (!player) return

    const result = submitCall(room.game, player.seat, Number(call))
    if (result.error) {
      socket.emit('error-msg', result.error)
      return
    }
    broadcastRoom(room)
  })

  socket.on('play-card', ({ cardId }) => {
    const room = getRoom(joinedCode)
    if (!room?.game) return
    const player = findPlayerBySocket(room, socket.id)
    if (!player) return

    const result = playCard(room.game, player.seat, cardId)
    if (result.error) {
      socket.emit('error-msg', result.error)
      return
    }

    if (room.game.phase === 'finished') room.status = 'finished'
    broadcastRoom(room)
  })

  socket.on('leave-room', ({ playerKey } = {}) => {
    const room = getRoom(joinedCode)
    if (!room) return
    notifyVoicePeerLeft(room, socket.id)
    const me = findPlayerBySocket(room, socket.id)
    const key = playerKey || me?.playerKey
    if (key) removePlayerFromRoom(room, key)
    socket.leave(room.code)
    joinedCode = null
    if (room.players.length === 0) {
      stopBots(room.code)
      rooms.delete(room.code)
      broadcastRoomList()
    } else {
      broadcastRoom(room)
    }
    socket.emit('left-room')
  })

  socket.on('voice-ready', ({ roomCode }) => {
    const room = getRoom(roomCode)
    if (!room) return
    if (!room.players.some((player) => player.id === socket.id)) return
    notifyVoicePeers(room, socket.id)
  })

  socket.on('voice-signal', ({ roomCode, to, signal }) => {
    const room = getRoom(roomCode)
    if (!room) return
    if (!room.players.some((player) => player.id === socket.id)) return
    io.to(to).emit('voice-signal', { from: socket.id, signal })
  })

  socket.on('voice-stop', ({ roomCode }) => {
    const room = getRoom(roomCode)
    if (!room) return
    notifyVoicePeerLeft(room, socket.id)
  })

  socket.on('disconnect', () => {
    const room = getRoom(joinedCode)
    if (!room) return
    notifyVoicePeerLeft(room, socket.id)
    const player = findPlayerBySocket(room, socket.id)
    if (player) player.connected = false
    broadcastRoom(room)
    joinedCode = null
  })
})

httpServer.listen(PORT, () => {
  console.log(`Call Break server on :${PORT}`)
})
