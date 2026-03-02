import React from 'react';
import { MessageCircle, MessageSquare, User, Sparkles, Check, X, Shield, Bell } from 'lucide-react';
import { useThemeColors } from '@/app/hooks/useThemeColors';

export function ChatRequestsDashboard() {
  const colors = useThemeColors();
  
  const connectionRequests = [
    { id: 1, userId: 'MaskedSoul', matchScore: 95, sharedTags: ['CS253', 'Anime', 'Competitive Programming'] },
    { id: 2, userId: 'PixelShade', matchScore: 88, sharedTags: ['Machine Learning', 'Photography', 'Cricket'] },
    { id: 3, userId: 'ShadowKey', matchScore: 92, sharedTags: ['Game Dev', 'CS251', 'Music Production'] },
    { id: 4, userId: 'DarkSignal', matchScore: 85, sharedTags: ['Robotics', 'Physics', 'Chess'] },
    { id: 5, userId: 'SilentUser', matchScore: 90, sharedTags: ['Web Dev', 'Startup Ideas', 'Basketball'] },
    { id: 6, userId: 'IncognitoX', matchScore: 87, sharedTags: ['AI Ethics', 'Philosophy', 'Debate'] },
  ];

  return (
    // MAIN CONTAINER: w-full h-full
    <div className={`w-full h-full flex ${colors.bgSecondary} transition-colors duration-300`}>
      
      {/* --- LEFT SIDEBAR --- */}
      <div className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-blue-500/20 p-6 flex flex-col transition-colors z-20">
        
        {/* Logo */}
        <div className="mb-10 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/30">I</div>
            <h2 className="text-2xl font-bold tracking-tight">
                <span className="text-slate-900 dark:text-white">Incogn</span>
                <span className="text-blue-600 dark:text-blue-400">IIT</span>
                <span className="text-slate-900 dark:text-white">o</span>
            </h2>
        </div>

        {/* Navigation */}
        <nav className="space-y-2 flex-1">
          {/* Active Tab */}
          <button className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-blue-50 dark:bg-blue-600/10 border border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 shadow-sm dark:shadow-[0_0_15px_rgba(59,130,246,0.15)] transition-all">
            <div className="relative">
              <MessageCircle className="w-5 h-5" />
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white shadow-md">
                6
              </span>
            </div>
            <span className="font-semibold text-sm">Chat Requests</span>
          </button>

          {/* Inactive Tabs */}
          <button className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-all group">
            <MessageSquare className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="font-medium text-sm">Current Chats</span>
          </button>

          <button className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-all group">
            <User className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="font-medium text-sm">Profile</span>
          </button>
        </nav>

        {/* User Profile Snippet */}
        <div className="mt-auto pt-6 border-t border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer transition-colors">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold shadow-md">
              S
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-slate-900 dark:text-white font-bold text-sm truncate">Shadow404</p>
              <p className="text-slate-500 dark:text-blue-300/70 text-xs font-medium">Student • IITK</p>
            </div>
          </div>
          
        </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
        
        {/* Background Decorative Blobs (Light Mode Only) */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-200/20 rounded-full blur-[100px] pointer-events-none dark:opacity-0"></div>
        
        {/* Header */}
        <div className="h-20 border-b border-slate-200 dark:border-white/10 px-8 flex items-center justify-between bg-white/80 dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Connection Requests</h3>
            <p className="text-slate-500 dark:text-blue-200/60 text-sm">Find your perfect study partner or project collaborator.</p>
          </div>
          
          {/* <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-blue-600/20 dark:to-purple-600/20 border border-amber-200 dark:border-blue-500/30 shadow-sm">
            <Sparkles className="w-4 h-4 text-amber-500 dark:text-yellow-400 fill-amber-500 dark:fill-yellow-400" />
            <span className="text-amber-700 dark:text-white text-sm font-bold">Smart Match Enabled</span>
          </div> */}
        </div>

        {/* Cards Grid */}
        <div className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
            {connectionRequests.map((request) => (
              <div
                key={request.id}
                className="group relative bg-white dark:bg-[#0F172A] rounded-2xl p-5 border border-slate-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-500/50 shadow-sm hover:shadow-xl dark:hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] transition-all duration-300 flex flex-col h-full"
              >
                
                {/* Header: Avatar + ID */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center border border-slate-200 dark:border-white/10 group-hover:scale-105 transition-transform">
                      <Shield className="w-6 h-6 text-slate-400 dark:text-white/30" />
                    </div>
                    <div>
                      <h4 className="text-slate-900 dark:text-white font-bold text-sm">{request.userId}</h4>
                      <p className="text-slate-400 dark:text-blue-300/50 text-xs font-mono">Anonymous</p>
                    </div>
                  </div>
                  
                  {/* Match Score Badge */}
                  <div className="flex flex-col items-end">
                     <span className="text-2xl font-black text-green-600 dark:text-green-400">{request.matchScore}%</span>
                     <span className="text-[10px] text-green-600/70 dark:text-green-400/60 uppercase font-bold tracking-wider">Match</span>
                  </div>
                </div>

                {/* Tags */}
                <div className="mb-6 flex-1">
                  <p className="text-slate-400 dark:text-white/40 text-[10px] font-bold uppercase tracking-wider mb-2">Common Interests</p>
                  <div className="flex flex-wrap gap-2">
                    {request.sharedTags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-blue-900/20 border border-slate-200 dark:border-blue-500/20 text-slate-600 dark:text-blue-300 text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-auto">
                  <button className="flex-1 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-red-300 border border-slate-200 dark:border-red-500/20 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 hover:border-red-200 dark:hover:border-red-500/50 transition-all">
                    Decline
                  </button>
                  <button className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" />
                    Connect
                  </button>
                </div>

              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}