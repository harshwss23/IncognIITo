import React, { useState } from 'react';
import { Send, Video, MoreVertical, Paperclip, Smile, ArrowLeft, CheckCheck } from 'lucide-react';
import { useThemeColors } from '@/app/hooks/useThemeColors';
import { useTheme } from '@/app/contexts/ThemeContext';

export function FuturisticChatInterface() {
  const colors = useThemeColors();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [message, setMessage] = useState('');

  const messages = [
    { id: 1, type: 'incoming', text: 'Hey! How are you doing?', time: '10:23 AM' },
    { id: 2, type: 'outgoing', text: 'Doing great! Just working on some projects', time: '10:24 AM' },
    { id: 3, type: 'incoming', text: 'That sounds awesome! What kind of projects?', time: '10:24 AM' },
    { id: 4, type: 'outgoing', text: 'Building some cool stuff', time: '10:25 AM' },
    { id: 5, type: 'incoming', text: 'Wow, that\'s impressive! Can you tell me more about it?', time: '10:26 AM' },
    { id: 6, type: 'outgoing', text: 'Sure! It\'s a project on analog electronics', time: '10:27 AM' },
    { id: 7, type: 'incoming', text: 'I\'d love to hear more about the technical details', time: '10:28 AM' },
    { id: 8, type: 'outgoing', text: 'Let me share some screenshots with you', time: '10:28 AM' },
  ];

  return (
    // MAIN CONTAINER: Full Width & Height of the Desktop Frame
    <div className={`w-full h-full flex flex-col relative transition-all duration-300
        ${isDark 
            ? 'bg-[#020617]' 
            : 'bg-white'
        }`}>

        {/* --- HEADER --- */}
        <div className={`h-24 px-10 flex items-center justify-between relative z-10 backdrop-blur-xl border-b transition-colors
            ${isDark 
                ? 'bg-slate-900/60 border-white/10' 
                : 'bg-white/80 border-slate-100'
            }`}>
            
            {/* Top Glow Line (Dark Mode Only) */}
            <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent ${isDark ? 'opacity-100' : 'opacity-0'}`}></div>

            <div className="flex items-center gap-6 flex-1">
                {/* Back Button */}
                <button className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all duration-300 group
                    ${isDark 
                        ? 'bg-white/5 border-white/10 hover:border-cyan-500/50 text-white/70 hover:text-cyan-400' 
                        : 'bg-slate-50 border-slate-200 hover:border-blue-400 text-slate-500 hover:text-blue-600'
                    }`}>
                    <ArrowLeft className="w-5 h-5" />
                </button>

                {/* User Info */}
                <div className="flex items-center gap-5">
                    <div className="relative">
                        <div className={`w-14 h-14 rounded-full p-0.5
                            ${isDark 
                                ? 'bg-gradient-to-br from-cyan-500 to-blue-600 shadow-[0_0_20px_rgba(6,182,212,0.4)]' 
                                : 'bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-500/20'
                            }`}>
                            <div className={`w-full h-full rounded-full flex items-center justify-center font-bold text-sm
                                ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'}`}>
                                DS
                            </div>
                        </div>
                        <div className={`absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 animate-pulse
                            ${isDark ? 'border-[#020617]' : 'border-white'}`}></div>
                    </div>
                    
                    <div>
                        <h3 className={`font-bold text-xl ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            DarkSignal
                        </h3>
                        <p className="text-green-500 text-xs font-bold tracking-wide flex items-center gap-1.5 mt-1">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                            ONLINE
                        </p>
                    </div>
                </div>
            </div>

            {/* Header Actions (Call Button Removed) */}
            <div className="flex items-center gap-4">
                <button className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all duration-300
                    ${isDark 
                        ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white/70 hover:text-cyan-400' 
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-blue-600'
                    }`}>
                    <Video className="w-5 h-5" />
                </button>
                
                <button className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all duration-300
                    ${isDark 
                        ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white/70 hover:text-cyan-400' 
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-blue-600'
                    }`}>
                    <MoreVertical className="w-5 h-5" />
                </button>
            </div>
        </div>

        {/* --- MESSAGES AREA --- */}
        <div className="flex-1 overflow-y-auto p-12 space-y-8 scrollbar-thin scrollbar-thumb-slate-700">
            {messages.map((msg) => (
                <div key={msg.id} className={`flex w-full ${msg.type === 'outgoing' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                    <div className={`max-w-[70%] xl:max-w-[60%] flex flex-col ${msg.type === 'outgoing' ? 'items-end' : 'items-start'}`}>
                        
                        <div className={`px-10 py-6 rounded-[2rem] text-lg leading-relaxed backdrop-blur-sm relative z-10
                            ${msg.type === 'outgoing'
                                ? `bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-none ${isDark ? 'shadow-[0_0_25px_rgba(6,182,212,0.3)]' : 'shadow-lg shadow-blue-500/30'}`
                                : isDark
                                    ? 'bg-slate-800/80 border border-slate-700/50 text-slate-200 rounded-tl-none'
                                    : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none shadow-sm'
                            }
                        `}>
                            {msg.text}
                        </div>

                        <div className={`flex items-center gap-1.5 mt-2 px-2 text-sm font-medium
                            ${msg.type === 'outgoing' 
                                ? 'text-cyan-500' 
                                : (isDark ? 'text-slate-500' : 'text-slate-400')
                            }`}>
                            <span>{msg.time}</span>
                            {msg.type === 'outgoing' && <CheckCheck className="w-4 h-4" />}
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {/* --- INPUT BAR --- */}
        <div className={`h-32 px-10 flex items-center gap-6 relative z-10 backdrop-blur-xl border-t transition-colors
            ${isDark 
                ? 'bg-slate-900/60 border-white/10' 
                : 'bg-white/80 border-slate-100'
            }`}>
            
            {/* Bottom Glow Line (Dark Mode Only) */}
            <div className={`absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent ${isDark ? 'opacity-100' : 'opacity-0'}`}></div>

            <button className={`w-16 h-16 rounded-full border flex items-center justify-center transition-all flex-shrink-0
                ${isDark 
                    ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white/70 hover:text-cyan-400' 
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-blue-600'
                }`}>
                <Paperclip className="w-6 h-6" />
            </button>

            <div className="flex-1 relative">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    className={`w-full h-20 rounded-full px-10 pr-20 text-xl outline-none border transition-all
                        ${isDark 
                            ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500 focus:border-cyan-500/50 focus:bg-slate-800/80 focus:shadow-[0_0_20px_rgba(6,182,212,0.15)]' 
                            : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-400 focus:shadow-md'
                        }`}
                />
                <button className={`absolute right-6 top-1/2 -translate-y-1/2 p-3 rounded-full transition-colors
                    ${isDark ? 'text-slate-400 hover:text-cyan-400' : 'text-slate-400 hover:text-blue-600'}`}>
                    <Smile className="w-7 h-7" />
                </button>
            </div>

            <button className={`w-20 h-20 rounded-full flex items-center justify-center text-white transition-all transform hover:scale-105 active:scale-95 flex-shrink-0
                ${isDark 
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 shadow-[0_0_30px_rgba(6,182,212,0.5)] hover:shadow-[0_0_45px_rgba(6,182,212,0.8)]' 
                    : 'bg-slate-900 hover:bg-slate-800 shadow-xl shadow-slate-900/20'
                }`}>
                <Send className="w-8 h-8 ml-1" />
            </button>
        </div>

        {/* Ambient Glow Effects (Dark Mode Only) */}
        {isDark && (
            <>
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none"></div>
                <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none"></div>
            </>
        )}
    </div>
  );
}