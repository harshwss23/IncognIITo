import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
// 🚨 'io' hata kar sirf apna global socket import kiya hai
import { socket } from '@/services/socket' 
import {
  Video, Mic, MicOff, VideoOff, Send, Settings, Shield, PhoneOff, AlertTriangle, Loader2, MessageSquare, X
} from 'lucide-react'
import { useThemeColors } from '@/app/hooks/useThemeColors'
import { useTheme } from '@/app/contexts/ThemeContext'
import { getAccessToken } from '@/services/auth'

const SOCKET_SERVER_URL = 'http://localhost:5050'

interface Participant {
  username: string;
  interests: string[];
}

export function LiveInteractionRoom() {
  const colors = useThemeColors()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const { roomId } = useParams<{ roomId: string }>()
  const ROOM_ID = roomId ?? ''
  const navigate = useNavigate()

  /* ---------------- REFS ---------------- */
  const peerRef = useRef<RTCPeerConnection | null>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const iceQueueRef = useRef<RTCIceCandidateInit[]>([])
  const initializedRef = useRef(false)
  const cameraOnRef = useRef(false)
  const isAuthorizedRef = useRef<boolean | null>(null)

  /* ---------------- STATE ---------------- */
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null) 
  const [errorReason, setErrorReason] = useState<string>('') 
  const [micOn, setMicOn] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)
  const [remoteCameraOn, setRemoteCameraOn] = useState(false)
  const [remoteConnected, setRemoteConnected] = useState(false)
  const [autoplayError, setAutoplayError] = useState(false)

  // CHAT STATE
  const [showChat, setShowChat] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
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

  // USER & SETTINGS STATE
  const [me, setMe] = useState<Participant | null>(null)
  const [them, setThem] = useState<Participant | null>(null)
  
  const [showSettings, setShowSettings] = useState(false)
  const [devices, setDevices] = useState<{ audio: MediaDeviceInfo[], video: MediaDeviceInfo[] }>({ audio: [], video: [] })
  const [selectedAudioId, setSelectedAudioId] = useState<string>('')
  const [selectedVideoId, setSelectedVideoId] = useState<string>('')

  useEffect(() => {
    isAuthorizedRef.current = isAuthorized
  }, [isAuthorized])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Clear unread dot when chat is opened
  useEffect(() => {
    if (showChat) setHasUnread(false)
  }, [showChat])

  /* ---------------- FETCH MATCH INFO ---------------- */
  useEffect(() => {
    if (ROOM_ID) {
      fetch(`${SOCKET_SERVER_URL}/api/match/${ROOM_ID}`, {
        headers: { 'Authorization': `Bearer ${getAccessToken()}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setMe(data.me);
          setThem(data.them);
        }
      })
      .catch(err => console.error("Failed to fetch match info overlays:", err));
    }
  }, [ROOM_ID]);

  /* ---------------- DEVICE FETCHING & SWITCHING ---------------- */
  const fetchDevices = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices()
      const audioDevices = allDevices.filter(device => device.kind === 'audioinput')
      const videoDevices = allDevices.filter(device => device.kind === 'videoinput')
      setDevices({ audio: audioDevices, video: videoDevices })
      setSelectedAudioId(prev => prev || (audioDevices.length > 0 ? audioDevices[0].deviceId : ''))
      setSelectedVideoId(prev => prev || (videoDevices.length > 0 ? videoDevices[0].deviceId : ''))
    } catch (err) { console.error("Error fetching devices:", err) }
  }, [])

  useEffect(() => {
    navigator.mediaDevices.addEventListener('devicechange', fetchDevices)
    return () => navigator.mediaDevices.removeEventListener('devicechange', fetchDevices)
  }, [fetchDevices])

  const switchDevice = async (kind: 'audio' | 'video', deviceId: string) => {
    if (!localStreamRef.current) return
    if (kind === 'audio') setSelectedAudioId(deviceId)
    if (kind === 'video') setSelectedVideoId(deviceId)

    try {
      const constraints = { [kind]: { deviceId: { exact: deviceId } } }
      const newStream = await navigator.mediaDevices.getUserMedia(constraints)
      const newTrack = kind === 'audio' ? newStream.getAudioTracks()[0] : newStream.getVideoTracks()[0]
      const oldTrack = kind === 'audio' ? localStreamRef.current.getAudioTracks()[0] : localStreamRef.current.getVideoTracks()[0]
      
      if (oldTrack) {
        oldTrack.stop()
        localStreamRef.current.removeTrack(oldTrack)
      }

      newTrack.enabled = kind === 'audio' ? micOn : cameraOnRef.current
      localStreamRef.current.addTrack(newTrack)

      if (peerRef.current) {
        const sender = peerRef.current.getSenders().find(s => s.track?.kind === kind)
        if (sender) sender.replaceTrack(newTrack)
      }
    } catch (error) {
      console.error(`Failed to switch ${kind} device:`, error)
      alert("Could not access the selected device.")
    }
  }

  /* ---------------- PEER CONNECTION & SOCKETS ---------------- */
  const createPeer = useCallback(() => {
    const peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
    peerRef.current = peer

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => peer.addTrack(track, localStreamRef.current!))
    }

    peer.ontrack = (event) => {
      remoteStreamRef.current = event.streams[0]
      if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0]
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
      if (event.candidate) {
        socket.emit('ice_candidate', { roomID: ROOM_ID, candidate: event.candidate })
      }
    }

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'disconnected' || peer.connectionState === 'failed') cleanupPeer()
    }
    return peer
  }, [ROOM_ID])

  const cleanupPeer = () => {
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null }
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
    remoteStreamRef.current = null
    setRemoteConnected(false)
    setRemoteCameraOn(false)
    setAutoplayError(false)
  }

  // 🚨 DO NOT disconnect socket here, just clear WebRTC and local tracks
  const fullCleanup = () => {
    cleanupPeer()
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop())
      localStreamRef.current = null
    }
    socket.emit('leave_room', ROOM_ID);
  }

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
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
        });
        stream.getTracks().forEach((track) => (track.enabled = false))
        localStreamRef.current = stream

        if (localVideoRef.current) localVideoRef.current.srcObject = stream
        
        await fetchDevices()

        // 🚨 GLOBAL SOCKET CONNECTION LOGIC 🚨
        const token = getAccessToken()
        if (!token) {
          alert('Authentication error. Please log in again.')
          navigate('/')
          return
        }

        if (!socket.connected) {
          socket.auth = { token };
          socket.connect();
        }

        // Join the specific video room
        socket.emit('join_room', ROOM_ID)

        // Attach all room listeners
        socket.on('room_error', (errorMsg) => { setIsAuthorized(false); setErrorReason(errorMsg); fullCleanup() })
        socket.on('room_joined_success', () => setIsAuthorized(true))
        socket.on('session_ended', () => { fullCleanup(); navigate(`/session/${ROOM_ID}`); });

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
          iceQueueRef.current.forEach(async (c) => { try { await peer.addIceCandidate(c) } catch (e) {} })
          iceQueueRef.current = []
          const answer = await peer.createAnswer()
          await peer.setLocalDescription(answer)
          socket.emit('answer', { roomID: ROOM_ID, answer })
        })

        socket.on('receive_answer', async ({ answer }) => {
          if (!peerRef.current) return
          await peerRef.current.setRemoteDescription(answer)
          iceQueueRef.current.forEach(async (c) => { try { await peerRef.current?.addIceCandidate(c) } catch (e) {} })
          iceQueueRef.current = []
        })

        socket.on('receive_ice_candidate', async ({ candidate }) => {
          if (!peerRef.current) return
          if (peerRef.current.remoteDescription) {
            try { await peerRef.current.addIceCandidate(candidate) } catch (e) {}
          } else {
            iceQueueRef.current.push(candidate)
          }
        })

        socket.on('receive_camera_status', ({ isOn }) => setRemoteCameraOn(isOn))
        
        socket.on('receive_message', (msg) => {
          setChatMessages((prev) => [...prev, { ...msg, sender: 'them' }])
          setShowChat((prevShow) => {
            if (!prevShow) setHasUnread(true)
            return prevShow
          })
        })

      } catch (err) {
        setIsAuthorized(false);
        setErrorReason("Camera/Microphone permission was denied. Please allow access in your browser settings.");
      }
    }

    init()
    
    // 🚨 CLEANUP: Remove listeners but KEEP socket connected for the rest of the app
    return () => { 
      fullCleanup(); 
      socket.off('room_error');
      socket.off('room_joined_success');
      socket.off('session_ended');
      socket.off('user_joined');
      socket.off('receive_offer');
      socket.off('receive_answer');
      socket.off('receive_ice_candidate');
      socket.off('receive_camera_status');
      socket.off('receive_message');
      initializedRef.current = false;
    }
  }, [createPeer, ROOM_ID, navigate, fetchDevices])

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
    if (!localStreamRef.current) return
    const track = localStreamRef.current.getVideoTracks()[0]
    if (!track) return
    const newState = !cameraOn
    track.enabled = newState
    setCameraOn(newState)
    cameraOnRef.current = newState
    socket.emit('camera_status', { roomID: ROOM_ID, isOn: newState })
  }

  const sendMessage = () => {
    if (!msgInput.trim()) return
    const message = {
      id: Date.now(),
      text: msgInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      roomID: ROOM_ID,
    }
    setChatMessages((prev) => [...prev, { ...message, sender: 'me' }])
    socket.emit('send_message', message)
    setMsgInput('')
  }

  const endCall = async () => {
    try {
      await fetch('http://localhost:5050/api/match/end', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getAccessToken()}`, 'Content-Type': 'application/json' }
      });
    } catch (error) { console.error("Failed to hit end API", error); }

    socket.emit('leave_room', ROOM_ID);
    fullCleanup();
    navigate(`/session/${ROOM_ID}`);
  }

  useEffect(() => {
    const handleTabClose = () => {
      if (isAuthorizedRef.current === true) {
        const token = getAccessToken();
        if (token) {
          fetch('http://localhost:5050/api/match/end', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            keepalive: true 
          });
        }
      }
    };
    window.addEventListener('beforeunload', handleTabClose);
    return () => window.removeEventListener('beforeunload', handleTabClose);
  }, []);

  const handlePlayRemote = () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = false; 
      remoteVideoRef.current.play().then(() => setAutoplayError(false)).catch(err => console.error(err))
    }
  }

  /* ---------------- COMMON INTERESTS LOGIC ---------------- */
  // 🚨 Filter the interests to find common ones between 'me' and 'them'
  const commonInterests = (me?.interests || []).filter(interest => (them?.interests || []).includes(interest));
  const displayInterests = commonInterests.slice(0, 5);
  const remainingInterestsCount = commonInterests.length - 5;


  /* ---------------- LOADING & ERROR UI ---------------- */
  if (isAuthorized === false) {
    return (
      <div className={`w-full h-screen flex flex-col items-center justify-center p-4 ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
        <div className="bg-red-500/10 p-6 rounded-full animate-pulse mb-6">
          <AlertTriangle className="w-16 h-16 text-red-500" />
        </div>
        <h2 className="text-3xl font-extrabold mb-3 tracking-tight">Access Denied</h2>
        <p className="text-slate-500 mb-8 text-center max-w-md text-lg">{errorReason}</p>
        <button onClick={() => navigate('/homepage')} className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5">
          Return to Homepage
        </button>
      </div>
    )
  }

  if (isAuthorized === null) {
    return (
      <div className={`w-full h-screen flex flex-col items-center justify-center ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-6" />
        <p className="text-slate-400 font-medium text-lg animate-pulse">Establishing Secure Connection...</p>
      </div>
    )
  }

  /* ---------------- MAIN UI ---------------- */
  return (
    <div className={`w-full h-screen flex flex-col overflow-hidden transition-colors duration-500 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
      
      {/* HEADER */}
      <div className={`h-16 shrink-0 flex items-center justify-between px-4 lg:px-8 border-b z-20 ${isDark ? 'bg-slate-900/90 border-white/10 backdrop-blur-md' : 'bg-white/90 border-slate-200 backdrop-blur-md'}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20`}>
            <Shield className="w-5 h-5 text-white" />
          </div>
          <h3 className={`font-bold text-base tracking-wide ${isDark ? 'text-white' : 'text-slate-900'}`}>
            IncognIITo <span className="text-blue-500 font-normal hidden sm:inline">Live</span>
          </h3>
        </div>
        
        <button 
          onClick={() => setShowSettings(true)}
          className={`p-2.5 rounded-full transition-all duration-300 ${isDark ? 'hover:bg-white/10 text-slate-300 hover:text-white' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'}`}
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* BODY */}
      <div className="flex-1 flex flex-row overflow-hidden relative">
        
        {/* ================= VIDEO SECTION ================= */}
        <div className="flex-1 relative bg-black/95 flex items-center justify-center p-2 lg:p-6 overflow-hidden">
          <div className="relative w-full h-full bg-slate-900 rounded-2xl lg:rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.3)] ring-1 ring-white/10">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />

            {/* 🚨 COMMON INTERESTS OVERLAY 🚨 */}
            {them && remoteConnected && (
              <div className="absolute top-4 left-4 lg:top-6 lg:left-6 z-20 bg-black/40 backdrop-blur-xl p-3 lg:p-4 rounded-2xl border border-white/10 shadow-2xl max-w-[70%] sm:max-w-xs animate-in fade-in slide-in-from-top-4 duration-500">
                <h3 className="text-white font-bold text-base lg:text-lg leading-tight truncate tracking-wide drop-shadow-md">{them.username}</h3>
                
                {commonInterests.length > 0 ? (
                  <>
                    <p className="text-[10px] lg:text-xs text-blue-300/80 mt-1.5 font-medium uppercase tracking-wider">Common Interests</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {displayInterests.map((interest, idx) => (
                        <span key={idx} className="px-2.5 py-1 bg-white/10 text-blue-200 text-[10px] lg:text-xs font-medium rounded-lg border border-white/5 backdrop-blur-sm">
                          {interest}
                        </span>
                      ))}
                      {remainingInterestsCount > 0 && (
                        <span className="px-2.5 py-1 bg-blue-600/20 text-blue-300 text-[10px] lg:text-xs font-medium rounded-lg border border-blue-500/30 backdrop-blur-sm">
                          +{remainingInterestsCount}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-[10px] lg:text-xs text-slate-400 mt-1.5 font-medium italic">No common interests</p>
                )}
              </div>
            )}

            {!remoteConnected && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
                <div className="flex flex-col items-center animate-pulse">
                  <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
                  <p className="text-slate-300 font-semibold tracking-widest text-sm lg:text-base">WAITING FOR PEER...</p>
                </div>
              </div>
            )}

            {remoteConnected && !remoteCameraOn && !autoplayError && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950 text-slate-400 z-10">
                <div className="flex flex-col items-center opacity-70">
                  <VideoOff className="w-12 h-12 mb-3" />
                  <p className="font-medium tracking-widest text-sm">CAMERA OFF</p>
                </div>
              </div>
            )}

            {autoplayError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md text-white z-30">
                <p className="mb-5 text-lg font-medium drop-shadow-lg">Browser blocked audio</p>
                <button 
                  onClick={handlePlayRemote} 
                  className="px-8 py-3 bg-blue-500 hover:bg-blue-600 font-semibold transition-all text-white rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:scale-105"
                >
                  Tap to Unmute
                </button>
              </div>
            )}

            {/* FLOATING CONTROLS */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 lg:gap-5 px-6 py-3 rounded-full bg-slate-950/60 backdrop-blur-xl border border-white/10 shadow-2xl z-40 transition-all duration-300 hover:bg-slate-900/80">
              
              <button 
                onClick={toggleMic} 
                className={`p-3.5 lg:p-4 rounded-full transition-all duration-300 shadow-lg outline-none ${micOn ? 'bg-slate-700/50 text-white hover:bg-slate-600/80 hover:scale-105' : 'bg-red-500 text-white hover:bg-red-600 hover:scale-105 ring-4 ring-red-500/20'}`}
              >
                {micOn ? <Mic className="w-5 h-5 lg:w-6 lg:h-6" /> : <MicOff className="w-5 h-5 lg:w-6 lg:h-6" />}
              </button>

              <button 
                onClick={toggleCamera} 
                className={`p-3.5 lg:p-4 rounded-full transition-all duration-300 shadow-lg outline-none ${cameraOn ? 'bg-slate-700/50 text-white hover:bg-slate-600/80 hover:scale-105' : 'bg-red-500 text-white hover:bg-red-600 hover:scale-105 ring-4 ring-red-500/20'}`}
              >
                {cameraOn ? <Video className="w-5 h-5 lg:w-6 lg:h-6" /> : <VideoOff className="w-5 h-5 lg:w-6 lg:h-6" />}
              </button>

              <div className="relative">
                <button 
                  onClick={() => setShowChat(!showChat)} 
                  className={`p-3.5 lg:p-4 rounded-full transition-all duration-300 shadow-lg outline-none ${showChat ? 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'bg-slate-700/50 text-white hover:bg-slate-600/80 hover:scale-105'}`}
                >
                  <MessageSquare className="w-5 h-5 lg:w-6 lg:h-6" />
                </button>
                {hasUnread && !showChat && (
                  <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 border-2 border-slate-900 rounded-full animate-bounce"></span>
                )}
              </div>

              <div className="w-px h-8 bg-white/20 mx-1 lg:mx-2" />

              <button 
                onClick={endCall} 
                className="p-3.5 lg:p-4 rounded-full bg-red-600 text-white hover:bg-red-700 hover:scale-110 transition-all shadow-[0_0_15px_rgba(220,38,38,0.5)] outline-none"
              >
                <PhoneOff className="w-5 h-5 lg:w-6 lg:h-6" />
              </button>
            </div>

            {/* SELF PIP */}
            <div className="absolute top-4 right-4 lg:top-auto lg:bottom-6 lg:right-6 w-28 h-40 sm:w-32 sm:h-48 lg:w-64 lg:h-40 bg-slate-800 rounded-xl lg:rounded-2xl overflow-hidden border border-white/20 shadow-2xl z-30 group transition-transform duration-300 hover:scale-105 hover:border-white/40">
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              {me && (
                <div className="absolute bottom-2 left-2 z-30 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-white text-[10px] lg:text-xs font-medium truncate max-w-[85%] border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {me.username} (You)
                </div>
              )}
              {!cameraOn && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/95 text-slate-400 text-xs lg:text-sm font-medium backdrop-blur-md z-10">
                  <VideoOff className="w-5 h-5 lg:w-6 lg:h-6" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================= CHAT SECTION ================= */}
        {showChat && (
          <div className={`absolute right-0 top-0 h-full w-full sm:w-[400px] lg:relative lg:w-[350px] xl:w-[400px] z-50 flex flex-col shadow-2xl transition-all duration-300 animate-in slide-in-from-right-10 ${isDark ? 'bg-slate-900/95 border-l border-white/10 backdrop-blur-xl' : 'bg-white/95 border-l border-slate-200 backdrop-blur-xl'}`}>
            
            <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <h3 className={`font-bold tracking-wide ${isDark ? 'text-white' : 'text-slate-900'}`}>Room Chat</h3>
              <button onClick={() => setShowChat(false)} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                  <div className={`px-4 py-2.5 rounded-2xl text-sm max-w-[85%] break-words shadow-sm leading-relaxed
                    ${msg.sender === 'me' 
                      ? 'bg-blue-600 text-white rounded-br-sm' 
                      : isDark 
                        ? 'bg-slate-800 text-slate-200 rounded-bl-sm border border-white/5' 
                        : 'bg-slate-100 text-slate-900 rounded-bl-sm border border-slate-200'}`}>
                    {msg.text}
                    <div className={`text-[10px] mt-1 text-right opacity-60 ${msg.sender === 'me' ? 'text-blue-100' : 'text-slate-400'}`}>
                      {msg.time}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className={`p-4 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
              <div className="flex items-center gap-2">
                <input
                  value={msgInput}
                  onChange={(e) => setMsgInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className={`flex-1 px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-inner
                    ${isDark ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'}`}
                />
                <button 
                  onClick={sendMessage} 
                  disabled={!msgInput.trim()} 
                  className={`p-3 rounded-xl transition-all duration-300 ${msgInput.trim() ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5' : isDark ? 'bg-slate-800 text-slate-600' : 'bg-slate-100 text-slate-400'}`}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className={`p-6 rounded-2xl w-full max-w-md shadow-2xl border ${isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold tracking-tight">Device Settings</h2>
              <button onClick={() => setShowSettings(false)} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-2 opacity-80">Camera</label>
                <select 
                  value={selectedVideoId} 
                  onChange={(e) => switchDevice('video', e.target.value)}
                  className={`w-full p-3 rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                >
                  {devices.video.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${device.deviceId.substring(0, 5)}...`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 opacity-80">Microphone</label>
                <select 
                  value={selectedAudioId} 
                  onChange={(e) => switchDevice('audio', e.target.value)}
                  className={`w-full p-3 rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                >
                  {devices.audio.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Microphone ${device.deviceId.substring(0, 5)}...`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button 
              onClick={() => setShowSettings(false)}
              className="mt-8 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-blue-500/30 transition-all hover:-translate-y-0.5"
            >
              Done
            </button>
          </div>
        </div>
      )}

    </div>
  )
}