import React, { useState } from 'react';
import { Video, Mic, MicOff, VideoOff, Eye, EyeOff, Send, MoreVertical, Settings, Shield, PhoneOff, Smile } from 'lucide-react';
import { useThemeColors } from '@/app/hooks/useThemeColors';
import { useTheme } from '@/app/contexts/ThemeContext';

export function LiveInteractionRoom() {
  const colors = useThemeColors();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [videoRevealed, setVideoRevealed] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [blurred, setBlurred] = useState(false);
  const [msgInput, setMsgInput] = useState('');

  const messages = [
    { id: 1, sender: 'them', text: 'Hey! Nice to meet you', time: '10:23' },
    { id: 2, sender: 'me', text: 'Hi there! How are you?', time: '10:24' },
    { id: 3, sender: 'them', text: 'Good! What are you studying?', time: '10:24' },
    { id: 4, sender: 'me', text: 'Computer Science, you?', time: '10:25' },
  ];

  return (
    // MAIN CONTAINER: w-full h-full
    <div className={`w-full h-full flex flex-col overflow-hidden transition-colors duration-500 
      ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
      
      {/* --- HEADER --- */}
      <div className={`h-16 flex items-center justify-between px-6 border-b z-20
        ${isDark ? 'bg-slate-900/80 border-white/10' : 'bg-white border-slate-200'}`}>
        
        <div className="flex items-center gap-4">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                <Shield className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div>
                <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Live Session : LunarGhost</h3>
                
            </div>
        </div>

        <div className="flex items-center gap-2">
           <button className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-slate-100 text-slate-600'}`}>
                <Settings className="w-5 h-5" />
           </button>
           <div className={`px-3 py-1 rounded-full text-xs font-bold border
               ${isDark ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
               00:14:23
           </div>
        </div>
      </div>

      {/* --- MAIN CONTENT (Split View) --- */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT: Video Stage (Always Dark for Focus) */}
        <div className="flex-[0.75] bg-black relative flex items-center justify-center p-6">
            
            {/* Main Partner Video */}
            <div className="relative w-full h-full max-h-[700px] bg-slate-900 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                
                {/* Placeholder / Blurred State */}
                <div className={`absolute inset-0 flex items-center justify-center transition-all duration-700
                    ${videoRevealed ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-800 to-slate-950'}`}>
                    
                    {!videoRevealed ? (
                        <div className="text-center z-10">
                            <div className="mb-8 relative group cursor-pointer" onClick={() => setVideoRevealed(true)}>
                                <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity rounded-full"></div>
                                <div className="relative w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md group-hover:scale-110 transition-transform duration-300">
                                    <Eye className="w-10 h-10 text-white opacity-70 group-hover:opacity-100" />
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Partner Video Hidden</h2>
                            <p className="text-slate-400 max-w-md mx-auto">
                                Click the icon above to reveal the video feed. Your identity remains anonymous until you choose to share details.
                            </p>
                        </div>
                    ) : (
                         <div className="flex flex-col items-center justify-center h-full text-slate-600">
                            <Video className="w-20 h-20 mb-4 opacity-20 animate-pulse" />
                            <p className="text-sm font-mono">RECEIVING VIDEO STREAM...</p>
                         </div>
                    )}
                </div>

                {/* Tags on Video */}
                <div className="absolute top-4 left-4 flex gap-2">
                    <span className="px-2 py-1 bg-black/50 backdrop-blur-md rounded-md text-[10px] text-white font-bold tracking-wider">
                        LunarGhost
                    </span>
                    <span className="px-2 py-1 bg-red-500/80 backdrop-blur-md rounded-md text-[10px] text-white font-bold tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span> LIVE
                    </span>
                </div>

            </div>

            {/* PIP (Self View) */}
            <div className="absolute bottom-10 right-10 w-64 h-40 bg-slate-800 rounded-xl overflow-hidden border-2 border-white/10 shadow-2xl group cursor-move">
                <div className={`w-full h-full flex items-center justify-center bg-slate-900 relative
                    ${blurred ? 'backdrop-blur-xl' : ''}`}>
                    
                    {!cameraOn ? (
                        <div className="flex flex-col items-center gap-2 text-slate-500">
                            <VideoOff className="w-8 h-8" />
                            <span className="text-xs font-bold uppercase">Camera Off</span>
                        </div>
                    ) : (
                        <div className="w-full h-full relative">
                             {/* Mock Camera Feed Gradient */}
                             <div className={`absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-800 ${blurred && 'blur-xl'}`}></div>
                             <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 rounded text-[10px] text-white font-bold">YOU</div>
                        </div>
                    )}

                    {/* Hover Controls for PIP */}
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setBlurred(!blurred)} className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors">
                            {blurred ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>

        </div>

        {/* RIGHT: Chat & Controls (Adaptive Theme) */}
        <div className={`flex-[0.25] flex flex-col border-l z-10
            ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
            
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-inherit">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.sender === 'me' ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[90%] px-4 py-3 rounded-2xl text-sm
                            ${msg.sender === 'me' 
                                ? 'bg-blue-600 text-white rounded-tr-none' 
                                : isDark 
                                    ? 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700' 
                                    : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200'
                            }`}>
                            {msg.text}
                        </div>
                        <span className={`text-[10px] mt-1 px-1 opacity-50 ${isDark ? 'text-white' : 'text-slate-500'}`}>
                            {msg.time}
                        </span>
                    </div>
                ))}
            </div>

            {/* Input Area */}
            <div className={`p-4 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all
                    ${isDark ? 'bg-slate-950 border-slate-800 focus-within:border-blue-500' : 'bg-slate-50 border-slate-200 focus-within:border-blue-400'}`}>
                    <input 
                        type="text" 
                        value={msgInput}
                        onChange={(e) => setMsgInput(e.target.value)}
                        placeholder="Type a message..." 
                        className={`bg-transparent flex-1 outline-none text-sm font-medium
                            ${isDark ? 'text-white placeholder-slate-500' : 'text-slate-800 placeholder-slate-400'}`}
                    />
                    <button className={`${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-blue-600'}`}>
                        <Smile className="w-5 h-5" />
                    </button>
                    <button className={`${isDark ? 'text-blue-500 hover:text-blue-400' : 'text-blue-600 hover:text-blue-500'}`}>
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>

        </div>

      </div>

      {/* --- BOTTOM CONTROLS BAR --- */}
      <div className={`h-24 flex items-center justify-center gap-6 border-t z-20
        ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
        
        {/* Mic */}
        <button onClick={() => setMicOn(!micOn)} className={`p-4 rounded-full border-2 transition-all duration-300
            ${micOn 
                ? (isDark ? 'bg-white/10 border-white/5 text-white hover:bg-white/20' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200') 
                : 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/30'}`}>
            {micOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
        </button>

        {/* Camera */}
        <button onClick={() => setCameraOn(!cameraOn)} className={`p-4 rounded-full border-2 transition-all duration-300
            ${cameraOn 
                ? (isDark ? 'bg-white/10 border-white/5 text-white hover:bg-white/20' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200') 
                : 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/30'}`}>
            {cameraOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
        </button>

        {/* End Call */}
        <button className="px-8 py-4 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold tracking-wide shadow-xl shadow-red-600/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3">
            <PhoneOff className="w-5 h-5" />
            <span>End Session</span>
        </button>

        {/* Blur Toggle */}
        <button onClick={() => setBlurred(!blurred)} className={`p-4 rounded-full border-2 transition-all duration-300
            ${blurred 
                ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/30' 
                : (isDark ? 'bg-white/10 border-white/5 text-white hover:bg-white/20' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200')}`}>
            {blurred ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
        </button>
        
      </div>

    </div>
  );
}