import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, User, Ban, Search, LogOut, Loader2, X } from 'lucide-react';
import { useThemeColors } from '@/app/hooks/useThemeColors';
import { useTheme } from '@/app/contexts/ThemeContext';
import { ApiError, clearAuthTokens, fetchJsonWithAuth } from '@/services/auth';
import { useGlobalCleanUp } from '../hooks/useGlobalCleanup';
import { ThemeToggle } from "./ThemeToggle";

// Shape of each user returned by the backend
interface BackendUser {
  id: number;
  userId: string;
  email: string;
  totalReports: number;
  rating: number;
  status: string;
  verified: boolean;
}

// Shape of each report returned by the backend
interface BackendReport {
  id: number;
  reportId: string;
  targetUser: string;
  reason: string;
  status: string;
  target_id: number;
}

interface AdminUsersResponse extends Array<BackendUser> { }
interface AdminReportsResponse extends Array<BackendReport> { }

export function AdminDashboard() {
  const colors = useThemeColors();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<'users' | 'reports'>('users');
  const [searchQuery, setSearchQuery] = useState('');

  type ConfirmAction = {
    isOpen: boolean;
    title: string;
    message: string;
    actionLabel: string;
    isDanger: boolean;
    onConfirm: () => void;
  };
  const [confirmModal, setConfirmModal] = useState<ConfirmAction>({ isOpen: false, title: '', message: '', actionLabel: '', isDanger: false, onConfirm: () => { } });

  // Users fetched from backend
  const [users, setUsers] = useState<BackendUser[]>([]);
  const [reports, setReports] = useState<BackendReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const handleAuthFailure = (status: number) => {
    // Admin endpoints return 403 for authenticated non-admin users.
    if (status !== 401 && status !== 403) {
      return;
    }
    clearAuthTokens();
    window.location.assign('/');
  };

  // Fetch users + reports from backend on mount
  useEffect(() => {
    setLoading(true);

    Promise.all([
      fetchJsonWithAuth<AdminUsersResponse>('/api/admin/users'),
      fetchJsonWithAuth<AdminReportsResponse>('/api/admin/reports'),
    ])
      .then(([usersData, reportsData]) => {
        setUsers(usersData);
        setReports(reportsData);
        setLoading(false);
      })
      .catch((err: unknown) => {
        console.error('Failed to load data:', err);

        if (err instanceof ApiError) {
          handleAuthFailure(err.status);
          setError(err.message || 'Failed to load data');
        } else {
          setError('Failed to load data');
        }
        setLoading(false);
      });
  }, []);

  // Ban or unban a user
  const handlePerformToggleBan = async (userId: number, currentStatus: string) => {
    const action = currentStatus === 'banned' ? 'unban' : 'ban';
    try {
      await fetchJsonWithAuth(`/api/admin/users/${userId}/${action}`, {
        method: 'POST',
      });

      // Update local state immediately
      setUsers((prev) =>
        prev.map((u) => u.id === userId ? { ...u, status: action === 'ban' ? 'banned' : 'active' } : u)
      );
    } catch (err: unknown) {
      console.error(`${action} error:`, err);

      if (err instanceof ApiError) {
        handleAuthFailure(err.status);
        setError(err.message || `Failed to ${action} user`);
      } else {
        setError(`Failed to ${action} user`);
      }
    }
  };

  const handleToggleBan = (userId: number, currentStatus: string) => {
    const action = currentStatus === 'banned' ? 'unban' : 'ban';
    setConfirmModal({
      isOpen: true,
      title: `${action === 'ban' ? 'Ban' : 'Unban'} User`,
      message: `Are you sure you want to ${action === 'ban' ? 'permanently ban' : 'unban'} this user from the platform?`,
      actionLabel: action === 'ban' ? 'Ban User' : 'Unban User',
      isDanger: action === 'ban',
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        handlePerformToggleBan(userId, currentStatus);
      }
    });
  };

  // Dismiss a report without banning
  const handlePerformReportDismiss = async (reportId: number) => {
    try {
      await fetchJsonWithAuth(`/api/admin/reports/${reportId}`, {
        method: 'PATCH',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: 'Dismissed' })
      });
      setReports((prev) => prev.map(r => r.id === reportId ? { ...r, status: 'Dismissed' } : r));
    } catch (err: unknown) {
      console.error(err);
      setError('Failed to ignore report');
    }
  };

  const handleReportDismiss = (reportId: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Ignore Report',
      message: 'Are you sure you want to ignore this report? It will be removed from the pending list and marked as dismissed.',
      actionLabel: 'Ignore Report',
      isDanger: false,
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        handlePerformReportDismiss(reportId);
      }
    });
  };

  // Map backend users into the col1/col2/col3 shape the table expects
  const allUsers = users
    .filter((u) => u.verified === true)
    .map((u) => ({
      id: u.id,
      col1: u.userId,
      col2: u.email,
      col3: u.totalReports,
      col4: u.rating,
      status: u.status,
      targetId: u.id,
    }));

  // Map backend reports into the col1/col2/col3 shape the table expects
  const allReports = reports.map((r) => ({
    id: r.id,
    col1: r.reportId,
    col2: r.targetUser,
    col3: r.reason,
    col4: '',
    status: r.status,
    targetId: r.target_id,
  }));

  // Filter based on search
  const filteredUsers = allUsers.filter(
    (u) =>
      u.col1.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.col2.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredReports = allReports.filter(
    (r) =>
      r.status === 'Pending' &&
      (r.col1.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.col2.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const currentData = activeTab === 'users' ? filteredUsers : filteredReports;

  const headers = activeTab === 'users'
    ? ['User Name', 'IITK Email', 'Reports', 'Rating', 'Status', 'Actions']
    : ['Report ID', 'Reporter → Target', 'Reason', '', 'Status', 'Actions'];

  const pendingCount = allReports.filter((r) => r.status === 'Pending').length;

  return (
    // FIXED: Full viewport height, flex-col, hidden overall overflow for scroll-safety
    <div className={`w-full h-[100dvh] flex flex-col transition-colors duration-500 overflow-hidden relative
        ${isDark ? 'bg-[#0B1121]' : 'bg-slate-50'}`}>

      {/* Ambient Background Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className={`absolute top-[-10%] right-[-5%] w-[300px] md:w-[600px] h-[300px] md:h-[600px] rounded-full blur-[80px] md:blur-[120px] opacity-10 transition-colors ${isDark ? 'bg-blue-600' : 'bg-blue-300'}`} />
        <div className={`absolute bottom-[-10%] left-[-5%] w-[250px] md:w-[500px] h-[250px] md:h-[500px] rounded-full blur-[80px] md:blur-[120px] opacity-10 transition-colors ${isDark ? 'bg-purple-600' : 'bg-indigo-300'}`} />
      </div>

      {/* --- HEADER --- */}
      <div className={`relative z-10 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-6 lg:px-8 border-b transition-colors shadow-sm backdrop-blur-md
          ${isDark ? 'bg-slate-900/80 border-white/10' : 'bg-white/90 border-slate-200'}`}>

        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm
              ${isDark ? 'bg-gradient-to-br from-blue-600 to-indigo-600' : 'bg-gradient-to-br from-blue-600 to-cyan-500'}`}>
            <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className={`text-xl sm:text-2xl font-black tracking-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>Admin Dashboard</h2>
            <p className={`text-xs sm:text-sm font-medium truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>User Management & Moderation</p>
          </div>
        </div>

        {/* Stats & Logout & Theme */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 self-end md:self-auto w-full md:w-auto pb-1 md:pb-0 pt-2 pr-2">

          {/* ✅ THEME TOGGLE ADDED HERE */}
          <div className="shrink-0 flex items-center">
            <ThemeToggle />
          </div>

          <div className={`w-px h-10 hidden sm:block ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}></div>

          <div className="text-center shrink-0">
            <div className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{allUsers.length}</div>
            <div className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Total Users</div>
          </div>
          <div className={`w-px h-10 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}></div>
          <div className="text-center shrink-0">
            <div className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-green-400' : 'text-green-600'}`}>
              {allUsers.filter(u => u.status === 'active').length}
            </div>
            <div className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Active</div>
          </div>

          {/* LOGOUT BUTTON */}
          <button
            onClick={() => {
              clearAuthTokens();
              window.location.href = '/';
            }}
            className={`ml-2 sm:ml-4 px-4 py-2.5 rounded-xl border flex items-center gap-2 font-bold text-xs sm:text-sm transition-all shrink-0 active:scale-95 shadow-sm
              ${isDark
                ? 'border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/30'
                : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-300'
              }`}>
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* --- TABS & SEARCH --- */}
      <div className={`relative z-10 shrink-0 flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 sm:p-6 lg:px-8 border-b backdrop-blur-md
          ${isDark ? 'bg-slate-900/50 border-white/5' : 'bg-white/50 border-slate-200'}`}>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 sm:gap-3 py-2 pr-2 shrink-0 w-full lg:w-auto">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-sm transition-all duration-300 flex items-center gap-2 shrink-0 border-2 active:scale-[0.98] ${activeTab === 'users'
              ? (isDark
                ? 'bg-blue-600/20 border-blue-500/50 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                : 'bg-white border-blue-500 text-blue-700 shadow-sm')
              : (isDark
                ? 'bg-transparent border-transparent text-slate-400 hover:bg-white/5'
                : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900')
              }`}
          >
            <User className="w-4 h-4" />
            <span>All Users</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-sm transition-all duration-300 flex items-center gap-2 relative shrink-0 border-2 active:scale-[0.98] ${activeTab === 'reports'
              ? (isDark
                ? 'bg-blue-600/20 border-blue-500/50 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                : 'bg-white border-blue-500 text-blue-700 shadow-sm')
              : (isDark
                ? 'bg-transparent border-transparent text-slate-400 hover:bg-white/5'
                : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900')
              }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Pending Reports</span>
            {pendingCount > 0 && (
              <span className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center text-white shadow-md
                ${isDark ? 'bg-red-500 shadow-red-500/50 border-2 border-slate-900' : 'bg-red-500 shadow-red-500/30 border-2 border-white'}`}>
                {pendingCount}
              </span>
            )}
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full lg:w-80 shrink-0">
          <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 transition-colors ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === 'users' ? "Search users..." : "Search report ID..."}
            className={`w-full border-2 rounded-xl pl-11 pr-4 py-2.5 sm:py-3 text-sm font-medium focus:outline-none transition-all duration-300 focus:ring-4
                ${isDark
                ? 'bg-slate-900/50 border-white/10 text-white placeholder-slate-500 focus:border-blue-500 focus:bg-slate-800 focus:ring-blue-500/20'
                : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-400 focus:ring-blue-500/10'
              }`}
          />
        </div>
      </div>

      {/* --- TABLE CONTENT --- */}
      {/* FIXED: The flex-1 min-h-0 wrapper forces the internal container to scroll its own contents instead of overflowing the page */}
      <div className="flex-1 min-h-0 overflow-auto relative z-10 no-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-4">
            <Loader2 className={`w-8 h-8 animate-spin ${isDark ? 'text-blue-500' : 'text-blue-600'}`} />
            <div className={`text-sm font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading database...</div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-3 text-center px-4">
            <div className={`p-4 rounded-full ${isDark ? 'bg-red-500/10' : 'bg-red-50'}`}>
              <AlertTriangle className={`w-8 h-8 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
            </div>
            <div className={`font-bold ${isDark ? 'text-red-400' : 'text-red-600'}`}>{error}</div>
          </div>
        ) : currentData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-4 text-center px-4 animate-in fade-in zoom-in-95 duration-500">
            <div className={`p-5 rounded-[2rem] border-2 border-dashed ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'}`}>
              <Search className={`w-8 h-8 mx-auto mb-3 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
              <div className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                No {activeTab === 'users' ? 'users' : 'reports'} found.
              </div>
              <p className={`text-sm mt-1 font-medium ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                Try adjusting your search criteria.
              </p>
            </div>
          </div>
        ) : (
          /* FIXED: Min-width ensures table columns never squish, triggering horizontal scroll on mobile */
          <div className="min-w-[900px] w-full">
            <table className="w-full text-left border-collapse">
              <thead className={`sticky top-0 z-20 backdrop-blur-xl ${isDark ? 'bg-slate-900/90 border-b border-white/10' : 'bg-white/90 border-b border-slate-200 shadow-sm'}`}>
                <tr>
                  {headers.map((h, i) => (
                    <th key={i} className={`px-4 sm:px-6 lg:px-8 py-4 sm:py-5 text-xs font-black uppercase tracking-wider
                        ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-100'}`}>
                {currentData.map((item, idx) => (
                  <tr key={idx} className={`group transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>

                    {/* Column 1: ID */}
                    <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-sm
                          ${isDark
                            ? 'bg-slate-800 text-slate-300 border border-white/5'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                          {item.col1.slice(0, 2).toUpperCase()}
                        </div>
                        <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.col1}</span>
                      </div>
                    </td>

                    {/* Column 2: Email / Reported User */}
                    <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
                      <span className={`font-semibold text-sm ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{item.col2}</span>
                    </td>

                    {/* Column 3: Reports / Reason */}
                    <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
                      {activeTab === 'users' ? (
                        <span className={`font-black text-base px-3 py-1 rounded-lg ${Number(item.col3) > 5 ? (isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600') : (isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600')}`}>{item.col3}</span>
                      ) : (
                        <span className={`text-sm font-semibold italic ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>"{item.col3}"</span>
                      )}
                    </td>

                    {/* Column 4: Rating (only for users) */}
                    {activeTab === 'users' ? (
                      <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
                        <div className="flex items-center gap-1.5 bg-slate-900/40 dark:bg-black/20 w-fit px-2 py-1 rounded-lg border border-transparent dark:border-white/5">
                          <span className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{Number(item.col4).toFixed(1)}</span>
                          <span className="text-yellow-500 text-sm">★</span>
                        </div>
                      </td>
                    ) : (
                      <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5"></td>
                    )}

                    {/* Column 5: Status */}
                    <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
                      <span
                        className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider border shadow-sm
                          ${item.status === 'active' || item.status === 'Resolved'
                            ? (isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200')
                            : (item.status === 'flagged' || item.status === 'Pending'
                              ? (isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200')
                              : (isDark ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-50 text-red-700 border-red-200'))
                          }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full mr-2 
                          ${item.status === 'active' || item.status === 'Resolved' ? 'bg-emerald-500' : (item.status === 'flagged' || item.status === 'Pending' ? 'bg-amber-500 animate-pulse' : 'bg-red-500')}`}
                        />
                        {item.status}
                      </span>
                    </td>

                    {/* Column 6: Action */}
                    <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
                      <div className="flex items-center justify-start gap-2 sm:gap-3">
                        {activeTab === 'users' ? (
                          <button
                            onClick={() => handleToggleBan(item.id, item.status)}
                            className={`px-4 py-2 rounded-xl bg-transparent border-2 text-xs font-black transition-all duration-300 active:scale-95 flex items-center gap-2 ${item.status === 'banned'
                              ? (isDark ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300')
                              : (isDark ? 'border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500' : 'border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300')
                              }`}>
                            <Ban className="w-3.5 h-3.5" />
                            <span>{item.status === 'banned' ? 'Unban' : 'Ban'}</span>
                          </button>
                        ) : (
                          item.status === 'Pending' ? (
                            <>
                              <button
                                onClick={() => {
                                  setConfirmModal({
                                    isOpen: true,
                                    title: 'Ban User',
                                    message: 'Are you sure you want to permanently ban this user? This will also resolve the report.',
                                    actionLabel: 'Ban & Resolve',
                                    isDanger: true,
                                    onConfirm: async () => {
                                      setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                      await handlePerformToggleBan(item.targetId, 'active');
                                      try {
                                        await fetchJsonWithAuth(`/api/admin/reports/${item.id}`, { method: 'PATCH', headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: 'Resolved' }) });
                                        setReports(prev => prev.map(r => r.id === item.id ? { ...r, status: 'Resolved' } : r));
                                      } catch (e) { }
                                    }
                                  });
                                }}
                                className={`px-4 py-2 rounded-xl bg-transparent border-2 text-xs font-black transition-all duration-300 active:scale-95 flex items-center gap-1.5
                                  ${isDark ? 'border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500' : 'border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300'}`}>
                                <Ban className="w-3.5 h-3.5" />
                                <span>Ban</span>
                              </button>
                              <button
                                onClick={() => handleReportDismiss(item.id)}
                                className={`px-4 py-2 rounded-xl bg-transparent border-2 text-xs font-black transition-all duration-300 active:scale-95 flex items-center gap-1.5
                                  ${isDark ? 'border-slate-500/40 text-slate-300 hover:bg-slate-800 hover:border-slate-500' : 'border-slate-300 text-slate-600 hover:bg-slate-100 hover:border-slate-400'}`}>
                                <X className="w-3.5 h-3.5" />
                                <span>Ignore</span>
                              </button>
                            </>
                          ) : (
                            <span className={`text-xs font-bold px-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{item.status === 'Dismissed' ? 'Ignored' : 'Resolved'}</span>
                          )
                        )}
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CONFIRMATION MODAL */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          {/* Backdrop */}
          <div className={`absolute inset-0 backdrop-blur-sm transition-opacity ${isDark ? 'bg-slate-950/80' : 'bg-slate-900/40'}`}
            onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}></div>

          {/* Modal */}
          <div className={`relative w-full max-w-md p-6 sm:p-8 rounded-[2rem] shadow-2xl animate-in zoom-in-95 duration-300
                ${isDark ? 'bg-[#0F172A] border border-white/10 shadow-black/50' : 'bg-white border border-slate-200 shadow-xl'}`}>

            <h3 className={`font-black text-xl sm:text-2xl mb-3 flex items-center gap-3 ${confirmModal.isDanger ? (isDark ? 'text-red-400' : 'text-red-600') : (isDark ? 'text-white' : 'text-slate-900')}`}>
              {confirmModal.isDanger && <AlertTriangle className="w-6 h-6 animate-pulse" />}
              {confirmModal.title}
            </h3>

            <p className={`text-sm sm:text-base leading-relaxed mb-8 font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {confirmModal.message}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                onClick={confirmModal.onConfirm}
                className={`w-full sm:flex-[1.5] py-3.5 sm:py-4 rounded-xl font-black text-white text-sm sm:text-base transition-all shadow-lg hover:-translate-y-0.5 active:translate-y-0
                    ${confirmModal.isDanger
                    ? 'bg-gradient-to-r from-red-600 to-red-500 shadow-red-600/20'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-500 shadow-blue-500/20'}`}>
                {confirmModal.actionLabel}
              </button>
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className={`w-full sm:flex-1 py-3.5 sm:py-4 rounded-xl font-bold text-sm sm:text-base transition-all border-2
                    ${isDark ? 'border-white/10 text-white/70 hover:bg-white/10 hover:text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 bg-white'}`}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}