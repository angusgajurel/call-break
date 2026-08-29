import { useCallback, useEffect, useRef, useState } from 'react'

const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }

function cleanupPeer(peersRef, peerId, setRemoteStreams) {
  const pc = peersRef.current.get(peerId)
  if (pc) {
    pc.close()
    peersRef.current.delete(peerId)
  }
  setRemoteStreams((prev) => {
    const next = new Map(prev)
    next.delete(peerId)
    return next
  })
}

export function useVoiceChat(socket, roomCode, active) {
  const peersRef = useRef(new Map())
  const localStreamRef = useRef(null)
  const micOnRef = useRef(false)
  const [micOn, setMicOn] = useState(false)
  const [voiceError, setVoiceError] = useState('')
  const [remoteStreams, setRemoteStreams] = useState(new Map())

  const createPeerConnection = useCallback(
    (peerId, initiator) => {
      if (peersRef.current.has(peerId)) return peersRef.current.get(peerId)

      const pc = new RTCPeerConnection(ICE_SERVERS)
      peersRef.current.set(peerId, pc)

      localStreamRef.current?.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current)
      })

      pc.onicecandidate = (event) => {
        if (event.candidate && roomCode) {
          socket.emit('voice-signal', {
            roomCode,
            to: peerId,
            signal: { candidate: event.candidate },
          })
        }
      }

      pc.ontrack = (event) => {
        const [stream] = event.streams
        if (!stream) return
        setRemoteStreams((prev) => {
          const next = new Map(prev)
          next.set(peerId, stream)
          return next
        })
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          cleanupPeer(peersRef, peerId, setRemoteStreams)
        }
      }

      if (initiator) {
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            socket.emit('voice-signal', {
              roomCode,
              to: peerId,
              signal: { sdp: pc.localDescription },
            })
          })
          .catch(() => setVoiceError('Could not start voice chat'))
      }

      return pc
    },
    [roomCode, socket],
  )

  const handleSignal = useCallback(
    async ({ from, signal }) => {
      if (!micOnRef.current) return

      let pc = peersRef.current.get(from)
      if (!pc) {
        pc = createPeerConnection(from, false)
      }

      try {
        if (signal.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
          if (signal.sdp.type === 'offer') {
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            socket.emit('voice-signal', {
              roomCode,
              to: from,
              signal: { sdp: pc.localDescription },
            })
          }
        } else if (signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate))
        }
      } catch {
        setVoiceError('Voice connection interrupted')
      }
    },
    [createPeerConnection, roomCode, socket],
  )

  const stopMic = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    localStreamRef.current = null
    micOnRef.current = false
    setMicOn(false)
    peersRef.current.forEach((_, peerId) => cleanupPeer(peersRef, peerId, setRemoteStreams))
    if (roomCode) socket.emit('voice-stop', { roomCode })
  }, [roomCode, socket])

  const startMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      localStreamRef.current = stream
      micOnRef.current = true
      setMicOn(true)
      setVoiceError('')
      if (roomCode) socket.emit('voice-ready', { roomCode })
      return true
    } catch {
      setVoiceError('Allow microphone access to talk with friends')
      return false
    }
  }, [roomCode, socket])

  const toggleMic = useCallback(async () => {
    if (micOnRef.current) {
      stopMic()
      return
    }
    await startMic()
  }, [startMic, stopMic])

  useEffect(() => {
    if (active && roomCode && micOnRef.current) {
      socket.emit('voice-ready', { roomCode })
    }
  }, [active, roomCode, socket])

  useEffect(() => {
    if (!active || !roomCode) return undefined

    const onPeerReady = ({ peerId }) => {
      if (peerId === socket.id || !micOnRef.current) return
      createPeerConnection(peerId, socket.id < peerId)
    }

    const onPeerLeft = ({ peerId }) => {
      cleanupPeer(peersRef, peerId, setRemoteStreams)
    }

    socket.on('voice-peer-ready', onPeerReady)
    socket.on('voice-signal', handleSignal)
    socket.on('voice-peer-left', onPeerLeft)

    return () => {
      socket.off('voice-peer-ready', onPeerReady)
      socket.off('voice-signal', handleSignal)
      socket.off('voice-peer-left', onPeerLeft)
    }
  }, [active, roomCode, socket, createPeerConnection, handleSignal])

  useEffect(() => {
    if (active && roomCode && micOnRef.current) {
      socket.emit('voice-ready', { roomCode })
    }
  }, [active, roomCode, socket])

  useEffect(
    () => () => {
      stopMic()
    },
    [stopMic],
  )

  return { micOn, voiceError, remoteStreams, startMic, stopMic, toggleMic }
}

export function VoiceAudio({ remoteStreams, players }) {
  return (
    <>
      {[...remoteStreams.entries()].map(([peerId, stream]) => {
        const player = players.find((p) => p.id === peerId)
        return (
          <audio
            key={peerId}
            autoPlay
            playsInline
            ref={(node) => {
              if (node && node.srcObject !== stream) node.srcObject = stream
            }}
            aria-label={player ? `Voice from ${player.name}` : 'Remote voice'}
          />
        )
      })}
    </>
  )
}
