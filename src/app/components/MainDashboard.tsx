import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, MessageSquare, User, Video, Plus, Search, Bell, Settings, LogOut, Loader2 } from 'lucide-react';
import { useThemeColors } from '@/app/hooks/useThemeColors';
import { useTheme } from '@/app/contexts/ThemeContext';
import { authFetch, clearAuthTokens } from '@/services/auth';

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
                { id: 'requests', label: 'Chat Requests', icon: MessageCircle, path: '/requests' },
                { id: 'chats', label: 'Current Chats', icon: MessageSquare, path: '/dashboard' },
                { id: 'profile', label: 'Profile', icon: User, path: '/profile' },
            ].map((item) => (
                <button
                    key={item.id}
                    onClick={() => navigate(item.path)}
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
                </button>
            ))}
        </nav>

        {/* User Profile Snippet */}
        <div className={`p-6 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <div 
                onClick={() => navigate('/profile')}
                className={`p-4 rounded-2xl flex items-center gap-3 cursor-pointer transition-colors
                ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200'}`}>
                
                {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="Profile" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                        {userLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : avatarLetter}
                    </div>
                )}
                
                <div className="flex-1 overflow-hidden">
                    <p className={`font-bold text-sm truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {userLoading ? "Loading..." : displayName}
                    </p>
                    <p className="text-xs text-blue-500 font-medium">★ {Number(user?.rating || 0).toFixed(1)} Rating</p>
                </div>
                <LogOut onClick={(e) => { e.stopPropagation(); logout(); }} className={`w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'} hover:text-red-500`} />
            </div>
        </div>

        <div className="p-6 border-t space-y-3" style={{borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgb(226,232,240)'}}>
          <button
            onClick={() => navigate('/homepage')}
            className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 border-2 transition-colors
            ${isDark
              ? 'border-blue-500/20 text-blue-300 hover:bg-blue-500/10'
              : 'border-blue-100 text-blue-700 hover:bg-blue-50 hover:border-blue-200'
            }`}
          >
            Back to Home
          </button>
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
            {chatsLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <p className="font-medium">Loading your conversations...</p>
                </div>
            ) : chats.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500">
                    <MessageSquare className="w-16 h-16 opacity-20" />
                    <p className="text-xl font-bold">No active chats yet</p>
                    <p className="text-sm">Join the matchmaking queue or check your requests.</p>
                    <button 
                        onClick={() => navigate('/homepage')}
                        className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-colors"
                    >
                        Start Matching
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {chats.map((chat) => {
                        const otherName = chat.display_name || chat.email?.split('@')[0] || "Anonymous";
                        const otherAvatar = chat.avatar_url;
                        const initial = (otherName.charAt(0) || "U").toUpperCase();

                        return (
                            <div
                                key={chat.chat_id}
                                onClick={() => navigate(`/chat`)}
                                className={`group relative flex items-center p-5 rounded-2xl border cursor-pointer transition-all duration-300
                                    ${isDark 
                                        ? 'bg-slate-900/40 border-white/5 hover:bg-white/5 hover:border-white/10' 
                                        : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-lg'
                                    }
                                `}
                            >
                                {/* Avatar */}
                                <div className="relative mr-6">
                                    {otherAvatar ? (
                                        <img src={otherAvatar} alt={otherName} className="w-16 h-16 rounded-2xl object-cover shadow-lg" />
                                    ) : (
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg
                                            ${isDark 
                                                ? 'bg-gradient-to-br from-blue-600 to-purple-600' 
                                                : 'bg-gradient-to-br from-blue-500 to-indigo-500'
                                            }`}>
                                            {initial}
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className={`text-lg font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                            {otherName}
                                        </h4>
                                    </div>
                                    <p className={`text-sm truncate pr-8 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {chat.email || "Active conversation"}
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="ml-4 flex items-center">
                                    <div className={`p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1
                                        ${isDark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                        <MessageSquare className="w-4 h-4" />
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