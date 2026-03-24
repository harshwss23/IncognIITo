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
  Menu
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle"; // Path check kar lena apne setup ke hisaab se
import { useThemeColors } from "@/app/hooks/useThemeColors";
import { useTheme } from "@/app/contexts/ThemeContext";
import { authFetch, clearAuthTokens } from "@/services/auth";
import { useGlobalCleanUp } from "../hooks/useGlobalCleanup";

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
    <div className="fixed top-4 left-4 right-4 sm:left-auto sm:top-6 sm:right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map((t) => {
        const Icon = t.type === "success" ? CheckCircle2 : t.type === "error" ? XCircle : Info;
        const colorCls =
          t.type === "success"
            ? isDark
              ? "bg-emerald-900/90 border-emerald-500/30 text-emerald-200 shadow-emerald-900/40"
              : "bg-emerald-50/95 border-emerald-200 text-emerald-800 shadow-emerald-100"
            : t.type === "error"
              ? isDark
                ? "bg-red-900/90 border-red-500/30 text-red-200 shadow-red-900/40"
                : "bg-red-50/95 border-red-200 text-red-800 shadow-red-100"
              : isDark
                ? "bg-blue-900/90 border-blue-500/30 text-blue-200 shadow-blue-900/40"
                : "bg-blue-50/95 border-blue-200 text-blue-800 shadow-blue-100";
        const iconCls =
          t.type === "success" ? "text-emerald-500" : t.type === "error" ? "text-red-500" : "text-blue-500";
        return (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4 rounded-2xl shadow-2xl border backdrop-blur-xl text-sm font-semibold pointer-events-auto
              animate-in slide-in-from-top-4 sm:slide-in-from-right-4 fade-in duration-300 ${colorCls}`}
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

  // Sidebar Hover & Pin Logic
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile ke liye default false
  const [isHovered, setIsHovered] = useState(false); // Desktop hover logic
  const isExpanded = sidebarOpen || isHovered;

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
    <div className={`w-full h-[100dvh] flex overflow-hidden transition-colors duration-500 relative ${isDark ? "bg-slate-950" : "bg-slate-50"}`}>
      <ToastContainer toasts={toasts} isDark={isDark} />

      {/* --- MOBILE SIDEBAR BACKDROP --- */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* --- LEFT SIDEBAR (HOVER TO EXPAND) --- */}
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed lg:relative inset-y-0 left-0 shrink-0 flex flex-col border-r z-50 transition-all duration-300 ease-in-out
          ${isExpanded
            ? 'w-[280px] lg:w-[320px] translate-x-0'
            : 'w-[280px] lg:w-[100px] -translate-x-full lg:translate-x-0'}
          ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200 shadow-2xl lg:shadow-none'}`}
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className={`absolute -top-20 -left-16 w-56 h-56 rounded-full blur-3xl opacity-20 ${isDark ? "bg-blue-600" : "bg-blue-200"}`} />
          <div className={`absolute bottom-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20 ${isDark ? "bg-purple-600" : "bg-purple-200"}`} />
        </div>

        {/* Logo */}
        <div className={`h-16 md:h-20 lg:h-24 flex items-center justify-between relative z-10 shrink-0 border-b border-transparent transition-all duration-300 ${isExpanded ? "px-6 lg:px-8" : "justify-center px-2"}`}>
          {isExpanded ? (
            <div>
              <h2 className="text-xl lg:text-2xl font-black tracking-tight">
                <span className={isDark ? "text-white" : "text-slate-900"}>Incogn</span>
                <span className="text-blue-500">IIT</span>
                <span className={isDark ? "text-white" : "text-slate-900"}>o</span>
              </h2>
              <p className={`text-[10px] lg:text-xs mt-0.5 lg:mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>IITK anonymous network</p>
            </div>
          ) : (
            <h2 className="text-2xl font-black tracking-tight">
              <span className={isDark ? "text-white" : "text-slate-900"}>I</span>
              <span className="text-blue-500">IIT</span>
            </h2>
          )}
          {/* Mobile close button */}
          <button
            onClick={() => setSidebarOpen(false)}
            className={`lg:hidden p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile card */}
        <div className={`relative z-10 shrink-0 transition-all duration-300 ${isExpanded ? "px-4 pb-4" : "px-3 pb-4"}`}>
          <div className={`rounded-2xl border transition-colors ${isDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"} ${isExpanded ? "p-3 lg:p-4" : "p-3"}`}>
            <div className={`flex items-center ${isExpanded ? "gap-3" : "justify-center"}`}>
              {user?.avatarUrl || user?.avatar_url || user?.avatar ? (
                <img src={user?.avatarUrl || user?.avatar_url || user?.avatar} alt="Profile" className="w-10 h-10 lg:w-12 lg:h-12 rounded-full object-cover shrink-0 shadow-sm" />
              ) : (
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm lg:text-base shrink-0 shadow-sm">
                  {profileLoading ? "…" : avatarLetter}
                </div>
              )}
              {isExpanded && (
                <div className="min-w-0">
                  <p className={`font-bold text-sm lg:text-base truncate ${isDark ? "text-white" : "text-slate-900"}`}>{profileLoading ? "Loading..." : displayName}</p>
                  <p className="text-[10px] lg:text-xs text-blue-500 font-semibold truncate">Verified IITK</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 lg:px-4 space-y-1.5 lg:space-y-2 relative z-10 overflow-y-auto no-scrollbar">
          <button
            onClick={() => navigate("/homepage")}
            className={`w-full flex items-center ${isExpanded ? "justify-between px-4" : "justify-center px-2"} py-3 lg:py-4 rounded-xl transition-all duration-300 group
              ${activeTab === "home"
                ? isDark ? "bg-gradient-to-r from-blue-600/20 to-blue-500/10 border border-blue-500/30 text-white" : "bg-blue-50 border border-blue-200 text-blue-700"
                : isDark ? "border border-transparent text-slate-400 hover:bg-white/5 hover:text-white" : "border border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <LayoutGrid className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${activeTab === "home" ? "text-blue-500" : ""}`} />
              {isExpanded && <span className="font-semibold text-sm lg:text-base truncate">Overview</span>}
            </div>
          </button>

          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (window.innerWidth < 1024) setSidebarOpen(false);
                if (item.id === "people") { navigate("/active-users"); return; }
                if (item.id === "requests") { navigate("/requests"); return; }
                if (item.id === "chats") { navigate("/chat"); return; }
                if (item.id === "match") { navigate("/homepage"); return; }
                setActiveTab(item.id);
              }}
              className={`w-full flex items-center ${isExpanded ? "justify-between px-4" : "justify-center px-2"} py-3 lg:py-4 rounded-xl transition-all duration-300 group
                ${activeTab === item.id
                  ? isDark ? "bg-gradient-to-r from-blue-600/20 to-blue-500/10 border border-blue-500/30 text-white" : "bg-blue-50 border border-blue-200 text-blue-700"
                  : isDark ? "border border-transparent text-slate-400 hover:bg-white/5 hover:text-white" : "border border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <item.icon className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${activeTab === item.id ? "text-blue-500" : ""}`} />
                {isExpanded && <span className="font-semibold text-sm lg:text-base truncate">{item.label}</span>}
              </div>
              {isExpanded && (item.count > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] lg:text-xs font-bold shadow-lg shadow-red-500/30">{item.count}</span>
              ) : (
                <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${isDark ? "text-slate-600" : "text-slate-400"}`} />
              ))}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className={`p-4 border-t relative z-10 space-y-2 shrink-0 ${isDark ? "border-white/10" : "border-slate-200"}`}>
          <button
            onClick={() => navigate("/homepage")}
            className={`w-full py-3.5 rounded-xl font-bold flex items-center ${isExpanded ? "justify-center gap-2 px-4" : "justify-center px-2"} border-2 transition-colors text-sm lg:text-base
              ${isDark ? "border-blue-500/20 text-blue-300 hover:bg-blue-500/10" : "border-blue-100 text-blue-700 hover:bg-blue-50 hover:border-blue-200"}`}
          >
            {isExpanded ? <><ArrowLeft className="w-4 h-4" /><span className="truncate">Back to Home</span></> : <ArrowLeft className="w-4 h-4" />}
          </button>
          <button
            onClick={logout}
            className={`w-full rounded-xl py-3 flex items-center ${isExpanded ? "justify-center gap-2 px-4" : "justify-center px-2"} font-bold transition-all text-sm lg:text-base
              ${isDark ? "bg-white/5 hover:bg-white/10 text-red-400 hover:text-red-300" : "bg-slate-100 hover:bg-slate-200 text-red-600 hover:text-red-700"}`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {isExpanded && <span className="truncate">Log Out</span>}
          </button>
        </div>
      </div>

      {/* --- RIGHT CONTENT --- */}
      <div className="flex-1 flex flex-col relative min-w-0 isolate bg-transparent">
        {/* Ambient bg */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div className={`absolute top-[-10%] right-[-5%] w-[300px] lg:w-[520px] h-[300px] lg:h-[520px] rounded-full blur-[80px] lg:blur-[120px] opacity-20 ${isDark ? "bg-blue-600/30" : "bg-blue-200"}`} />
          <div className={`absolute bottom-[-10%] left-[5%] w-[250px] lg:w-[420px] h-[250px] lg:h-[420px] rounded-full blur-[80px] lg:blur-[110px] opacity-20 ${isDark ? "bg-purple-600/20" : "bg-purple-200"}`} />
        </div>

        {/* Header */}
        <div className={`h-16 md:h-20 lg:h-24 px-4 sm:px-6 lg:px-10 flex items-center justify-between shrink-0 z-30 border-b backdrop-blur-md
            ${isDark ? "bg-slate-900/70 border-white/10" : "bg-white/80 border-slate-200"}`}>

          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            {/* ✅ Sidebar Toggle (Ab sirf Mobile par dikhega) */}
            <button
              onClick={() => setSidebarOpen((prev) => !prev)}
              className={`lg:hidden p-2.5 sm:p-3 rounded-xl border flex items-center justify-center transition-all shrink-0 shadow-sm
                ${isDark ? "bg-white/5 border-white/10 text-white hover:bg-white/10" : "bg-white border-slate-200 text-slate-900 hover:bg-slate-50"}`}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h3 className={`text-lg sm:text-2xl lg:text-3xl font-black tracking-tight truncate ${isDark ? "text-white" : "text-slate-900"}`}>Connection Requests</h3>
              <p className={`hidden sm:block text-xs lg:text-sm mt-0.5 lg:mt-1 truncate ${isDark ? "text-slate-400" : "text-slate-500"}`}>Review and manage your connection requests.</p>
            </div>
          </div>

          {/* Profile dropdown & Theme Toggle */}
          <div className="flex items-center gap-3 sm:gap-5">
            <ThemeToggle />

            <div className="relative z-[100] shrink-0" ref={menuRef}>
              <button
                onClick={() => setHeaderMenuOpen(!headerMenuOpen)}
                className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-full ring-2 ring-offset-2 transition-all focus:outline-none flex items-center justify-center shadow-md
                  ${isDark ? "ring-offset-slate-900 ring-transparent hover:ring-blue-500" : "ring-offset-white ring-transparent hover:ring-blue-400"}`}
              >
                {user?.avatarUrl || user?.avatar_url || user?.avatar ? (
                  <img src={user?.avatarUrl || user?.avatar_url || user?.avatar} alt="Profile" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg sm:text-xl">
                    {profileLoading ? "…" : avatarLetter}
                  </div>
                )}
              </button>

              {headerMenuOpen && (
                <div className={`absolute right-0 top-full mt-2 lg:mt-4 w-72 sm:w-80 rounded-3xl shadow-2xl border overflow-hidden z-[200] transition-all transform origin-top-right backdrop-blur-xl
                    ${isDark ? "bg-slate-800/95 border-white/10 shadow-black/50" : "bg-white/95 border-slate-200 shadow-2xl"}`}>
                  <div className={`p-6 sm:p-8 border-b flex flex-col items-center ${isDark ? "border-white/10" : "border-slate-100"}`}>
                    <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full mb-4 sm:mb-6 shadow-lg ring-4 ${isDark ? "ring-slate-700" : "ring-slate-50"}`}>
                      {user?.avatarUrl || user?.avatar_url || user?.avatar ? (
                        <img src={user?.avatarUrl || user?.avatar_url || user?.avatar} alt="Profile" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-4xl sm:text-5xl">
                          {avatarLetter}
                        </div>
                      )}
                    </div>
                    <p className={`font-extrabold text-lg sm:text-xl text-center truncate w-full ${isDark ? "text-white" : "text-slate-900"}`}>{displayName}</p>
                    <p className={`text-sm sm:text-base text-center truncate w-full mt-1 sm:mt-2 mb-1 sm:mb-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>{user?.email || "Verified IITK User"}</p>
                  </div>
                  <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                    <button onClick={() => { setHeaderMenuOpen(false); navigate("/profile"); }}
                      className={`w-full flex items-center justify-center gap-3 px-4 py-3 sm:py-4 rounded-xl text-sm sm:text-base font-semibold transition-colors
                        ${isDark ? "hover:bg-white/10 text-white" : "hover:bg-slate-50 text-slate-800"}`}>
                      <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" /> Edit Profile
                    </button>
                    <button onClick={() => { setHeaderMenuOpen(false); logout(); }}
                      className={`w-full flex items-center justify-center gap-3 px-4 py-3 sm:py-4 rounded-xl text-sm sm:text-base font-semibold transition-colors
                        ${isDark ? "hover:bg-white/10 text-red-400" : "hover:bg-red-50 text-red-600"}`}>
                      <LogOut className="w-4 h-4 sm:w-5 sm:h-5" /> Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 relative z-10 space-y-6 sm:space-y-8 no-scrollbar">

          {/* ══ INCOMING REQUESTS ═══════════════════════════════════════════ */}
          <div className={`rounded-[2rem] border p-5 sm:p-6 lg:p-8 transition-colors shadow-sm ${isDark ? "bg-slate-900/40 border-white/10 backdrop-blur-xl" : "bg-white border-slate-200"}`}>
            <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${isDark ? "bg-blue-500/20 shadow-inner" : "bg-blue-100 shadow-sm"}`}>
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
              </div>
              <div className="min-w-0">
                <h1 className={`text-xl sm:text-2xl font-black truncate tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>Incoming Requests</h1>
                <p className={`hidden sm:block text-sm truncate ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Review requests. Accept to chat, decline to skip.
                </p>
              </div>
              {requests.length > 0 && (
                <span className="ml-auto shrink-0 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-red-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-red-500/30 border-2 border-transparent dark:border-white/10">
                  {requests.length} New
                </span>
              )}
            </div>

            {requestsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
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
              <div className={`rounded-2xl border p-4 sm:p-5 ${isDark ? "bg-red-500/10 border-red-500/30" : "bg-red-50 border-red-200"}`}>
                <p className={`text-sm font-semibold flex items-center gap-2 ${isDark ? "text-red-400" : "text-red-600"}`}><AlertCircle className="w-4 h-4 shrink-0" /> {requestsError}</p>
              </div>
            ) : requests.length === 0 ? (
              <div className={`rounded-3xl border p-8 sm:p-12 text-center animate-in fade-in zoom-in-95 duration-500 ${isDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"}`}>
                <div className={`w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full flex items-center justify-center mb-4 sm:mb-5 shadow-inner ${isDark ? "bg-white/5" : "bg-white"}`}>
                  <Users className={`w-8 h-8 sm:w-10 sm:h-10 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                </div>
                <h3 className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>No incoming requests</h3>
                <p className={`text-sm sm:text-base mt-2 font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>You don't have any connection requests right now.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {requests.map((request, index) => {
                  const reqName =
                    request?.sender_display_name ||
                    (request?.sender_email ? String(request.sender_email).split("@")[0] : null) ||
                    "Anonymous User";
                  const reqId = request?.id || request?._id || index;

                  return (
                    <div key={reqId} className={`group relative rounded-[1.5rem] p-5 sm:p-6 border transition-all duration-300 flex flex-col h-full shadow-sm hover:shadow-xl
                      ${isDark ? "bg-[#0F172A] border-white/10 hover:border-blue-500/50" : "bg-white border-slate-200 hover:border-blue-300"}`}>
                      <div className="flex items-start justify-between mb-5">
                        <div className="flex items-center gap-3 sm:gap-4 cursor-pointer hover:opacity-80 transition-opacity min-w-0" onClick={() => navigate(`/profile/${request.sender_id}`)}>
                          <div className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-[14px] flex items-center justify-center border shrink-0 overflow-hidden shadow-sm
                            ${isDark ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-200"}`}>
                            {request.sender_avatar_url ? (
                              <img src={request.sender_avatar_url} alt="Profile" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            ) : (
                              <ShieldCheck className={`w-6 h-6 sm:w-7 sm:h-7 ${isDark ? "text-white/30" : "text-slate-400"}`} />
                            )}
                          </div>
                          <div className="min-w-0 pr-2">
                            <h4 className={`font-bold text-base sm:text-lg truncate tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>{reqName}</h4>
                          </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0 pl-2">
                          <span className="text-2xl sm:text-3xl font-black text-green-600 dark:text-green-400 tracking-tighter">{request.matchScore || 0}%</span>
                          <span className="text-[10px] text-green-600/70 uppercase font-bold tracking-widest mt-[-2px]">Match</span>
                        </div>
                      </div>

                      <div className="mb-6 sm:mb-8 flex-1">
                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 sm:mb-3 ${isDark ? "text-white/40" : "text-slate-400"}`}>Common Interests</p>
                        <div className="flex flex-wrap gap-2">
                          {((request.sharedTags || request.sharedInterests || []).length > 0) ? (
                            (request.sharedTags || request.sharedInterests).map((tag: any, idx: number) => (
                              <span key={idx} className={`px-2.5 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold border
                                ${isDark ? "bg-blue-900/20 border-blue-500/20 text-blue-300" : "bg-slate-100 border-slate-200 text-slate-600"}`}>
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className={`text-xs italic ${isDark ? "text-slate-500" : "text-slate-400"}`}>No shared interests specified</span>
                          )}
                        </div>
                        {request.message && (
                          <div className={`mt-4 p-3 sm:p-4 rounded-xl text-xs sm:text-sm font-medium italic border ${isDark ? 'bg-white/5 border-white/5 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                            "{request.message}"
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 sm:gap-3 mt-auto">
                        <button onClick={() => handleReject(reqId)}
                          className={`flex-[0.8] sm:flex-1 py-3 sm:py-3.5 rounded-xl text-sm font-bold transition-all border active:scale-[0.98]
                            ${isDark ? "bg-white/5 border-white/10 text-slate-300 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600"}`}>
                          Decline
                        </button>
                        <button onClick={() => handleAccept(reqId)}
                          className="flex-[1.2] sm:flex-[2] bg-blue-600 hover:bg-blue-500 text-white py-3 sm:py-3.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
                          <Check className="w-4 h-4 sm:w-5 sm:h-5" /> Connect
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ══ SENT REQUESTS ════════════════════════════════════════════════ */}
          <div className={`rounded-[2rem] border p-5 sm:p-6 lg:p-8 transition-colors shadow-sm ${isDark ? "bg-slate-900/40 border-white/10 backdrop-blur-xl" : "bg-white border-slate-200"}`}>
            <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${isDark ? "bg-violet-500/20 shadow-inner" : "bg-violet-100 shadow-sm"}`}>
                <Send className="w-5 h-5 sm:w-6 sm:h-6 text-violet-500" />
              </div>
              <div className="min-w-0">
                <h2 className={`text-xl sm:text-2xl font-black truncate tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>Sent Requests</h2>
                <p className={`hidden sm:block text-sm truncate ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Pending connection requests you've sent. Withdraw at any time.
                </p>
              </div>
              {sentRequests.length > 0 && (
                <span className={`ml-auto shrink-0 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-bold shadow-sm border ${isDark ? "bg-violet-500/10 text-violet-400 border-violet-500/20" : "bg-violet-50 text-violet-700 border-violet-200"}`}>
                  {sentRequests.length} Pending
                </span>
              )}
            </div>

            {sentLoading ? (
              <div className="space-y-3 sm:space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className={`rounded-2xl border p-4 sm:p-5 animate-pulse flex flex-col sm:flex-row sm:items-center gap-4 ${isDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"}`}>
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`h-12 w-12 rounded-2xl shrink-0 ${isDark ? "bg-white/10" : "bg-slate-200"}`} />
                      <div className="flex-1 space-y-2">
                        <div className={`h-4 w-32 rounded ${isDark ? "bg-white/10" : "bg-slate-200"}`} />
                        <div className={`h-3 w-24 rounded ${isDark ? "bg-white/10" : "bg-slate-200"}`} />
                      </div>
                    </div>
                    <div className={`h-10 w-28 rounded-xl shrink-0 ${isDark ? "bg-white/10" : "bg-slate-200"}`} />
                  </div>
                ))}
              </div>
            ) : sentError ? (
              <div className={`rounded-2xl border p-4 sm:p-5 ${isDark ? "bg-red-500/10 border-red-500/30" : "bg-red-50 border-red-200"}`}>
                <p className={`text-sm font-semibold flex items-center gap-2 ${isDark ? "text-red-400" : "text-red-600"}`}><AlertCircle className="w-4 h-4 shrink-0" /> {sentError}</p>
              </div>
            ) : sentRequests.length === 0 ? (
              <div className={`rounded-3xl border p-8 sm:p-12 text-center animate-in fade-in zoom-in-95 duration-500 ${isDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"}`}>
                <div className={`w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full flex items-center justify-center mb-4 sm:mb-5 shadow-inner ${isDark ? "bg-white/5" : "bg-white"}`}>
                  <Send className={`w-8 h-8 sm:w-10 sm:h-10 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                </div>
                <h3 className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>No sent requests</h3>
                <p className={`text-sm sm:text-base mt-2 font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  You haven't sent any pending connection requests yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4 max-w-4xl">
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
                      className={`rounded-[1.25rem] border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition-all duration-300 shadow-sm
                        ${isDark ? "bg-white/5 border-white/10 hover:border-white/20" : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-md"}`}>

                      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        {/* Avatar placeholder */}
                        <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl shrink-0 flex items-center justify-center font-bold text-lg sm:text-xl shadow-sm
                          ${isDark ? "bg-gradient-to-br from-violet-600/40 to-fuchsia-600/40 text-violet-200 border border-white/5" : "bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-700 border border-violet-200/50"}`}>
                          {rName.charAt(0).toUpperCase()}
                        </div>

                        {/* Name + time */}
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold text-base sm:text-lg truncate tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>{rName}</p>
                          {sentAt && (
                            <p className={`text-xs sm:text-sm flex items-center gap-1.5 mt-0.5 font-medium ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> {sentAt}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 sm:w-auto w-full justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 mt-1 sm:mt-0 border-inherit">
                        {/* Status badge */}
                        <span className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider shrink-0 shadow-sm border
                          ${isDark ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                          Pending
                        </span>

                        {/* Withdraw button */}
                        <button
                          onClick={() => handleCancelSent(rId)}
                          disabled={isCancelling}
                          className={`shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all border active:scale-[0.98]
                            ${isDark
                              ? "border-red-500/20 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                              : "border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:opacity-50 shadow-sm hover:shadow"}`}
                        >
                          {isCancelling ? (
                            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
                          ) : (
                            <X className="w-4 h-4 shrink-0" />
                          )}
                          {isCancelling ? "Withdrawing…" : "Withdraw"}
                        </button>
                      </div>
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