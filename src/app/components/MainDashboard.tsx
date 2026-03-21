import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, MessageSquare, User, Video, Search, LogOut, Loader2, Menu, X } from 'lucide-react';
import { useThemeColors } from '@/app/hooks/useThemeColors';
import { useTheme } from '@/app/contexts/ThemeContext';
import { authFetch, clearAuthTokens } from '@/services/auth';
import { useGlobalCleanup } from '../hooks/useGlobalCleanup';

export function MainDashboard() {
  const colors = useThemeColors();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('chats');
  const [chats, setChats] = useState<any[]>([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(true);
  
  // Mobile sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setChatsLoading(true);
      setUserLoading(true);
      try {
        // Fetch User Profile
        const profileRes = await authFetch("/api/users/profile");
        const profileJson = await profileRes.json().catch(() => ({}));
        if (profileRes.ok && profileJson.success) {
          setUser(profileJson.data.user);
        }

        // Fetch Chats
        const chatsRes = await authFetch("/api/chats");
        const chatsJson = await chatsRes.json().catch(() => ({}));
        if (chatsRes.ok && chatsJson.success) {
          setChats(chatsJson.data.chats || []);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setChatsLoading(false);
        setUserLoading(false);
      }
    };
    fetchData();
  }, []);

  const logout = () => {
    clearAuthTokens();
    window.location.href = "/";
  };

  const displayName = useMemo(() => {
    if (!user) return "User";
    return user.display_name || user.email?.split('@')[0] || "User";
  }, [user]);

  const avatarLetter = useMemo(() => {
    return (displayName?.charAt(0) || "U").toUpperCase();
  }, [displayName]);

  return (
    // MAIN CONTAINER: Full Desktop Size, locked to exactly 100dvh
    <div className={`w-full h-[100dvh] flex overflow-hidden transition-colors duration-500 relative
      ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>

      {/* --- MOBILE SIDEBAR BACKDROP --- */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* --- LEFT SIDEBAR (Navigation) --- */}
      <div className={`fixed lg:relative inset-y-0 left-0 shrink-0 flex flex-col border-r z-50 transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'w-[280px] sm:w-[320px] translate-x-0' : 'w-[280px] sm:w-[320px] -translate-x-full lg:translate-x-0 lg:w-80'}
          ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200 shadow-2xl lg:shadow-none'}`}>
        
        {/* Logo Area */}
        <div className="h-16 md:h-20 lg:h-24 flex items-center justify-between px-6 lg:px-8 shrink-0 border-b lg:border-b-0 border-transparent">
            <h2 className="text-2xl font-black tracking-tight">
                <span className={isDark ? 'text-white' : 'text-slate-900'}>Incogn</span>
                <span className="text-blue-500">IIT</span>
                <span className={isDark ? 'text-white' : 'text-slate-900'}>o</span>
            </h2>
            {/* Close button for mobile */}
            <button 
              onClick={() => setSidebarOpen(false)}
              className={`lg:hidden p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
            >
              <X className="w-5 h-5" />
            </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-4 lg:py-0 space-y-2 overflow-y-auto no-scrollbar">
            {[
                { id: 'requests', label: 'Chat Requests', icon: MessageCircle, path: '/requests' },
                { id: 'chats', label: 'Current Chats', icon: MessageSquare, path: '/dashboard' },
                { id: 'profile', label: 'Profile', icon: User, path: '/profile' },
            ].map((item) => (
                <button
                    key={item.id}
                    onClick={() => {
                      navigate(item.path);
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3.5 sm:py-4 rounded-xl transition-all duration-300 group
                        ${activeTab === item.id 
                            ? (isDark ? 'bg-gradient-to-r from-blue-600/20 to-blue-500/10 border border-blue-500/30 text-white shadow-sm' : 'bg-blue-50 border border-blue-200 text-blue-700 shadow-sm')
                            : (isDark ? 'border border-transparent text-slate-400 hover:bg-white/5 hover:text-white' : 'border border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900')
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${activeTab === item.id ? 'text-blue-500' : ''}`} />
                        <span className="font-semibold text-sm sm:text-base">{item.label}</span>
                    </div>
                </button>
            ))}
        </nav>

        {/* User Profile Snippet */}
        <div className={`p-4 lg:p-6 border-t shrink-0 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <div 
                onClick={() => {
                  navigate('/profile');
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`p-3 sm:p-4 rounded-2xl flex items-center gap-3 cursor-pointer transition-colors border border-transparent
                ${isDark ? 'bg-white/5 hover:bg-white/10 hover:border-white/10' : 'bg-slate-50 hover:bg-slate-100 border-slate-100 hover:border-slate-200'}`}>
                
                {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="Profile" className="w-10 h-10 sm:w-12 sm:h-12 rounded-[14px] object-cover shadow-sm" />
                ) : (
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-[14px] bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                        {userLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : avatarLetter}
                    </div>
                )}
                
                <div className="flex-1 min-w-0 overflow-hidden">
                    <p className={`font-bold text-sm sm:text-base truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {userLoading ? "Loading..." : displayName}
                    </p>
                    <p className="text-[10px] sm:text-xs text-blue-500 font-semibold truncate">★ {Number(user?.rating || 0).toFixed(1)} Rating</p>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); logout(); }} 
                  className={`p-2 rounded-xl transition-colors shrink-0 ${isDark ? 'text-slate-500 hover:bg-white/10 hover:text-red-400' : 'text-slate-400 hover:bg-white hover:text-red-500 shadow-sm'}`}
                  title="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
            </div>
        </div>

        {/* Back to Home Button */}
        <div className={`p-4 lg:p-6 border-t shrink-0 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
          <button
            onClick={() => navigate('/homepage')}
            className={`w-full py-3.5 sm:py-4 rounded-xl font-bold flex items-center justify-center gap-2 border-2 transition-all active:scale-[0.98] text-sm sm:text-base
            ${isDark
              ? 'border-blue-500/20 text-blue-300 hover:bg-blue-500/10'
              : 'border-blue-100 text-blue-700 hover:bg-blue-50 hover:border-blue-200 bg-white'
            }`}
          >
            Back to Home
          </button>
        </div>
      </div>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col relative min-w-0 isolate">
        
        {/* Ambient Background Gradients */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className={`absolute top-[-10%] right-[-5%] w-[300px] md:w-[600px] h-[300px] md:h-[600px] rounded-full blur-[80px] md:blur-[100px] opacity-20 transition-colors
              ${isDark ? 'bg-blue-600/30' : 'bg-blue-200/50'}`} />
          <div className={`absolute bottom-[-10%] left-[-10%] w-[250px] md:w-[400px] h-[250px] md:h-[400px] rounded-full blur-[80px] md:blur-[100px] opacity-20 transition-colors
              ${isDark ? 'bg-purple-600/20' : 'bg-purple-200/40'}`} />
        </div>

        {/* Header */}
        <div className={`h-16 md:h-20 lg:h-24 px-4 sm:px-6 lg:px-10 flex items-center justify-between shrink-0 z-20 border-b backdrop-blur-md
            ${isDark ? 'bg-slate-900/70 border-white/10' : 'bg-white/80 border-slate-200'}`}>
            
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                {/* Mobile Hamburger */}
                <button 
                  onClick={() => setSidebarOpen(true)}
                  className={`lg:hidden p-2 -ml-2 rounded-xl transition-colors border ${isDark ? 'border-white/10 bg-white/5 text-white hover:bg-white/10' : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50'}`}
                >
                  <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>

                <div className="min-w-0">
                    <h3 className={`text-lg sm:text-2xl lg:text-3xl font-black tracking-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Active Conversations
                    </h3>
                    <p className={`hidden sm:block text-xs lg:text-sm mt-0.5 lg:mt-1 truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Manage your ongoing anonymous interactions.
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                {/* Search Bar (Hidden on very small mobile) */}
                <div className={`hidden md:flex items-center px-4 py-2.5 lg:py-3 rounded-xl border w-48 lg:w-64 transition-all shadow-sm
                    ${isDark ? 'bg-slate-900 border-white/10 focus-within:border-blue-500/50 focus-within:bg-slate-800' : 'bg-white border-slate-200 focus-within:border-blue-400'}`}>
                    <Search className={`w-4 h-4 mr-2 shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-400'}`} />
                    <input 
                        type="text" 
                        placeholder="Search chats..."
                        className={`bg-transparent outline-none text-sm w-full font-medium ${isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`}
                    />
                </div>

                {/* Main Action Button */}
                <button className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 sm:px-6 py-2.5 lg:py-3 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0">
                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
                    <div className="relative flex items-center gap-1.5 sm:gap-2">
                        <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="hidden sm:block">Enter Room</span>
                        <span className="sm:hidden">Join</span>
                    </div>
                </button>
            </div>
        </div>

        {/* Chat List Grid */}
        {/* FIX: Added min-h-0 here to ensure flex-1 doesn't break scrolling */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-10 z-10 no-scrollbar">
            {chatsLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500">
                    <Loader2 className={`w-8 h-8 sm:w-10 sm:h-10 animate-spin ${isDark ? 'text-blue-500' : 'text-blue-600'}`} />
                    <p className={`font-semibold text-sm sm:text-base ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading your conversations...</p>
                </div>
            ) : chats.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center px-4 animate-in fade-in zoom-in-95 duration-500">
                    <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mb-6 shadow-inner
                      ${isDark ? 'bg-white/5 border border-white/10' : 'bg-slate-100 border border-slate-200'}`}>
                      <MessageSquare className={`w-10 h-10 sm:w-12 sm:h-12 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
                    </div>
                    <p className={`text-xl sm:text-2xl font-black tracking-tight mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>No active chats yet</p>
                    <p className={`text-sm sm:text-base mb-8 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Join the matchmaking queue to meet new people or check your requests.</p>
                    <button 
                        onClick={() => navigate('/homepage')}
                        className={`w-full sm:w-auto px-8 py-3.5 sm:py-4 rounded-xl font-bold shadow-lg transition-all active:scale-[0.98]
                          ${isDark ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-900/50' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20'}`}
                    >
                        Start Matching
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:gap-4 max-w-5xl mx-auto">
                    {chats.map((chat) => {
                        const otherName = chat.display_name || chat.email?.split('@')[0] || "Anonymous";
                        const otherAvatar = chat.avatar_url;
                        const initial = (otherName.charAt(0) || "U").toUpperCase();

                        return (
                            <div
                                key={chat.chat_id}
                                onClick={() => navigate(`/chat`)}
                                className={`group relative flex items-center p-3 sm:p-4 lg:p-5 rounded-2xl border cursor-pointer transition-all duration-300 shadow-sm
                                    ${isDark 
                                        ? 'bg-slate-900/50 border-white/10 hover:bg-white/5 hover:border-white/20 backdrop-blur-md' 
                                        : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md hover:bg-blue-50/30'
                                    }
                                `}
                            >
                                {/* Avatar */}
                                <div className="relative mr-4 sm:mr-5 shrink-0">
                                    {otherAvatar ? (
                                        <img src={otherAvatar} alt={otherName} className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-[1.25rem] object-cover shadow-sm group-hover:scale-105 transition-transform" />
                                    ) : (
                                        <div className={`w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-[1.25rem] flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-sm group-hover:scale-105 transition-transform
                                            ${isDark 
                                                ? 'bg-gradient-to-br from-blue-600 to-purple-600' 
                                                : 'bg-gradient-to-br from-blue-500 to-indigo-500'
                                            }`}>
                                            {initial}
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0 pr-2">
                                    <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                                        <h4 className={`text-base sm:text-lg font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                            {otherName}
                                        </h4>
                                    </div>
                                    <p className={`text-xs sm:text-sm font-medium truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {chat.email || "Active conversation"}
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="ml-2 sm:ml-4 flex items-center shrink-0">
                                    <div className={`p-2 sm:p-2.5 rounded-full opacity-100 lg:opacity-0 group-hover:opacity-100 transition-all transform lg:-translate-x-4 lg:group-hover:translate-x-0 shadow-sm
                                        ${isDark ? 'bg-white/10 text-white border border-white/5' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                                        <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>

      </div>
    </div>
  );
}