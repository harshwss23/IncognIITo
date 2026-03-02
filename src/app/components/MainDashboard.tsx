import React, { useState } from 'react';
import { MessageCircle, MessageSquare, User, Video, Plus, Search, Bell, Settings, LogOut } from 'lucide-react';
import { useThemeColors } from '@/app/hooks/useThemeColors';
import { useTheme } from '@/app/contexts/ThemeContext';

export function MainDashboard() {
  const colors = useThemeColors();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState('chats');

  const chatThreads = [
    { id: 1, name: 'MaskedSoul', lastMsg: 'That sounds interesting!', time: '2m ago', unread: 2, isActive: false },
    { id: 2, name: 'PixelShade', lastMsg: 'Let me share some screenshots with you', time: 'Just now', unread: 0, isActive: true },
    { id: 3, name: 'ShadowKey', lastMsg: 'Thanks for the chat!', time: '1h ago', unread: 0, isActive: false },
    { id: 4, name: 'DarkSignal', lastMsg: 'Great discussion about AI ethics.', time: '3h ago', unread: 0, isActive: false },
    { id: 5, name: 'SilentUser', lastMsg: 'Are you free for a call?', time: 'Yesterday', unread: 0, isActive: false },
    { id: 6, name: 'IncognitoX', lastMsg: 'Project deadline is extended.', time: 'Mon', unread: 5, isActive: false },
  ];

  return (
    // MAIN CONTAINER: Full Desktop Size
    <div className={`w-full h-full flex overflow-hidden transition-colors duration-500
      ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>

      {/* --- LEFT SIDEBAR (Navigation) --- */}
      <div className={`w-80 flex flex-col border-r z-20 transition-colors
          ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
        
        {/* Logo Area */}
        <div className="h-24 flex items-center px-8">
            <h2 className="text-2xl font-bold tracking-tight">
                <span className={isDark ? 'text-white' : 'text-slate-900'}>Incogn</span>
                <span className="text-blue-500">IIT</span>
                <span className={isDark ? 'text-white' : 'text-slate-900'}>o</span>
            </h2>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 space-y-2">
            {[
                { id: 'requests', label: 'Chat Requests', icon: MessageCircle, count: 3 },
                { id: 'chats', label: 'Current Chats', icon: MessageSquare, count: 0 },
                { id: 'profile', label: 'Profile', icon: User, count: 0 },
            ].map((item) => (
                <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-4 py-4 rounded-xl transition-all duration-300 group
                        ${activeTab === item.id 
                            ? (isDark ? 'bg-gradient-to-r from-blue-600/20 to-blue-500/10 border border-blue-500/30 text-white' : 'bg-blue-50 border border-blue-200 text-blue-700')
                            : (isDark ? 'text-slate-400 hover:bg-white/5 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900')
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-blue-500' : ''}`} />
                        <span className="font-medium">{item.label}</span>
                    </div>
                    {item.count > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-500/30">
                            {item.count}
                        </span>
                    )}
                </button>
            ))}
        </nav>

        {/* User Profile Snippet */}
        <div className={`p-6 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <div className={`p-4 rounded-2xl flex items-center gap-3 cursor-pointer transition-colors
                ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200'}`}>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                    S
                </div>
                <div className="flex-1 overflow-hidden">
                    <p className={`font-bold text-sm truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>Shadow404</p>
                    <p className="text-xs text-blue-500 font-medium">★ 4.8 Rating</p>
                </div>
                <LogOut className={`w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
            </div>
        </div>
      </div>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* Background Gradients */}
        <div className={`absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[100px] opacity-20 pointer-events-none transition-colors
            ${isDark ? 'bg-blue-600/20' : 'bg-blue-200/50'}`} />

        {/* Header */}
        <div className={`h-24 px-10 flex items-center justify-between z-10 border-b backdrop-blur-sm
            ${isDark ? 'bg-slate-900/50 border-white/10' : 'bg-white/60 border-slate-200'}`}>
            
            <div>
                <h3 className={`text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Active Conversations
                </h3>
                <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Manage your ongoing anonymous interactions.
                </p>
            </div>

            <div className="flex items-center gap-4">
                {/* Search Bar */}
                <div className={`hidden md:flex items-center px-4 py-3 rounded-xl border w-64 transition-all
                    ${isDark ? 'bg-white/5 border-white/10 focus-within:border-blue-500/50' : 'bg-white border-slate-200 focus-within:border-blue-400'}`}>
                    <Search className={`w-4 h-4 mr-2 ${isDark ? 'text-slate-400' : 'text-slate-400'}`} />
                    <input 
                        type="text" 
                        placeholder="Search chats..."
                        className={`bg-transparent outline-none text-sm w-full ${isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`}
                    />
                </div>

                {/* Main Action Button */}
                <button className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 text-white font-bold text-sm shadow-lg shadow-blue-500/30 transition-all hover:scale-105 active:scale-95">
                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
                    <div className="relative flex items-center gap-2">
                        <Video className="w-4 h-4" />
                        <span>Enter Room</span>
                    </div>
                </button>
            </div>
        </div>

        {/* Chat List Grid */}
        <div className="flex-1 overflow-y-auto p-10">
            <div className="grid grid-cols-1 gap-4">
                {chatThreads.map((chat) => (
                    <div
                        key={chat.id}
                        className={`group relative flex items-center p-5 rounded-2xl border cursor-pointer transition-all duration-300
                            ${chat.isActive 
                                ? (isDark 
                                    ? 'bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.15)]' 
                                    : 'bg-white border-blue-400 shadow-xl shadow-blue-100')
                                : (isDark 
                                    ? 'bg-slate-900/40 border-white/5 hover:bg-white/5 hover:border-white/10' 
                                    : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-lg')
                            }
                        `}
                    >
                        {/* Active Indicator Strip */}
                        {chat.isActive && (
                            <div className="absolute left-0 top-4 bottom-4 w-1 bg-blue-500 rounded-r-full"></div>
                        )}

                        {/* Avatar */}
                        <div className="relative mr-6">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg
                                ${isDark 
                                    ? 'bg-gradient-to-br from-blue-600 to-purple-600' 
                                    : 'bg-gradient-to-br from-blue-500 to-indigo-500'
                                }`}>
                                {chat.name.slice(-2)}
                            </div>
                            {chat.isActive && (
                                <span className={`absolute -bottom-1 -right-1 flex h-4 w-4`}>
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span className={`relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 ${isDark ? 'border-slate-900' : 'border-white'}`}></span>
                                </span>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                                <h4 className={`text-lg font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    {chat.name}
                                </h4>
                                <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {chat.time}
                                </span>
                            </div>
                            <p className={`text-sm truncate pr-8 ${chat.isActive 
                                ? (isDark ? 'text-blue-300' : 'text-blue-600 font-medium')
                                : (isDark ? 'text-slate-400' : 'text-slate-500')
                            }`}>
                                {chat.lastMsg}
                            </p>
                        </div>

                        {/* Unread Badge / Arrow */}
                        <div className="ml-4 flex items-center">
                            {chat.unread > 0 ? (
                                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-blue-500/40">
                                    {chat.unread}
                                </div>
                            ) : (
                                <div className={`p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1
                                    ${isDark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                    <Video className="w-4 h-4" />
                                </div>
                            )}
                        </div>

                    </div>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
}