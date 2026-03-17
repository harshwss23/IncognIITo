import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import io, { Socket } from 'socket.io-client'
import {
  Video, Mic, MicOff, VideoOff, Send, Settings, Shield, PhoneOff, AlertTriangle, Loader2
} from 'lucide-react'
import { useThemeColors } from '@/app/hooks/useThemeColors'
import { useTheme } from '@/app/contexts/ThemeContext'
import { getAccessToken } from '@/services/auth'

const SOCKET_SERVER_URL = 'http://localhost:5050'

export function LiveInteractionRoom() {
  const colors = useThemeColors()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // URL se Room ID nikalna aur Navigation setup
  const { roomId } = useParams<{ roomId: string }>()
  const ROOM_ID = roomId ?? ''
  const navigate = useNavigate()

  /* ---------------- REFS ---------------- */
  const socketRef = useRef<Socket | null>(null)
  const peerRef = useRef<RTCPeerConnection | null>(null)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)

  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)

  const iceQueueRef = useRef<RTCIceCandidateInit[]>([])
  const initializedRef = useRef(false)
  const cameraOnRef = useRef(false)

  /* ---------------- STATE ---------------- */
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null) 
  const [errorReason, setErrorReason] = useState<string>('') 
  
  // 🚨 NAYA REF: Tab close hone pe state track karne ke liye (taaki dusra tab API hit na kare)
  const isAuthorizedRef = useRef<boolean | null>(null)

  const [micOn, setMicOn] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)
  const [remoteCameraOn, setRemoteCameraOn] = useState(false)
  const [remoteConnected, setRemoteConnected] = useState(false)
  
  // Autoplay block handle karne ke liye
  const [autoplayError, setAutoplayError] = useState(false)

  const [msgInput, setMsgInput] = useState('')
  const [chatMessages, setChatMessages] = useState<any[]>([
    {
      id: 1,
      sender: 'them',
      text: 'Secure connection established. Say hi!',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 🚨 Jab bhi isAuthorized state change ho, usko ref mein sync karo
  useEffect(() => {
    isAuthorizedRef.current = isAuthorized
  }, [isAuthorized])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  /* ---------------- PEER CONNECTION ---------------- */
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
      if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0]
        
        // Autoplay Policy Fix
        setTimeout(() => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.play().catch((error) => {
              console.warn("Autoplay policy blocked audio/video playback:", error)
              setAutoplayError(true)
            })
          }
        }, 500)
      }
      setRemoteConnected(true)
    }

    peer.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice_candidate', { roomID: ROOM_ID, candidate: event.candidate })
      }
    }

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'disconnected' || peer.connectionState === 'failed') {
        cleanupPeer()
      }
    }
    return peer
  }, [ROOM_ID])

  /* ---------------- CLEANUP ---------------- */
  const cleanupPeer = () => {
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null }
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
    remoteStreamRef.current = null
    setRemoteConnected(false)
    setRemoteCameraOn(false)
    setAutoplayError(false)
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

  /* ---------------- INIT & SOCKET LISTENERS ---------------- */
  useEffect(() => {
    if (!ROOM_ID) {
      setIsAuthorized(false)
      setErrorReason('Missing room ID. Open this page using a valid match link.')
      return
    }

    if (initializedRef.current || !ROOM_ID) return
    initializedRef.current = true

    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        stream.getTracks().forEach((track) => (track.enabled = false))
        localStreamRef.current = stream

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }

        const token = getAccessToken()
        if (!token) {
          alert('Authentication error. Please log in again.')
          navigate('/landing')
          return
        }

        const socket = io(SOCKET_SERVER_URL, {
          transports: ['websocket'],
          auth: { token: token }
        })

        socketRef.current = socket

        socket.on("connect_error", (err) => {
          console.error("Socket Connection Error:", err.message);
          setIsAuthorized(false);
          setErrorReason(err.message);
          fullCleanup();
        });

        socket.on('connect', () => {
          socket.emit('join_room', ROOM_ID)
        })

        socket.on('room_error', (errorMsg) => {
          setIsAuthorized(false)
          setErrorReason(errorMsg)
          fullCleanup()
        })

        socket.on('room_joined_success', () => {
          setIsAuthorized(true)
        })

        // 🚨 EK HI SESSION ENDED LISTENER HAI AB
        socket.on('session_ended', (message) => {
          console.log(message);
          fullCleanup();
          navigate(`/session/${ROOM_ID}`); 
        });

        // WEBRTC SIGNALING
        socket.on('user_joined', async () => {
          socket.emit('camera_status', { roomID: ROOM_ID, isOn: cameraOnRef.current })
          const peer = createPeer()
          const offer = await peer.createOffer()
          await peer.setLocalDescription(offer)
          socket.emit('offer', { roomID: ROOM_ID, offer })
        })

        socket.on('receive_offer', async ({ offer }) => {
          socket.emit('camera_status', { roomID: ROOM_ID, isOn: cameraOnRef.current })
          const peer = createPeer()
          await peer.setRemoteDescription(offer)

          iceQueueRef.current.forEach(async (candidate) => {
            try { await peer.addIceCandidate(candidate) } catch (e) { console.error(e) }
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
            try { await peerRef.current?.addIceCandidate(candidate) } catch (e) { console.error(e) }
          })
          iceQueueRef.current = []
        })

        socket.on('receive_ice_candidate', async ({ candidate }) => {
          if (!peerRef.current) return
          if (peerRef.current.remoteDescription) {
            try { await peerRef.current.addIceCandidate(candidate) } catch (e) { console.error(e) }
          } else {
            iceQueueRef.current.push(candidate)
          }
        })

        socket.on('receive_camera_status', ({ isOn }) => setRemoteCameraOn(isOn))
        socket.on('receive_message', (msg) => setChatMessages((prev) => [...prev, { ...msg, sender: 'them' }]))

      } catch (err) {
        alert('Camera/Microphone permission required.')
      }
    }

    init()

    return () => {
      fullCleanup()
      initializedRef.current = false
    }
  }, [createPeer, ROOM_ID, navigate])

  /* ---------------- FIX: Re-attach Local Video on Authorization ---------------- */
  useEffect(() => {
    if (isAuthorized && localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current
    }
  }, [isAuthorized])

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
    cameraOnRef.current = newState

    socketRef.current.emit('camera_status', { roomID: ROOM_ID, isOn: newState })
  }

  const sendMessage = () => {
    if (!msgInput.trim() || !socketRef.current) return
    const message = {
      id: Date.now(),
      text: msgInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      roomID: ROOM_ID,
    }
    setChatMessages((prev) => [...prev, { ...message, sender: 'me' }])
    socketRef.current.emit('send_message', message)
    setMsgInput('')
  }

  // 1. Intentional End Call (Button Click)
  const endCall = async () => {
    try {
      await fetch('http://localhost:5050/api/match/end', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error("Failed to hit end API", error);
    }

    if (socketRef.current) {
      socketRef.current.emit('leave_room', ROOM_ID);
    }

    fullCleanup();
    navigate(`/session/${ROOM_ID}`);
  }

  // 2. Tab Close / Browser Exit Handle Karna
  useEffect(() => {
    const handleTabClose = () => {
      // 🚨 FIX: Sirf authorized tab hi ye API hit karega (Dusra tab close hone pe ignore hoga)
      if (isAuthorizedRef.current === true) {
        const token = getAccessToken();
        if (token) {
          fetch('http://localhost:5050/api/match/end', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            keepalive: true 
          });
        }
      }
    };

    window.addEventListener('beforeunload', handleTabClose);

    return () => {
      window.removeEventListener('beforeunload', handleTabClose);
    };
  }, []);

  const handlePlayRemote = () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = false; 
      remoteVideoRef.current.play().then(() => {
        setAutoplayError(false)
      }).catch(err => console.error("Playback failed even after user interaction:", err))
    }
  }

  /* ---------------- UNAUTHORIZED / LOADING UI ---------------- */
  if (isAuthorized === false) {
    return (
      <div className={`w-full h-screen flex flex-col items-center justify-center ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-slate-500 mb-6 text-center max-w-md">
          {errorReason || "You are not authorized to join this room."}
        </p>
        <button onClick={() => navigate('/matchmaking')} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Return to Matchmaking
        </button>
      </div>
    )
  }

  if (isAuthorized === null) {
    return (
      <div className={`w-full h-screen flex flex-col items-center justify-center ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Verifying Secure Connection...</p>
      </div>
    )
  }

  /* ---------------- MAIN UI ---------------- */
  return (
    <div className={`w-full h-screen flex flex-col transition-colors duration-500 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
      {/* HEADER */}
      <div className={`h-16 flex items-center justify-between px-6 border-b ${isDark ? 'bg-slate-900/80 border-white/10' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-lg ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
            <Shield className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          </div>
          <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>IncognIITo Live Session</h3>
        </div>
        <div className="flex items-center gap-2">
          <button className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-slate-100 text-slate-600'}`}>
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div className="flex-1 flex overflow-hidden">
        {/* VIDEO SIDE */}
        <div className="flex-[0.75] bg-black relative flex items-center justify-center p-6">
          <div className="relative w-full h-full bg-slate-900 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />

            {!remoteConnected && (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-medium">
                WAITING FOR PEER TO JOIN...
              </div>
            )}

            {remoteConnected && !remoteCameraOn && !autoplayError && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-slate-400 z-10 font-medium">
                PARTNER CAMERA OFF
              </div>
            )}

            {/* 🚨 TAP TO UNMUTE OVERLAY */}
            {autoplayError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 text-white z-20 backdrop-blur-sm">
                <p className="mb-4 text-lg font-medium">Browser blocked audio</p>
                <button 
                  onClick={handlePlayRemote} 
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 transition-colors text-white rounded-lg shadow-lg"
                >
                  Tap to Play & Unmute
                </button>
              </div>
            )}
          </div>

          {/* SELF PIP */}
          <div className="absolute bottom-10 right-10 w-64 h-40 bg-slate-800 rounded-xl overflow-hidden border-2 z-20 border-white/10 shadow-lg">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {!cameraOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 text-slate-300 text-sm font-medium backdrop-blur-sm">
                Your Camera is Off
              </div>
            )}
          </div>
        </div>

        {/* CHAT SIDE */}
        <div className={`flex-[0.25] flex flex-col border-l ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                <div className={`px-4 py-2 rounded-2xl text-sm max-w-[85%] break-words ${msg.sender === 'me' ? 'bg-blue-600 text-white rounded-br-sm' : isDark ? 'bg-slate-800 text-slate-200 rounded-bl-sm' : 'bg-slate-200 text-slate-900 rounded-bl-sm'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className={`p-4 border-t ${isDark ? 'border-white/10 bg-slate-900' : 'border-slate-200 bg-white'}`}>
            <div className="flex items-center gap-2">
              <input
                value={msgInput}
                onChange={(e) => setMsgInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
                className={`flex-1 px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-500'}`}
              />
              <button onClick={sendMessage} disabled={!msgInput.trim()} className={`p-2.5 rounded-xl transition-colors ${msgInput.trim() ? 'bg-blue-600 text-white hover:bg-blue-700' : isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CONTROLS */}
      <div className={`h-20 flex items-center justify-center gap-6 border-t ${isDark ? 'bg-slate-900/80 border-white/10' : 'bg-white border-slate-200'}`}>
        <button onClick={toggleMic} className={`p-4 rounded-full transition-all ${micOn ? isDark ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-900 hover:bg-slate-200' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}>
          {micOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
        </button>

        <button onClick={toggleCamera} className={`p-4 rounded-full transition-all ${cameraOn ? isDark ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-900 hover:bg-slate-200' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}>
          {cameraOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
        </button>

        <button onClick={endCall} className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 hover:scale-105 transition-all shadow-lg shadow-red-500/20">
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  )
}