import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  MessageSquareText,
  Video,
  User,
  ShieldCheck,
  LogOut,
  ChevronRight,
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
  Check,
  X,
  ArrowLeft,
  Send,
  Clock,
  XCircle,
  CheckCircle2,
  AlertCircle,
  Info,
} from "lucide-react";
import { useThemeColors } from "@/app/hooks/useThemeColors";
import { useTheme } from "@/app/contexts/ThemeContext";
import { authFetch, clearAuthTokens } from "@/services/auth";

// ─── Toast System ──────────────────────────────────────
type ToastType = "success" | "error" | "info";
interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}
let _toastId = 0;

function ToastContainer({ toasts, isDark }: { toasts: ToastItem[]; isDark: boolean }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map((t) => {
        const Icon =
          t.type === "success" ? CheckCircle2 : t.type === "error" ? XCircle : Info;
        const colorCls =
          t.type === "success"
            ? isDark
              ? "bg-emerald-900/80 border-emerald-500/30 text-emerald-200 shadow-emerald-900/40"
              : "bg-emerald-50 border-emerald-200 text-emerald-800 shadow-emerald-200"
            : t.type === "error"
            ? isDark
              ? "bg-red-900/80 border-red-500/30 text-red-200 shadow-red-900/40"
              : "bg-red-50 border-red-200 text-red-800 shadow-red-200"
            : isDark
            ? "bg-blue-900/80 border-blue-500/30 text-blue-200 shadow-blue-900/40"
            : "bg-blue-50 border-blue-200 text-blue-800 shadow-blue-200";
        const iconCls =
          t.type === "success"
            ? "text-emerald-500"
            : t.type === "error"
            ? "text-red-500"
            : "text-blue-500";
        return (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl text-sm font-semibold pointer-events-auto
              animate-in slide-in-from-right-5 fade-in duration-300 ${colorCls}`}
          >
            <Icon className={`w-5 h-5 shrink-0 ${iconCls}`} />
            <span>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Component ──────────────────────────────────────────
export function ChatRequestsDashboard() {
  const colors = useThemeColors();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("requests");
  const [user, setUser] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  // ── Incoming requests
  const [requests, setRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState<string | null>(null);

  // ── Sent requests
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [sentLoading, setSentLoading] = useState(true);
  const [sentError, setSentError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | string | null>(null);

  // ── Toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const showToast = (message: string, type: ToastType = "info") => {
    const id = ++_toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  };

  // ─── Click outside for header menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setHeaderMenuOpen(false);
      }
    };
    if (headerMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [headerMenuOpen]);

  // ─── Fetch profile
  useEffect(() => {
    const fetchProfile = async () => {
      setProfileLoading(true);
      try {
        const res = await authFetch("/api/users/profile", { method: "GET" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) { setUser(null); return; }
        setUser(json.data?.user || null);
      } catch { setUser(null); }
      finally { setProfileLoading(false); }
    };
    fetchProfile();
  }, []);

  // ─── Fetch incoming requests
  useEffect(() => {
    const fetchIncoming = async () => {
      setRequestsLoading(true);
      setRequestsError(null);
      try {
        const res = await authFetch("/api/requests/incoming", { method: "GET" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) { setRequestsError(json?.message || "Failed to fetch incoming requests."); setRequests([]); return; }
        const list =
          (Array.isArray(json?.data?.requests) && json.data.requests) ||
          (Array.isArray(json?.data) && json.data) ||
          (Array.isArray(json?.requests) && json.requests) || [];
        setRequests(list);
      } catch {
        setRequestsError("Failed to fetch incoming requests.");
        setRequests([]);
      } finally { setRequestsLoading(false); }
    };
    fetchIncoming();
  }, []);

  // ─── Fetch sent requests
  useEffect(() => {
    const fetchSent = async () => {
      setSentLoading(true);
      setSentError(null);
      try {
        const res = await authFetch("/api/requests/sent", { method: "GET" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) { setSentError(json?.message || "Failed to fetch sent requests."); setSentRequests([]); return; }
        const list =
          (Array.isArray(json?.data?.requests) && json.data.requests) ||
          (Array.isArray(json?.data) && json.data) ||
          (Array.isArray(json?.requests) && json.requests) || [];
        setSentRequests(list);
      } catch {
        setSentError("Failed to fetch sent requests.");
        setSentRequests([]);
      } finally { setSentLoading(false); }
    };
    fetchSent();
  }, []);

  // ─── Accept
  const handleAccept = async (id: number | string) => {
    try {
      const res = await authFetch(`/api/requests/${id}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        showToast(`Failed to connect: ${json.message || "Server error"}`, "error");
        return;
      }
      setRequests((prev) => prev.filter((r) => (r.id || r._id) !== id));
      showToast("Connection accepted! 🎉", "success");
      if (json.data?.chatId) navigate("/chat");
    } catch {
      showToast("A network error occurred while trying to connect.", "error");
    }
  };

  // ─── Reject
  const handleReject = async (id: number | string) => {
    try {
      const res = await authFetch(`/api/requests/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        showToast(`Failed to decline: ${json.message || "Server error"}`, "error");
        return;
      }
      setRequests((prev) => prev.filter((r) => (r.id || r._id) !== id));
      showToast("Request declined.", "info");
    } catch {
      showToast("A network error occurred while trying to decline.", "error");
    }
  };

  // ─── Cancel sent
  const handleCancelSent = async (id: number | string) => {
    setCancellingId(id);
    try {
      const res = await authFetch(`/api/requests/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        showToast(`Failed to cancel: ${json.message || "Server error"}`, "error");
        return;
      }
      setSentRequests((prev) => prev.filter((r) => (r.id || r._id) !== id));
      showToast("Request withdrawn.", "info");
    } catch {
      showToast("A network error occurred.", "error");
    } finally {
      setCancellingId(null);
    }
  };

  const displayName = useMemo(() => {
    if (!user) return "User";
    const dn = (user.display_name || user.displayName || "").trim();
    if (dn) return dn;
    const email = (user.email || "").trim();
    if (email.includes("@")) return email.split("@")[0];
    return email || "User";
  }, [user]);

  const avatarLetter = useMemo(() => (displayName?.charAt(0) || "U").toUpperCase(), [displayName]);

  const logout = () => { clearAuthTokens(); window.location.href = "/"; };

  const navItems = [
    { id: "requests", label: "Connection Requests", icon: Users, count: requests.length || 0 },
    { id: "chats", label: "Active Chats", icon: MessageSquareText, count: 0 },
    { id: "people", label: "Active Users", icon: Users, count: 0 },
    { id: "match", label: "Start Matching", icon: Video, count: 0 },
  ];

  return (
    <div className={`w-full min-h-screen flex overflow-hidden transition-colors duration-500 ${isDark ? "bg-slate-950" : "bg-slate-50"}`}>
      <ToastContainer toasts={toasts} isDark={isDark} />

      {/* --- LEFT SIDEBAR --- */}
      <div className={`${sidebarOpen ? "w-80" : "w-24"} shrink-0 flex flex-col border-r relative z-20 transition-all duration-300
          ${isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-200"}`}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className={`absolute -top-20 -left-16 w-56 h-56 rounded-full blur-3xl opacity-20 ${isDark ? "bg-blue-600" : "bg-blue-200"}`} />
          <div className={`absolute bottom-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20 ${isDark ? "bg-purple-600" : "bg-purple-200"}`} />
        </div>

        {/* Logo */}
        <div className={`h-24 flex items-center relative z-10 ${sidebarOpen ? "px-8" : "justify-center px-2"}`}>
          {sidebarOpen ? (
            <div>
              <h2 className="text-2xl font-black tracking-tight">
                <span className={isDark ? "text-white" : "text-slate-900"}>Incogn</span>
                <span className="text-blue-500">IIT</span>
                <span className={isDark ? "text-white" : "text-slate-900"}>o</span>
              </h2>
              <p className={`text-xs mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>IITK anonymous network</p>
            </div>
          ) : (
            <h2 className="text-2xl font-black tracking-tight">
              <span className={isDark ? "text-white" : "text-slate-900"}>I</span>
              <span className="text-blue-500">IIT</span>
            </h2>
          )}
        </div>

        {/* Profile card */}
        <div className={`relative z-10 ${sidebarOpen ? "px-4 pb-4" : "px-3 pb-4"}`}>
          <div className={`rounded-2xl border transition-colors ${isDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"} ${sidebarOpen ? "p-4" : "p-3"}`}>
            <div className={`flex items-center ${sidebarOpen ? "gap-3" : "justify-center"}`}>
              {user?.avatarUrl || user?.avatar_url || user?.avatar ? (
                <img src={user?.avatarUrl || user?.avatar_url || user?.avatar} alt="Profile" className="w-12 h-12 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-base shrink-0">
                  {profileLoading ? "…" : avatarLetter}
                </div>
              )}
              {sidebarOpen && (
                <div className="min-w-0">
                  <p className={`font-bold truncate ${isDark ? "text-white" : "text-slate-900"}`}>{profileLoading ? "Loading..." : displayName}</p>
                  <p className="text-xs text-blue-500 font-semibold">Verified IITK</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2 relative z-10">
          <button
            onClick={() => navigate("/homepage")}
            className={`w-full flex items-center ${sidebarOpen ? "justify-between px-4" : "justify-center px-2"} py-4 rounded-xl transition-all duration-300 group
              ${activeTab === "home"
                ? isDark ? "bg-gradient-to-r from-blue-600/20 to-blue-500/10 border border-blue-500/30 text-white" : "bg-blue-50 border border-blue-200 text-blue-700"
                : isDark ? "text-slate-400 hover:bg-white/5 hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <LayoutGrid className={`w-5 h-5 shrink-0 ${activeTab === "home" ? "text-blue-500" : ""}`} />
              {sidebarOpen && <span className="font-medium truncate">Overview</span>}
            </div>
          </button>

          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === "people") { navigate("/active-users"); return; }
                if (item.id === "requests") { navigate("/requests"); return; }
                if (item.id === "chats") { navigate("/chat"); return; }
                if (item.id === "match") { navigate("/homepage"); return; }
                setActiveTab(item.id);
              }}
              className={`w-full flex items-center ${sidebarOpen ? "justify-between px-4" : "justify-center px-2"} py-4 rounded-xl transition-all duration-300 group
                ${activeTab === item.id
                  ? isDark ? "bg-gradient-to-r from-blue-600/20 to-blue-500/10 border border-blue-500/30 text-white" : "bg-blue-50 border border-blue-200 text-blue-700"
                  : isDark ? "text-slate-400 hover:bg-white/5 hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <item.icon className={`w-5 h-5 shrink-0 ${activeTab === item.id ? "text-blue-500" : ""}`} />
                {sidebarOpen && <span className="font-medium truncate">{item.label}</span>}
              </div>
              {sidebarOpen && (item.count > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-500/30">{item.count}</span>
              ) : (
                <ChevronRight className={`w-4 h-4 ${isDark ? "text-slate-600" : "text-slate-400"}`} />
              ))}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className={`p-4 border-t relative z-10 space-y-2 ${isDark ? "border-white/10" : "border-slate-200"}`}>
          <button
            onClick={() => navigate("/homepage")}
            className={`w-full py-3.5 rounded-xl font-bold flex items-center ${sidebarOpen ? "justify-center gap-2 px-4" : "justify-center px-2"} border-2 transition-colors
              ${isDark ? "border-blue-500/20 text-blue-300 hover:bg-blue-500/10" : "border-blue-100 text-blue-700 hover:bg-blue-50 hover:border-blue-200"}`}
          >
            {sidebarOpen ? <><ArrowLeft className="w-4 h-4" /><span>Back to Home</span></> : <ArrowLeft className="w-4 h-4" />}
          </button>
          <button
            onClick={logout}
            className={`w-full rounded-xl py-3 flex items-center ${sidebarOpen ? "justify-center gap-2 px-4" : "justify-center px-2"} font-semibold transition-all
              ${isDark ? "bg-white/5 hover:bg-white/10 text-red-400" : "bg-slate-100 hover:bg-slate-200 text-red-600"}`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {sidebarOpen && <span>Log Out</span>}
          </button>
        </div>
      </div>

      {/* --- RIGHT CONTENT --- */}
      <div className="flex-1 flex flex-col relative overflow-hidden isolate">
        {/* Ambient bg */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className={`absolute top-[-120px] right-[-120px] w-[520px] h-[520px] rounded-full blur-[120px] opacity-20 ${isDark ? "bg-blue-600/30" : "bg-blue-200"}`} />
          <div className={`absolute bottom-[-100px] left-[10%] w-[420px] h-[420px] rounded-full blur-[110px] opacity-20 ${isDark ? "bg-purple-600/20" : "bg-purple-200"}`} />
        </div>

        {/* Header */}
        <div className={`h-24 px-10 flex items-center justify-between z-30 border-b backdrop-blur-sm
            ${isDark ? "bg-slate-900/60 border-white/10" : "bg-white/70 border-slate-200"}`}>
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => setSidebarOpen((prev) => !prev)}
              className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all shrink-0
                ${isDark ? "bg-white/5 border-white/10 text-white hover:bg-white/10" : "bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100"}`}
            >
              {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
            </button>
            <div>
              <h3 className={`text-3xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>Connection Requests</h3>
              <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Review and manage your connection requests.</p>
            </div>
          </div>

          {/* Profile dropdown */}
          <div className="relative z-[100]" ref={menuRef}>
            <button
              onClick={() => setHeaderMenuOpen(!headerMenuOpen)}
              className={`w-14 h-14 rounded-full ring-2 ring-offset-2 transition-all focus:outline-none flex items-center justify-center shadow-lg
                ${isDark ? "ring-offset-slate-900 ring-transparent hover:ring-blue-500" : "ring-offset-white ring-transparent hover:ring-blue-400"}`}
            >
              {user?.avatarUrl || user?.avatar_url || user?.avatar ? (
                <img src={user?.avatarUrl || user?.avatar_url || user?.avatar} alt="Profile" className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                  {profileLoading ? "…" : avatarLetter}
                </div>
              )}
            </button>

            {headerMenuOpen && (
              <div className={`absolute right-0 mt-4 w-80 rounded-3xl shadow-2xl border overflow-hidden z-[200] transition-all transform origin-top-right
                  ${isDark ? "bg-slate-800 border-white/10 shadow-black/50" : "bg-white border-slate-200 shadow-2xl"}`}>
                <div className={`p-8 border-b flex flex-col items-center ${isDark ? "border-white/10" : "border-slate-100"}`}>
                  <div className={`w-40 h-40 rounded-full mb-6 shadow-lg ring-4 ${isDark ? "ring-slate-700" : "ring-slate-50"}`}>
                    {user?.avatarUrl || user?.avatar_url || user?.avatar ? (
                      <img src={user?.avatarUrl || user?.avatar_url || user?.avatar} alt="Profile" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-6xl">
                        {avatarLetter}
                      </div>
                    )}
                  </div>
                  <p className={`font-extrabold text-xl text-center truncate w-full ${isDark ? "text-white" : "text-slate-900"}`}>{displayName}</p>
                  <p className={`text-base text-center truncate w-full mt-2 mb-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>{user?.email || "Verified IITK User"}</p>
                </div>
                <div className="p-4 space-y-3">
                  <button onClick={() => { setHeaderMenuOpen(false); navigate("/profile"); }}
                    className={`w-full flex items-center justify-center gap-3 px-4 py-4 rounded-xl text-base font-semibold transition-colors
                      ${isDark ? "hover:bg-white/10 text-white" : "hover:bg-slate-50 text-slate-800"}`}>
                    <User className="w-5 h-5 text-blue-500" /> Edit Profile
                  </button>
                  <button onClick={() => { setHeaderMenuOpen(false); logout(); }}
                    className={`w-full flex items-center justify-center gap-3 px-4 py-4 rounded-xl text-base font-semibold transition-colors
                      ${isDark ? "hover:bg-white/10 text-red-400" : "hover:bg-red-50 text-red-600"}`}>
                    <LogOut className="w-5 h-5" /> Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-10 relative z-10 space-y-8">

          {/* ══ INCOMING REQUESTS ═══════════════════════════════════════════ */}
          <div className={`rounded-3xl border p-8 transition-colors ${isDark ? "bg-slate-900/40 border-white/10" : "bg-white border-slate-200"}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? "bg-blue-500/20" : "bg-blue-100"}`}>
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h1 className={`text-2xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>Incoming Requests</h1>
                <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Review incoming requests with shared interests and match score. Accept to start an anonymous chat, or decline to skip.
                </p>
              </div>
              {requests.length > 0 && (
                <span className="ml-auto px-3 py-1 rounded-full bg-red-500 text-white text-sm font-bold shadow shadow-red-500/30">
                  {requests.length}
                </span>
              )}
            </div>

            {requestsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`rounded-2xl border p-5 animate-pulse ${isDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"}`}>
                    <div className={`h-12 w-12 rounded-2xl ${isDark ? "bg-white/10" : "bg-slate-200"}`} />
                    <div className={`h-5 w-40 rounded mt-4 ${isDark ? "bg-white/10" : "bg-slate-200"}`} />
                    <div className={`h-4 w-28 rounded mt-3 ${isDark ? "bg-white/10" : "bg-slate-200"}`} />
                    <div className={`h-20 w-full rounded mt-6 ${isDark ? "bg-white/10" : "bg-slate-200"}`} />
                  </div>
                ))}
              </div>
            ) : requestsError ? (
              <div className={`rounded-2xl border p-5 ${isDark ? "bg-red-500/10 border-red-500/30" : "bg-red-50 border-red-200"}`}>
                <p className={`text-sm font-semibold ${isDark ? "text-red-400" : "text-red-600"}`}>⚠️ {requestsError}</p>
              </div>
            ) : requests.length === 0 ? (
              <div className={`rounded-2xl border p-8 text-center ${isDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"}`}>
                <Users className={`w-10 h-10 mx-auto mb-4 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                <h3 className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>No incoming requests</h3>
                <p className={`text-sm mt-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>You don't have any connection requests right now.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {requests.map((request, index) => {
                  const reqName =
                    request?.sender_display_name ||
                    (request?.sender_email ? String(request.sender_email).split("@")[0] : null) ||
                    "Anonymous User";
                  const reqId = request?.id || request?._id || index;

                  return (
                    <div key={reqId} className="group relative bg-white dark:bg-[#0F172A] rounded-2xl p-5 border border-slate-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-500/50 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate(`/profile/${request.sender_id}`)}>
                          <div className="relative w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center border border-slate-200 dark:border-white/10 overflow-hidden">
                            {request.sender_avatar_url ? (
                              <img src={request.sender_avatar_url} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                              <ShieldCheck className="w-6 h-6 text-slate-400 dark:text-white/30" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-slate-900 dark:text-white font-bold text-sm truncate">{reqName}</h4>
                          </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                          <span className="text-2xl font-black text-green-600 dark:text-green-400">{request.matchScore || 0}%</span>
                          <span className="text-[10px] text-green-600/70 uppercase font-bold tracking-wider">Match</span>
                        </div>
                      </div>

                      <div className="mb-6 flex-1">
                        <p className="text-slate-400 dark:text-white/40 text-[10px] font-bold uppercase tracking-wider mb-2">Common Interests</p>
                        <div className="flex flex-wrap gap-2">
                          {(request.sharedTags || request.sharedInterests || []).map((tag: any, idx: number) => (
                            <span key={idx} className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-blue-900/20 border border-slate-200 dark:border-blue-500/20 text-slate-600 dark:text-blue-300 text-[10px] font-medium">{tag}</span>
                          ))}
                        </div>
                        {request.message && (
                          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 italic line-clamp-3">"{request.message}"</p>
                        )}
                      </div>

                      <div className="flex gap-3 mt-auto">
                        <button onClick={() => handleReject(reqId)}
                          className="flex-1 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-red-300 border border-slate-200 dark:border-red-500/20 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-50 hover:text-red-600 transition-all">
                          Decline
                        </button>
                        <button onClick={() => handleAccept(reqId)}
                          className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all flex items-center justify-center gap-2">
                          <Check className="w-4 h-4" /> Connect
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ══ SENT REQUESTS ════════════════════════════════════════════════ */}
          <div className={`rounded-3xl border p-8 transition-colors ${isDark ? "bg-slate-900/40 border-white/10" : "bg-white border-slate-200"}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? "bg-violet-500/20" : "bg-violet-100"}`}>
                <Send className="w-5 h-5 text-violet-500" />
              </div>
              <div>
                <h2 className={`text-2xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>Sent Requests</h2>
                <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Pending connection requests you've sent. Withdraw any at any time.
                </p>
              </div>
              {sentRequests.length > 0 && (
                <span className={`ml-auto px-3 py-1 rounded-full text-sm font-bold shadow ${isDark ? "bg-violet-500/20 text-violet-300" : "bg-violet-100 text-violet-700"}`}>
                  {sentRequests.length}
                </span>
              )}
            </div>

            {sentLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className={`rounded-2xl border p-4 animate-pulse flex items-center gap-4 ${isDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"}`}>
                    <div className={`h-10 w-10 rounded-xl shrink-0 ${isDark ? "bg-white/10" : "bg-slate-200"}`} />
                    <div className="flex-1 space-y-2">
                      <div className={`h-4 w-32 rounded ${isDark ? "bg-white/10" : "bg-slate-200"}`} />
                      <div className={`h-3 w-24 rounded ${isDark ? "bg-white/10" : "bg-slate-200"}`} />
                    </div>
                    <div className={`h-8 w-24 rounded-xl ${isDark ? "bg-white/10" : "bg-slate-200"}`} />
                  </div>
                ))}
              </div>
            ) : sentError ? (
              <div className={`rounded-2xl border p-5 ${isDark ? "bg-red-500/10 border-red-500/30" : "bg-red-50 border-red-200"}`}>
                <p className={`text-sm font-semibold ${isDark ? "text-red-400" : "text-red-600"}`}>⚠️ {sentError}</p>
              </div>
            ) : sentRequests.length === 0 ? (
              <div className={`rounded-2xl border p-8 text-center ${isDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"}`}>
                <Send className={`w-10 h-10 mx-auto mb-4 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                <h3 className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>No sent requests</h3>
                <p className={`text-sm mt-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  You haven't sent any pending connection requests yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sentRequests.map((req, index) => {
                  const rName =
                    req?.receiver_display_name ||
                    (req?.receiver_email ? String(req.receiver_email).split("@")[0] : null) ||
                    "Anonymous User";
                  const rId = req?.id || req?._id || index;
                  const isCancelling = cancellingId === rId;
                  const sentAt = req.created_at
                    ? new Date(req.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                    : null;

                  return (
                    <div key={rId}
                      className={`rounded-2xl border p-4 flex items-center gap-4 transition-all duration-300
                        ${isDark ? "bg-white/5 border-white/10 hover:border-white/20" : "bg-slate-50 border-slate-200 hover:border-slate-300"}`}>
                      {/* Avatar placeholder */}
                      <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center font-bold text-base
                        ${isDark ? "bg-violet-500/20 text-violet-300" : "bg-violet-100 text-violet-700"}`}>
                        {rName.charAt(0).toUpperCase()}
                      </div>

                      {/* Name + time */}
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-sm truncate ${isDark ? "text-white" : "text-slate-900"}`}>{rName}</p>
                        {sentAt && (
                          <p className={`text-xs flex items-center gap-1 mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                            <Clock className="w-3 h-3" /> {sentAt}
                          </p>
                        )}
                      </div>

                      {/* Status badge */}
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0
                        ${isDark ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                        Pending
                      </span>

                      {/* Withdraw button */}
                      <button
                        onClick={() => handleCancelSent(rId)}
                        disabled={isCancelling}
                        className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border
                          ${isDark
                            ? "border-red-500/20 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                            : "border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"}`}
                      >
                        {isCancelling ? (
                          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                        {isCancelling ? "Withdrawing…" : "Withdraw"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}