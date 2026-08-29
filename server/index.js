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

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT) || 3001
const rooms = new Map()

const app = express()
const distPath = path.join(__dirname, '..', 'dist')

app.get('/health', (_req, res) => {
  res.json({ ok: true, rooms: rooms.size })
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
  return rooms.get(code.toUpperCase())
}

function sanitizeRoom(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    status: room.status,
    players: room.players.map((player) => ({
      id: player.id,
      name: player.name,
      seat: player.seat,
      connected: player.connected,
    })),
    payouts: room.game?.payouts ?? room.pendingPayouts ?? null,
  }
}

function assignSeat(room) {
  const used = new Set(room.players.map((player) => player.seat))
  for (let seat = 0; seat < 4; seat += 1) {
    if (!used.has(seat)) return seat
  }
  return null
}

function broadcastRoom(room) {
  room.players.forEach((player) => {
    if (!player.connected) return
    const payload = {
      room: sanitizeRoom(room),
      game:
        room.status === 'playing' || room.status === 'finished'
          ? getPublicGameState(room.game, player.seat)
          : null,
      you: { seat: player.seat, id: player.id },
    }
    io.to(player.id).emit('state', payload)
  })
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

  socket.on('create-room', ({ name, payouts }) => {
    let code = createRoomCode()
    while (rooms.has(code)) code = createRoomCode()

    const room = {
      code,
      hostId: socket.id,
      status: 'lobby',
      players: [{ id: socket.id, name: name?.trim() || 'Host', seat: 0, connected: true }],
      game: null,
    }

    if (payouts) room.pendingPayouts = payouts
    rooms.set(code, room)
    joinedCode = code
    socket.join(code)
    broadcastRoom(room)
  })

  socket.on('join-room', ({ code, name }) => {
    const room = getRoom(code)
    if (!room) {
      socket.emit('error-msg', 'Room not found')
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

    const existing = room.players.find((player) => player.id === socket.id)
    if (existing) {
      existing.connected = true
      existing.name = name?.trim() || existing.name
    } else {
      const seat = assignSeat(room)
      if (seat === null) {
        socket.emit('error-msg', 'Room is full')
        return
      }
      room.players.push({
        id: socket.id,
        name: name?.trim() || `Player ${seat + 1}`,
        seat,
        connected: true,
      })
    }

    joinedCode = room.code
    socket.join(room.code)
    broadcastRoom(room)
  })

  socket.on('start-game', () => {
    const room = getRoom(joinedCode)
    if (!room) return
    if (room.hostId !== socket.id) {
      socket.emit('error-msg', 'Only the host can start')
      return
    }
    if (room.players.length !== 4) {
      socket.emit('error-msg', 'Need exactly 4 players')
      return
    }

    room.game = createGameState(room.pendingPayouts)
    room.status = 'playing'
    startRound(room.game)
    broadcastRoom(room)
  })

  socket.on('submit-call', ({ call }) => {
    const room = getRoom(joinedCode)
    if (!room?.game) return
    const player = room.players.find((p) => p.id === socket.id)
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
    const player = room.players.find((p) => p.id === socket.id)
    if (!player) return

    const result = playCard(room.game, player.seat, cardId)
    if (result.error) {
      socket.emit('error-msg', result.error)
      return
    }

    if (room.game.phase === 'finished') room.status = 'finished'
    broadcastRoom(room)
  })

  socket.on('leave-room', () => {
    const room = getRoom(joinedCode)
    if (!room) return
    notifyVoicePeerLeft(room, socket.id)
    const player = room.players.find((p) => p.id === socket.id)
    if (player) player.connected = false
    socket.leave(room.code)
    joinedCode = null
    broadcastRoom(room)
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
    const player = room.players.find((p) => p.id === socket.id)
    if (player) player.connected = false
    broadcastRoom(room)
  })
})

httpServer.listen(PORT, () => {
  console.log(`Call Break server on :${PORT}`)
})
