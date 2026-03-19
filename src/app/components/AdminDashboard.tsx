import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, User, Ban, Search, LogOut } from 'lucide-react';
import { useThemeColors } from '@/app/hooks/useThemeColors';
import { useTheme } from '@/app/contexts/ThemeContext';
import { ApiError, clearAuthTokens, fetchJsonWithAuth } from '@/services/auth';

// Shape of each user returned by the backend
interface BackendUser {
  id: number;
  userId: string;
  email: string;
  totalReports: number;
  rating: number;
  status: string;
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
    // Keep the previous UX of sending users to login for admin credentials.
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
  const allUsers = users.map((u) => ({
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
          <button 
              onClick={() => {
                  clearAuthTokens();
                  window.location.href = '/';
              }}
              className={`ml-4 px-4 py-2 rounded-xl border flex items-center gap-2 font-bold text-sm transition-all
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
            className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center gap-2 ${activeTab === 'users'
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
            className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center gap-2 relative ${activeTab === 'reports'
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
            {pendingCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full text-xs font-bold flex items-center justify-center text-white shadow-[0_0_15px_rgba(239,68,68,0.8)]">
                {pendingCount}
              </span>
            )}
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
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className={`text-lg font-semibold ${isDark ? 'text-white/60' : 'text-slate-400'}`}>Loading data...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-red-500 font-semibold text-lg">{error}</div>
          </div>
        ) : currentData.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className={`text-lg font-semibold ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
              No {activeTab === 'users' ? 'users' : 'reports'} found.
            </div>
          </div>
        ) : (
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

                  {/* Column 3: Reports / Reason */}
                  <td className="px-8 py-5">
                    {activeTab === 'users' ? (
                      <span className={`font-bold text-lg text-red-500`}>{item.col3}</span>
                    ) : (
                      <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{item.col3}</span>
                    )}
                  </td>

                  {/* Column 4: Rating (only for users) */}
                  {activeTab === 'users' ? (
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-800'}`}>{item.col4}</span>
                        <span className="text-yellow-500">★</span>
                      </div>
                    </td>
                  ) : (
                    <td className="px-8 py-5"></td>
                  )}

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

                  {/* Column 5: Action */}
                  <td className="px-8 py-5">
                    <div className="flex items-center justify-start gap-2">
                      {activeTab === 'users' ? (
                        <button
                          onClick={() => handleToggleBan(item.id, item.status)}
                          className={`group/btn px-5 py-2.5 rounded-xl bg-transparent border-2 text-sm font-bold transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] flex items-center gap-2 ${item.status === 'banned'
                              ? 'border-green-500/60 text-green-400 hover:bg-green-500/10 hover:border-green-500 hover:text-green-300'
                              : 'border-red-500/60 text-red-400 hover:bg-red-500/10 hover:border-red-500 hover:text-red-300 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                            }`}>
                          <Ban className="w-4 h-4" />
                          <span>{item.status === 'banned' ? 'Unban User' : 'Block User'}</span>
                        </button>
                      ) : (
                        item.status === 'Pending' ? (
                          <>
                            <button
                              onClick={() => {
                                setConfirmModal({
                                  isOpen: true,
                                  title: 'Ban User',
                                  message: 'Are you sure you want to ban this user? This will also resolve the report.',
                                  actionLabel: 'Ban User',
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
                              className="group/btn px-3 py-2 rounded-xl bg-transparent border-2 border-red-500/60 text-red-400 hover:bg-red-500/10 hover:border-red-500 hover:text-red-300 text-xs font-bold transition-all flex items-center gap-1">
                              <Ban className="w-3 h-3" />
                              <span>Ban User</span>
                            </button>
                            <button
                              onClick={() => handleReportDismiss(item.id)}
                              className={`group/btn px-3 py-2 rounded-xl bg-transparent border-2 text-xs font-bold transition-all flex items-center gap-1 ${isDark ? 'border-slate-500/60 text-slate-400 hover:bg-slate-500/10 hover:border-slate-400 hover:text-slate-300' : 'border-slate-300 text-slate-500 hover:bg-slate-100 hover:border-slate-400 hover:text-slate-700'}`}>
                              <span>Ignore</span>
                            </button>
                          </>
                        ) : (
                          <span className="text-sm font-bold text-slate-500 px-3">{item.status === 'Dismissed' ? 'Ignored' : 'Resolved'}</span>
                        )
                      )}
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* CONFIRMATION MODAL */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop */}
          <div className={`absolute inset-0 backdrop-blur-sm transition-opacity ${isDark ? 'bg-slate-900/80' : 'bg-slate-500/50'}`}
            onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}></div>

          {/* Modal */}
          <div className={`relative w-full max-w-md p-8 rounded-[2rem] shadow-2xl animate-in fade-in zoom-in-95 duration-300
                ${isDark ? 'bg-[#1E293B] border border-slate-700 shadow-black/50' : 'bg-white border text-slate-900 shadow-xl'}`}>

            <h3 className={`font-black text-2xl mb-4 flex items-center gap-3 ${confirmModal.isDanger ? (isDark ? 'text-red-400' : 'text-red-600') : (isDark ? 'text-white' : 'text-slate-900')}`}>
              {confirmModal.isDanger && <AlertTriangle className="w-6 h-6 animate-pulse" />}
              {confirmModal.title}
            </h3>

            <p className={`text-base leading-relaxed mb-8 font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {confirmModal.message}
            </p>

            <div className="flex gap-4">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className={`flex-1 py-3.5 rounded-xl font-bold transition-all border-2
                            ${isDark ? 'border-white/10 text-white/70 hover:bg-white/5 hover:text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className={`flex-[1.5] py-3.5 rounded-xl font-black text-white transition-all shadow-lg hover:-translate-y-0.5 active:translate-y-0
                            ${confirmModal.isDanger
                    ? 'bg-gradient-to-r from-red-600 to-red-500 hover:shadow-red-500/20'
                    : 'bg-gradient-to-r from-slate-700 to-slate-600 hover:shadow-slate-500/20'}`}>
                {confirmModal.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
