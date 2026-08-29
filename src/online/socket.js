import { io } from 'socket.io-client'

export function getSocketUrl() {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL
  }
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return ''
}

export function createGameSocket() {
  return io(getSocketUrl(), {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    transports: ['websocket', 'polling'],
  })
}
