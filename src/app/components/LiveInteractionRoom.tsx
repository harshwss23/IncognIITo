import React, { useState, useEffect, useRef, useCallback } from 'react'
import io, { Socket } from 'socket.io-client'
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  Send,
  Settings,
  Shield,
  PhoneOff,
} from 'lucide-react'
import { useThemeColors } from '@/app/hooks/useThemeColors'
import { useTheme } from '@/app/contexts/ThemeContext'
import { socketUrl } from '@/services/config'

const SOCKET_SERVER_URL = socketUrl
const ROOM_ID = 'incogniito-test-room'

export function LiveInteractionRoom() {
  const colors = useThemeColors()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  /* ---------------- REFS ---------------- */

  const socketRef = useRef<Socket | null>(null)
  const peerRef = useRef<RTCPeerConnection | null>(null)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)

  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)

  const iceQueueRef = useRef<RTCIceCandidateInit[]>([])
  const initializedRef = useRef(false)
  
  // FIX 1: Track the latest state to avoid stale closures in socket events
  const cameraOnRef = useRef(false) 

  /* ---------------- STATE ---------------- */

  const [micOn, setMicOn] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)
  const [remoteCameraOn, setRemoteCameraOn] = useState(false)
  const [remoteConnected, setRemoteConnected] = useState(false)

  const [msgInput, setMsgInput] = useState('')
  const [chatMessages, setChatMessages] = useState<any[]>([
    {
      id: 1,
      sender: 'them',
      text: 'Connection established. Say hi!',
      time: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    },
  ])

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  /* ---------------- PEER ---------------- */

  const createPeer = useCallback(() => {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    })

    peerRef.current = peer

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        peer.addTrack(track, localStreamRef.current!)
      })
    }

    peer.ontrack = (event) => {
      remoteStreamRef.current = event.streams[0]
      // FIX 4: Prevent double-assignment stutter (ontrack fires for both audio & video)
      if (
        remoteVideoRef.current &&
        remoteVideoRef.current.srcObject !== event.streams[0]
      ) {
        remoteVideoRef.current.srcObject = event.streams[0]
      }
      setRemoteConnected(true)
    }

    peer.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice_candidate', {
          roomID: ROOM_ID,
          candidate: event.candidate,
        })
      }
    }

    peer.onconnectionstatechange = () => {
      if (
        peer.connectionState === 'disconnected' ||
        peer.connectionState === 'failed'
      ) {
        cleanupPeer()
      }
    }

    return peer
  }, [])

  /* ---------------- CLEANUP ---------------- */

  const cleanupPeer = () => {
    if (peerRef.current) {
      peerRef.current.close()
      peerRef.current = null
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }

    remoteStreamRef.current = null
    setRemoteConnected(false)
    setRemoteCameraOn(false)
  }

  const fullCleanup = () => {
    cleanupPeer()

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop())
      localStreamRef.current = null
    }

    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }
  }

  /* ---------------- INIT ---------------- */

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })

        stream.getTracks().forEach((track) => (track.enabled = false))
        localStreamRef.current = stream

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }

        const socket = io(SOCKET_SERVER_URL, {
          transports: ['websocket'],
        })

        socketRef.current = socket

        socket.on('connect', () => {
          socket.emit('join_room', ROOM_ID)
        })

        socket.on('user_joined', async () => {
          // Sync camera state with new arrival
          socket.emit('camera_status', { roomID: ROOM_ID, isOn: cameraOnRef.current })

          const peer = createPeer()
          const offer = await peer.createOffer()
          await peer.setLocalDescription(offer)
          socket.emit('offer', { roomID: ROOM_ID, offer })
        })

        socket.on('receive_offer', async ({ offer }) => {
          // Sync camera state back to the caller
          socket.emit('camera_status', { roomID: ROOM_ID, isOn: cameraOnRef.current })

          const peer = createPeer()
          await peer.setRemoteDescription(offer)

          // FIX 2: Drain the ICE queue for the callee!
          iceQueueRef.current.forEach(async (candidate) => {
            try {
              await peer.addIceCandidate(candidate)
            } catch (e) { console.error(e) }
          })
          iceQueueRef.current = []

          const answer = await peer.createAnswer()
          await peer.setLocalDescription(answer)
          socket.emit('answer', { roomID: ROOM_ID, answer })
        })

        socket.on('receive_answer', async ({ answer }) => {
          if (!peerRef.current) return
          await peerRef.current.setRemoteDescription(answer)

          iceQueueRef.current.forEach(async (candidate) => {
            try {
              await peerRef.current?.addIceCandidate(candidate)
            } catch (e) { console.error(e) }
          })
          iceQueueRef.current = []
        })

        socket.on('receive_ice_candidate', async ({ candidate }) => {
          if (!peerRef.current) return

          if (peerRef.current.remoteDescription) {
            try {
              await peerRef.current.addIceCandidate(candidate)
            } catch (e) { console.error(e) }
          } else {
            iceQueueRef.current.push(candidate)
          }
        })

        socket.on('receive_camera_status', ({ isOn }) => {
          setRemoteCameraOn(isOn)
        })

        socket.on('receive_message', (msg) => {
          setChatMessages((prev) => [...prev, { ...msg, sender: 'them' }])
        })

        socket.on('peer_disconnected', () => {
          cleanupPeer()
        })
      } catch (err) {
        alert('Camera/Microphone permission required.')
      }
    }

    init()

    return () => {
      fullCleanup()
    }
  }, [createPeer])

  /* ---------------- CONTROLS ---------------- */

  const toggleMic = () => {
    if (!localStreamRef.current) return
    const track = localStreamRef.current.getAudioTracks()[0]
    if (!track) return
    const newState = !micOn
    track.enabled = newState
    setMicOn(newState)
  }

  const toggleCamera = () => {
    if (!localStreamRef.current || !socketRef.current) return
    const track = localStreamRef.current.getVideoTracks()[0]
    if (!track) return

    const newState = !cameraOn
    track.enabled = newState
    setCameraOn(newState)
    cameraOnRef.current = newState // Keep the ref synced

    socketRef.current.emit('camera_status', {
      roomID: ROOM_ID,
      isOn: newState,
    })
  }

  const sendMessage = () => {
    if (!msgInput.trim() || !socketRef.current) return

    const message = {
      id: Date.now(),
      text: msgInput,
      time: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      roomID: ROOM_ID,
    }

    setChatMessages((prev) => [...prev, { ...message, sender: 'me' }])
    socketRef.current.emit('send_message', message)
    setMsgInput('')
  }

  const endCall = () => {
    socketRef.current?.emit('leave_room', ROOM_ID)
    fullCleanup()
    alert('Session ended.')
  }

  /* ---------------- UI ---------------- */

  return (
    <div
      className={`w-full h-full flex flex-col transition-colors duration-500 ${
        isDark ? 'bg-slate-950' : 'bg-slate-50'
      }`}
    >
      {/* HEADER */}
      <div
        className={`h-16 flex items-center justify-between px-6 border-b ${
          isDark
            ? 'bg-slate-900/80 border-white/10'
            : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`p-2 rounded-lg ${
              isDark ? 'bg-white/5' : 'bg-slate-100'
            }`}
          >
            <Shield
              className={`w-5 h-5 ${
                isDark ? 'text-blue-400' : 'text-blue-600'
              }`}
            />
          </div>
          <h3
            className={`font-bold text-sm ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            Live Session : LunarGhost
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            className={`p-2 rounded-full ${
              isDark
                ? 'hover:bg-white/10 text-white'
                : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div className="flex-1 flex overflow-hidden">
        {/* VIDEO SIDE */}
        <div className="flex-[0.75] bg-black relative flex items-center justify-center p-6">
          <div className="relative w-full h-full bg-slate-900 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {!remoteConnected && (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                WAITING FOR PEER...
              </div>
            )}

            {/* FIX 3: Added background color (bg-slate-900) and z-10 so it actually covers the video block */}
            {remoteConnected && !remoteCameraOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-slate-400 z-10">
                PARTNER CAMERA OFF
              </div>
            )}
          </div>

          {/* SELF PIP */}
          <div className="absolute bottom-10 right-10 w-64 h-40 bg-slate-800 rounded-xl overflow-hidden border-2 z-20 border-white/10">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {!cameraOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-slate-400 text-xs">
                Camera Off
              </div>
            )}
          </div>
        </div>

        {/* CHAT SIDE */}
        <div
          className={`flex-[0.25] flex flex-col border-l ${
            isDark
              ? 'bg-slate-900 border-white/10'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.sender === 'me'
                    ? 'justify-end'
                    : 'justify-start'
                }`}
              >
                <div
                  className={`px-4 py-2 rounded-2xl text-sm ${
                    msg.sender === 'me'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-black'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t">
            <div className="flex items-center gap-2">
              <input
                value={msgInput}
                onChange={(e) => setMsgInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 border rounded-lg text-black"
              />
              <button onClick={sendMessage} className="text-blue-500">
                <Send />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="h-20 flex items-center justify-center gap-6 border-t">
        <button onClick={toggleMic} className="p-4 rounded-full bg-slate-200 dark:bg-slate-800">
          {micOn ? <Mic /> : <MicOff />}
        </button>

        <button onClick={toggleCamera} className="p-4 rounded-full bg-slate-200 dark:bg-slate-800">
          {cameraOn ? <Video /> : <VideoOff />}
        </button>

        <button onClick={endCall} className="p-4 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30">
          <PhoneOff />
        </button>
      </div>
    </div>
  )
}