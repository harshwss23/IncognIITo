import React, { useState } from 'react';
import { Shield, AlertTriangle, User, Ban, Search, LogOut } from 'lucide-react';
import { useThemeColors } from '@/app/hooks/useThemeColors';
import { useTheme } from '@/app/contexts/ThemeContext';

export function AdminDashboard() {
  const colors = useThemeColors();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const [activeTab, setActiveTab] = useState<'users' | 'reports'>('users');
  const [searchQuery, setSearchQuery] = useState('');

  // Data: Users
  const allUsers = [
    { col1: 'MaskedSoul', col2: 'student01@iitk.ac.in', col3: 4.8, status: 'active' },
    { col1: 'PixelShade', col2: 'student02@iitk.ac.in', col3: 3.2, status: 'flagged' },
    { col1: 'ShadowKey', col2: 'student03@iitk.ac.in', col3: 4.5, status: 'active' },
    { col1: 'DarkSignal', col2: 'student04@iitk.ac.in', col3: 4.9, status: 'active' },
    { col1: 'SilentUser', col2: 'student05@iitk.ac.in', col3: 4.6, status: 'active' },
    { col1: 'IncognitoX', col2: 'student06@iitk.ac.in', col3: 4.7, status: 'active' },
    { col1: 'Shadow404', col2: 'student07@iitk.ac.in', col3: 4.3, status: 'active' },
    { col1: 'Sam Wilder', col2: 'student08@iitk.ac.in', col3: 4.8, status: 'active' },
  ];

  // Data: Reports (Mapped to match User column structure for perfect alignment)
 const allReports = [
  { col1: 'R-1024', col2: 'Reported: Alex Rowan',   col3: 'Harassment',           status: 'Pending' },
  { col1: 'R-1025', col2: 'Reported: Jamie Vale',   col3: 'Inappropriate Video',  status: 'Resolved' },
  { col1: 'R-1026', col2: 'Reported: Morgan Reed',  col3: 'Spamming',             status: 'Dismissed' },
  { col1: 'R-1027', col2: 'Reported: Riley Ash',    col3: 'Hate Speech',          status: 'Pending' },
  { col1: 'R-1028', col2: 'Reported: Taylor Knox',  col3: 'Fake Profile',         status: 'Resolved' },
  { col1: 'R-1029', col2: 'Reported: Jordan Quinn', col3: 'Abusive Language',     status: 'Pending' },
  { col1: 'R-1030', col2: 'Reported: Casey Lane',   col3: 'Bot Activity',         status: 'Pending' },
  { col1: 'R-1031', col2: 'Reported: Avery Stone',  col3: 'Scam Link',            status: 'Resolved' },
];


  // Dynamic Data Selection
  const currentData = activeTab === 'users' ? allUsers : allReports;
  
  // Dynamic Headers
  const headers = activeTab === 'users' 
    ? ['User ID', 'IITK Email', 'Reputation', 'Status', 'Actions']
    : ['Report ID', 'Target User', 'Reason', 'Status', 'Actions'];

  return (
    // MAIN CONTAINER: Full Width & Height
    <div className={`w-full h-full flex flex-col transition-colors duration-300
        ${isDark 
            ? 'bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] border border-blue-500/30' 
            : 'bg-white border border-slate-200 shadow-2xl'
        } rounded-3xl overflow-hidden shadow-2xl`}>
      
      {/* --- HEADER --- */}
      <div className={`h-24 px-8 flex items-center justify-between border-b transition-colors
          ${isDark 
            ? 'bg-gradient-to-r from-blue-950/50 via-[#1E293B] to-blue-950/50 border-blue-500/30' 
            : 'bg-white border-slate-200'
          }`}>
        
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg
              ${isDark 
                ? 'bg-gradient-to-br from-blue-600 to-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.4)]' 
                : 'bg-gradient-to-br from-blue-600 to-cyan-500 shadow-blue-200'
              }`}>
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className={`text-3xl font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>Admin Dashboard</h2>
            <p className={`text-sm ${isDark ? 'text-blue-300/70' : 'text-slate-500'}`}>User Management & Moderation</p>
          </div>
        </div>
        
        {/* Stats & Logout */}
        <div className="flex gap-6 items-center">
          <div className="text-center">
            <div className={`text-3xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{allUsers.length}</div>
            <div className={`text-xs uppercase tracking-wider ${isDark ? 'text-white/60' : 'text-slate-400'}`}>Total Users</div>
          </div>
          <div className={`w-px h-12 ${isDark ? 'bg-white/20' : 'bg-slate-200'}`}></div>
          <div className="text-center">
            <div className={`text-3xl font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
              {allUsers.filter(u => u.status === 'active').length}
            </div>
            <div className={`text-xs uppercase tracking-wider ${isDark ? 'text-white/60' : 'text-slate-400'}`}>Active</div>
          </div>

          {/* LOGOUT BUTTON */}
          <button className={`ml-4 px-4 py-2 rounded-xl border flex items-center gap-2 font-bold text-sm transition-all
              ${isDark 
                  ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' 
                  : 'border-red-200 text-red-600 hover:bg-red-50'
              }`}>
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
          </button>
        </div>
      </div>

      {/* --- TABS & SEARCH --- */}
      <div className={`h-20 px-8 flex items-center justify-between gap-4 border-b
          ${isDark 
            ? 'bg-[#1E293B]/50 border-blue-500/20' 
            : 'bg-slate-50 border-slate-200'
          }`}>
        
        {/* Tabs */}
        <div className="flex gap-3">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center gap-2 ${
              activeTab === 'users'
                ? (isDark 
                    ? 'bg-gradient-to-r from-blue-600/30 to-blue-500/20 border-2 border-blue-500/50 text-white shadow-[0_0_25px_rgba(59,130,246,0.3)]' 
                    : 'bg-white border-2 border-blue-500 text-blue-600 shadow-md')
                : (isDark 
                    ? 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white' 
                    : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-900')
            }`}
          >
            <User className="w-4 h-4" />
            <span>All Users</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center gap-2 relative ${
              activeTab === 'reports'
                ? (isDark 
                    ? 'bg-gradient-to-r from-blue-600/30 to-blue-500/20 border-2 border-blue-500/50 text-white shadow-[0_0_25px_rgba(59,130,246,0.3)]' 
                    : 'bg-white border-2 border-blue-500 text-blue-600 shadow-md')
                : (isDark 
                    ? 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white' 
                    : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-900')
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Pending Reports</span>
            <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full text-xs font-bold flex items-center justify-center text-white shadow-[0_0_15px_rgba(239,68,68,0.8)]">
              5
            </span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-white/40' : 'text-slate-400'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === 'users' ? "Search users..." : "Search report ID..."}
            className={`w-full border-2 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none transition-all duration-300
                ${isDark 
                    ? 'bg-white/5 border-blue-500/30 text-white placeholder-white/40 focus:border-blue-500 focus:bg-white/10 focus:shadow-[0_0_20px_rgba(59,130,246,0.2)]' 
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                }`}
          />
        </div>
      </div>

      {/* --- TABLE CONTENT --- */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className={`sticky top-0 z-10 ${isDark ? 'bg-[#1E293B] border-b border-blue-500/20' : 'bg-slate-50 border-b border-slate-200'}`}>
            <tr>
              {headers.map((h, i) => (
                  <th key={i} className={`px-8 py-5 text-left text-xs font-bold uppercase tracking-wider
                      ${isDark ? 'text-white/70' : 'text-slate-500'}`}>
                      {h}
                  </th>
              ))}
            </tr>
          </thead>
          <tbody className={`divide-y ${isDark ? 'divide-white/10' : 'divide-slate-200'}`}>
            {currentData.map((item, idx) => (
              <tr key={idx} className={`group transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                
                {/* Column 1: ID */}
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-lg
                        ${isDark 
                            ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white' 
                            : 'bg-gradient-to-br from-slate-200 to-slate-300 text-slate-700'
                        }`}>
                      {item.col1.slice(-2)}
                    </div>
                    <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{item.col1}</span>
                  </div>
                </td>

                {/* Column 2: Email / Reported User */}
                <td className="px-8 py-5">
                  <span className={`font-mono text-sm ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>{item.col2}</span>
                </td>

                {/* Column 3: Reputation / Reason */}
                <td className="px-8 py-5">
                    {activeTab === 'users' ? (
                        <div className="flex items-center gap-2">
                            <span className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-800'}`}>{item.col3}</span>
                            <span className="text-yellow-500">★</span>
                        </div>
                    ) : (
                        <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{item.col3}</span>
                    )}
                </td>

                {/* Column 4: Status */}
                <td className="px-8 py-5">
                  <span
                    className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border shadow-sm
                        ${item.status === 'active' || item.status === 'Resolved'
                            ? (isDark ? 'bg-green-500/20 text-green-300 border-green-500/40' : 'bg-green-100 text-green-700 border-green-200')
                            : (item.status === 'flagged' || item.status === 'Pending'
                                ? (isDark ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' : 'bg-yellow-100 text-yellow-700 border-yellow-200')
                                : (isDark ? 'bg-red-500/20 text-red-300 border-red-500/40' : 'bg-red-100 text-red-700 border-red-200'))
                        }`}
                  >
                    <div className={`w-2 h-2 rounded-full mr-2 animate-pulse 
                        ${item.status === 'active' || item.status === 'Resolved' ? 'bg-green-500' : (item.status === 'flagged' || item.status === 'Pending' ? 'bg-yellow-500' : 'bg-red-500')}`} 
                    />
                    {item.status}
                  </span>
                </td>

                {/* Column 5: Action (PRESERVED EXACTLY AS REQUESTED) */}
                <td className="px-8 py-5">
                  <div className="flex items-center justify-start">
                    <button className="group/btn px-5 py-2.5 rounded-xl bg-transparent border-2 border-red-500/60 text-red-400 text-sm font-bold hover:bg-red-500/10 hover:border-red-500 hover:text-red-300 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] flex items-center gap-2">
                      <Ban className="w-4 h-4" />
                      <span>Block User</span>
                    </button>
                  </div>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}