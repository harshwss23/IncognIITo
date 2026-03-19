import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  MessageSquareText,
  Video,
  User,
  ShieldCheck,
  Tag,
  ArrowRight,
  LogOut,
  ChevronRight,
  Sparkles,
  Activity,
  UserCheck,
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useThemeColors } from "@/app/hooks/useThemeColors";
import { useTheme } from "@/app/contexts/ThemeContext";
import { authFetch, clearAuthTokens } from "@/services/auth";
import { buildApiUrl } from "@/services/config";

export function HomePageScreen() {
  const colors = useThemeColors();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("home");
  const [isJoiningQueue, setIsJoiningQueue] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);

  const [user, setUser] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setHeaderMenuOpen(false);
      }
    };
    if (headerMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [headerMenuOpen]);

  useEffect(() => {
    const fetchProfile = async () => {
      setProfileLoading(true);
      try {
        const res = await authFetch("/api/users/profile", {
          method: "GET",
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok || !json.success) {
          console.error("Profile fetch failed:", res.status, json);
          setUser(null);
          setProfileLoading(false);
          return;
        }

        setUser(json.data?.user || null);
      } catch (err) {
        console.error("Profile fetch error:", err);
        setUser(null);
      } finally {
        setProfileLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const displayName = useMemo(() => {
    if (!user) return "User";
    const dn = (user.display_name || user.displayName || "").trim();
    if (dn) return dn;
    const email = (user.email || "").trim();
    if (email.includes("@")) return email.split("@")[0];
    return email || "User";
  }, [user]);

  const avatarLetter = useMemo(() => {
    return (displayName?.charAt(0) || "U").toUpperCase();
  }, [displayName]);

  const logout = () => {
    clearAuthTokens();
    window.location.href = "/";
  };

  const handleContinueClick = async () => {
    if (activeTab !== "match") return;

    setIsJoiningQueue(true);
    setQueueError(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setQueueError("Authentication token not found");
        setIsJoiningQueue(false);
        return;
      }

      const res = await fetch(buildApiUrl("/api/match/join"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setQueueError(data.message || "Failed to join matching queue");
        setIsJoiningQueue(false);
        return;
      }

      navigate("/matchmaking");
    } catch (err) {
      console.error("Join queue error:", err);
      setQueueError("Failed to connect to server");
      setIsJoiningQueue(false);
    }
  };

  const navItems = [
    { id: "requests", label: "Connection Requests", icon: Users, count: 0 },
    { id: "chats", label: "Active Chats", icon: MessageSquareText, count: 0 },
    { id: "people", label: "Active Users", icon: Users, count: 0 },
    { id: "match", label: "Start Matching", icon: Video, count: 0 },
  ];

  const title =
    activeTab === "requests"
      ? "Connection Requests"
      : activeTab === "chats"
      ? "Active Chats"
      : activeTab === "match"
      ? "Start Matching"
      : activeTab === "profile"
      ? "Your Profile"
      : "Welcome to IncognIITo";

  const desc =
    activeTab === "requests"
      ? "Review incoming requests with shared interests and match score. Accept to start an anonymous chat, or decline to skip."
      : activeTab === "chats"
      ? "Continue your current anonymous conversations. Keep it chill, safe, and respectful."
      : activeTab === "match"
      ? "Join the matchmaking queue to get paired based on interests for a 1:1 video + side chat session."
      : activeTab === "profile"
      ? "Edit your anonymous display name and update interests used for matchmaking."
      : "IncognIITo is an IITK-only anonymous platform to meet new people safely. Create an alias, pick interests, and connect via chat or 1:1 video sessions.";

  return (
    <div
      className={`w-full min-h-screen flex overflow-hidden transition-colors duration-500 ${
        isDark ? "bg-slate-950" : "bg-slate-50"
      }`}
    >
      {/* --- LEFT SIDEBAR --- */}
      <div
        className={`${
          sidebarOpen ? "w-80" : "w-24"
        } shrink-0 flex flex-col border-r relative z-20 transition-all duration-300
          ${isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-200"}`}
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className={`absolute -top-20 -left-16 w-56 h-56 rounded-full blur-3xl opacity-20 ${
              isDark ? "bg-blue-600" : "bg-blue-200"
            }`}
          />
          <div
            className={`absolute bottom-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20 ${
              isDark ? "bg-purple-600" : "bg-purple-200"
            }`}
          />
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
              <p className={`text-xs mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                IITK anonymous network
              </p>
            </div>
          ) : (
            <h2 className="text-2xl font-black tracking-tight">
              <span className={isDark ? "text-white" : "text-slate-900"}>I</span>
              <span className="text-blue-500">IIT</span>
            </h2>
          )}
        </div>

        {/* Quick profile card */}
        <div className={`relative z-10 ${sidebarOpen ? "px-4 pb-4" : "px-3 pb-4"}`}>
          <div
            className={`rounded-2xl border transition-colors ${
              isDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
            } ${sidebarOpen ? "p-4" : "p-3"}`}
          >
            <div className={`flex items-center ${sidebarOpen ? "gap-3" : "justify-center"}`}>
              {user?.avatarUrl || user?.avatar_url || user?.avatar ? (
                <img
                  src={user?.avatarUrl || user?.avatar_url || user?.avatar}
                  alt="Profile"
                  className="w-12 h-12 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-base shrink-0">
                  {profileLoading ? "…" : avatarLetter}
                </div>
              )}

              {sidebarOpen && (
                <div className="min-w-0">
                  <p className={`font-bold truncate ${isDark ? "text-white" : "text-slate-900"}`}>
                    {profileLoading ? "Loading..." : displayName}
                  </p>
                  <p className="text-xs text-blue-500 font-semibold">Verified IITK</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2 relative z-10">
          <button
            onClick={() => setActiveTab("home")}
            className={`w-full flex items-center ${
              sidebarOpen ? "justify-between px-4" : "justify-center px-2"
            } py-4 rounded-xl transition-all duration-300 group
              ${
                activeTab === "home"
                  ? isDark
                    ? "bg-gradient-to-r from-blue-600/20 to-blue-500/10 border border-blue-500/30 text-white"
                    : "bg-blue-50 border border-blue-200 text-blue-700"
                  : isDark
                  ? "text-slate-400 hover:bg-white/5 hover:text-white"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              }`}
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
                if (item.id === "people") {
                  navigate("/active-users");
                  return;
                }

                if (item.id === "requests") {
                  navigate("/requests");
                  return;
                }

                if (item.id === "chats") {
                  navigate("/chat");
                  return;
                }

                setActiveTab(item.id);
              }}
              className={`w-full flex items-center ${
                sidebarOpen ? "justify-between px-4" : "justify-center px-2"
              } py-4 rounded-xl transition-all duration-300 group
                ${
                  activeTab === item.id
                    ? isDark
                      ? "bg-gradient-to-r from-blue-600/20 to-blue-500/10 border border-blue-500/30 text-white"
                      : "bg-blue-50 border border-blue-200 text-blue-700"
                    : isDark
                    ? "text-slate-400 hover:bg-white/5 hover:text-white"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <item.icon className={`w-5 h-5 shrink-0 ${activeTab === item.id ? "text-blue-500" : ""}`} />
                {sidebarOpen && <span className="font-medium truncate">{item.label}</span>}
              </div>

              {sidebarOpen &&
                (item.count > 0 ? (
                  <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-500/30">
                    {item.count}
                  </span>
                ) : (
                  <ChevronRight className={`w-4 h-4 ${isDark ? "text-slate-600" : "text-slate-400"}`} />
                ))}
            </button>
          ))}
        </nav>

        {/* Footer action */}
        <div className={`p-4 border-t relative z-10 ${isDark ? "border-white/10" : "border-slate-200"}`}>
          <button
            onClick={logout}
            className={`w-full rounded-xl py-3 flex items-center ${
              sidebarOpen ? "justify-center gap-2 px-4" : "justify-center px-2"
            } font-semibold transition-all
              ${
                isDark
                  ? "bg-white/5 hover:bg-white/10 text-red-400"
                  : "bg-slate-100 hover:bg-slate-200 text-red-600"
              }`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {sidebarOpen && <span>Log Out</span>}
          </button>
        </div>
      </div>

      {/* --- RIGHT CONTENT --- */}
      <div className="flex-1 flex flex-col relative overflow-hidden isolate">
        {/* ambient bg */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className={`absolute top-[-120px] right-[-120px] w-[520px] h-[520px] rounded-full blur-[120px] opacity-20 ${
              isDark ? "bg-blue-600/30" : "bg-blue-200"
            }`}
          />
          <div
            className={`absolute bottom-[-100px] left-[10%] w-[420px] h-[420px] rounded-full blur-[110px] opacity-20 ${
              isDark ? "bg-purple-600/20" : "bg-purple-200"
            }`}
          />
        </div>

        {/* Header */}
        <div
          className={`h-24 px-10 flex items-center justify-between z-30 border-b backdrop-blur-sm
            ${isDark ? "bg-slate-900/60 border-white/10" : "bg-white/70 border-slate-200"}`}
        >
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => setSidebarOpen((prev) => !prev)}
              className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all shrink-0 ${
                isDark
                  ? "bg-white/5 border-white/10 text-white hover:bg-white/10"
                  : "bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100"
              }`}
            >
              {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
            </button>

            <div className="min-w-0">
              <h3 className={`text-3xl font-black tracking-tight truncate ${isDark ? "text-white" : "text-slate-900"}`}>
                {title}
              </h3>
              <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {activeTab === "home"
                  ? "Quick overview of your campus-only anonymous network."
                  : "Understand this section and proceed."}
              </p>
            </div>
          </div>

          {/* User Profile Dropdown */}
          <div className="relative z-[100]" ref={menuRef}>
            <button
              onClick={() => setHeaderMenuOpen(!headerMenuOpen)}
              className={`w-14 h-14 rounded-full ring-2 ring-offset-2 transition-all focus:outline-none flex items-center justify-center shadow-lg
                ${
                  isDark
                    ? "ring-offset-slate-900 ring-transparent hover:ring-blue-500"
                    : "ring-offset-white ring-transparent hover:ring-blue-400"
                }`}
            >
              {user?.avatarUrl || user?.avatar_url || user?.avatar ? (
                <img
                  src={user?.avatarUrl || user?.avatar_url || user?.avatar}
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                  {profileLoading ? "…" : avatarLetter}
                </div>
              )}
            </button>

            {headerMenuOpen && (
              <div
                className={`absolute right-0 mt-4 w-80 rounded-3xl shadow-2xl border overflow-hidden z-[200] transition-all transform origin-top-right
                  ${isDark ? "bg-slate-800 border-white/10 shadow-black/50" : "bg-white border-slate-200 shadow-2xl"}`}
              >
                <div
                  className={`p-8 border-b flex flex-col items-center ${isDark ? "border-white/10" : "border-slate-100"}`}
                >
                  <div
                    className={`w-40 h-40 rounded-full mb-6 shadow-lg ring-4 ${
                      isDark ? "ring-slate-700" : "ring-slate-50"
                    }`}
                  >
                    {user?.avatarUrl || user?.avatar_url || user?.avatar ? (
                      <img
                        src={user?.avatarUrl || user?.avatar_url || user?.avatar}
                        alt="Profile"
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-6xl">
                        {avatarLetter}
                      </div>
                    )}
                  </div>

                  <p
                    className={`font-extrabold text-xl text-center truncate w-full ${
                      isDark ? "text-white" : "text-slate-900"
                    }`}
                  >
                    {displayName}
                  </p>
                  <p
                    className={`text-base text-center truncate w-full mt-2 mb-2 ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    {user?.email || "Verified IITK User"}
                  </p>
                </div>

                <div className="p-4 space-y-3">
                  <button
                    onClick={() => {
                      setHeaderMenuOpen(false);
                      navigate("/profile");
                    }}
                    className={`w-full flex items-center justify-center gap-3 px-4 py-4 rounded-xl text-base font-semibold transition-colors
                      ${isDark ? "hover:bg-white/10 text-white" : "hover:bg-slate-50 text-slate-800"}`}
                  >
                    <User className="w-5 h-5 text-blue-500" />
                    Edit Profile
                  </button>
                  <button
                    onClick={() => {
                      setHeaderMenuOpen(false);
                      logout();
                    }}
                    className={`w-full flex items-center justify-center gap-3 px-4 py-4 rounded-xl text-base font-semibold transition-colors
                      ${isDark ? "hover:bg-white/10 text-red-400" : "hover:bg-red-50 text-red-600"}`}
                  >
                    <LogOut className="w-5 h-5" />
                    Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-10 relative z-10">
          {activeTab === "home" ? (
            <div className="space-y-8">
              {/* Hero */}
              <div
                className={`relative overflow-hidden rounded-[32px] border p-8 lg:p-10
                  ${isDark ? "bg-slate-900/60 border-white/10" : "bg-white border-slate-200"}`}
              >
                <div className="absolute inset-0 pointer-events-none">
                  <div
                    className={`absolute top-0 right-0 w-72 h-72 rounded-full blur-3xl opacity-25 ${
                      isDark ? "bg-blue-600/30" : "bg-blue-200"
                    }`}
                  />
                  <div
                    className={`absolute bottom-0 left-20 w-60 h-60 rounded-full blur-3xl opacity-20 ${
                      isDark ? "bg-purple-600/25" : "bg-purple-200"
                    }`}
                  />
                </div>

                <div className="relative z-10 grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-8 items-center">
                  <div>
                    <div
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold
                        ${
                          isDark
                            ? "border-white/10 bg-white/5 text-slate-200"
                            : "border-slate-200 bg-slate-50 text-slate-700"
                        }`}
                    >
                      <Sparkles className="w-4 h-4 text-blue-500" />
                      Private. Campus-only. Anonymous.
                    </div>

                    <h1
                      className={`text-4xl lg:text-5xl font-black mt-5 leading-tight ${
                        isDark ? "text-white" : "text-slate-900"
                      }`}
                    >
                      IncognIITo — Anonymous Connections,
                      <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">
                        Real Conversations.
                      </span>
                    </h1>

                    <p
                      className={`text-base lg:text-lg mt-5 leading-relaxed max-w-2xl ${
                        isDark ? "text-slate-400" : "text-slate-600"
                      }`}
                    >
                      {desc}
                    </p>

                    <div className="flex flex-wrap gap-4 mt-8">
                      <button
                        onClick={() => setActiveTab("match")}
                        className="group rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-4 text-white font-bold shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <div className="flex items-center gap-2">
                          <span>Start Matching</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </button>

                      <button
                        onClick={() => navigate("/chat")}
                        className={`rounded-2xl px-6 py-4 font-bold border transition-all ${
                          isDark
                            ? "bg-white/5 border-white/10 text-white hover:bg-white/10"
                            : "bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100"
                        }`}
                      >
                        Open Chats
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <StatGlassCard
                      isDark={isDark}
                      icon={Users}
                      value="IITK Only"
                      label="Verified users only"
                    />
                    <StatGlassCard
                      isDark={isDark}
                      icon={ShieldCheck}
                      value="Safe & Private"
                      label="Anonymous by design"
                    />
                    <StatGlassCard
                      isDark={isDark}
                      icon={Video}
                      value="1:1 Matching"
                      label="Video + side chat"
                    />
                  </div>
                </div>
              </div>

              {/* Main content blocks */}
              <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-6">
                <div
                  className={`rounded-3xl border p-6 ${
                    isDark ? "bg-slate-900/40 border-white/10" : "bg-white border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-5">
                    <div>
                      <h3 className={`text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                        Platform Highlights
                      </h3>
                      <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Explore what makes the experience feel safe, useful, and comfortable.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FeatureCard
                      isDark={isDark}
                      icon={Tag}
                      title="Interest-Based Matching"
                      text="Pick interests to find better matches and avoid random uncomfortable interactions."
                    />
                    <FeatureCard
                      isDark={isDark}
                      icon={MessageSquareText}
                      title="Anonymous Chats"
                      text="Start conversations without revealing personal details. You stay in control."
                    />
                    <FeatureCard
                      isDark={isDark}
                      icon={Video}
                      title="1:1 Video Sessions"
                      text="Join a private temporary room when you feel comfortable. Optional side chat included."
                    />
                    <FeatureCard
                      isDark={isDark}
                      icon={ShieldCheck}
                      title="Safety & Moderation"
                      text="Report/block tools help maintain a respectful campus-only community."
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div
                    className={`rounded-3xl border p-6 ${
                      isDark ? "bg-slate-900/40 border-white/10" : "bg-white border-slate-200"
                    }`}
                  >
                    <h3 className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                      Quick Actions
                    </h3>
                    <div className="space-y-3 mt-5">
                      <QuickActionButton
                        isDark={isDark}
                        icon={Users}
                        label="View Active Users"
                        onClick={() => navigate("/active-users")}
                      />
                      <QuickActionButton
                        isDark={isDark}
                        icon={MessageSquareText}
                        label="Open Chats"
                        onClick={() => navigate("/chat")}
                      />
                      <QuickActionButton
                        isDark={isDark}
                        icon={Video}
                        label="Start Matching"
                        onClick={() => setActiveTab("match")}
                      />
                      <QuickActionButton
                        isDark={isDark}
                        icon={User}
                        label="Edit Profile"
                        onClick={() => navigate("/profile")}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div
                className={`rounded-3xl border p-8 transition-colors
                  ${isDark ? "bg-slate-900/40 border-white/10" : "bg-white border-slate-200"}`}
              >
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold
                    ${
                      isDark
                        ? "border-white/10 bg-white/5 text-slate-200"
                        : "border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                >
                  <ShieldCheck className="w-4 h-4 text-blue-500" />
                  Verified IITK-only access
                </div>

                <h1 className={`text-4xl font-black mt-5 ${isDark ? "text-white" : "text-slate-900"}`}>
                  {title}
                </h1>

                <p className={`text-base mt-4 leading-relaxed max-w-3xl ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  {desc}
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 mt-8">
                  <div className="space-y-4">
                    <MiniStep isDark={isDark} n="01" t="Read the details" d="Understand what this section controls." />
                    <MiniStep isDark={isDark} n="02" t="Take action" d="Accept/decline, open chats, or join queue." />
                    <MiniStep isDark={isDark} n="03" t="Stay safe" d="Use report/block if anything feels wrong." />

                    {queueError && (
                      <div
                        className={`rounded-2xl border p-4 ${
                          isDark ? "bg-red-500/10 border-red-500/30" : "bg-red-50 border-red-200"
                        }`}
                      >
                        <p className={`text-sm font-semibold ${isDark ? "text-red-400" : "text-red-600"}`}>
                          ⚠️ {queueError}
                        </p>
                      </div>
                    )}
                  </div>

                  <div
                    className={`rounded-3xl border p-6 ${
                      isDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <h3 className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                      Ready to proceed?
                    </h3>
                    <p className={`text-sm mt-2 leading-relaxed ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      Continue to move into the next action for this section. For matching, this will place you in the queue and take you to the waiting screen.
                    </p>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <SmallInfoCard isDark={isDark} title="Privacy" value="On" />
                      <SmallInfoCard isDark={isDark} title="Access" value="Verified" />
                      <SmallInfoCard isDark={isDark} title="Mode" value={activeTab === "match" ? "Queue" : "Action"} />
                      <SmallInfoCard isDark={isDark} title="Status" value={isJoiningQueue ? "Processing" : "Ready"} />
                    </div>

                    <button
                      onClick={handleContinueClick}
                      disabled={isJoiningQueue}
                      className="mt-6 w-full group relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-4 text-white font-bold text-sm shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
                      <div className="relative flex items-center justify-center gap-2">
                        <span>{isJoiningQueue ? "Joining..." : "Continue"}</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ isDark, icon: Icon, title, text }) {
  return (
    <div
      className={`rounded-2xl border p-5 transition-all
        ${
          isDark
            ? "bg-slate-900/40 border-white/5 hover:bg-white/5 hover:border-white/10"
            : "bg-white border-slate-200 hover:border-blue-300 hover:shadow-lg"
        }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center
            ${isDark ? "bg-gradient-to-br from-blue-600 to-purple-600" : "bg-gradient-to-br from-blue-500 to-indigo-500"}`}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
        <h4 className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{title}</h4>
      </div>
      <p className={`text-sm mt-3 leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>{text}</p>
    </div>
  );
}

function MiniStep({ isDark, n, t, d }) {
  return (
    <div
      className={`flex items-start gap-4 rounded-2xl border p-5
        ${isDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"}`}
    >
      <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center font-bold text-blue-500">
        {n}
      </div>
      <div>
        <div className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{t}</div>
        <div className={`text-sm mt-1 leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>{d}</div>
      </div>
    </div>
  );
}

function MetricCard({ isDark, icon: Icon, title, value, sub }) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        isDark ? "bg-slate-900/40 border-white/10" : "bg-white border-slate-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center ${
            isDark ? "bg-white/5" : "bg-slate-100"
          }`}
        >
          <Icon className="w-5 h-5 text-blue-500" />
        </div>
      </div>
      <div className={`mt-4 text-sm font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>{title}</div>
      <div className={`mt-1 text-2xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>{value}</div>
      <div className={`mt-1 text-sm ${isDark ? "text-slate-500" : "text-slate-500"}`}>{sub}</div>
    </div>
  );
}

function StatGlassCard({ isDark, icon: Icon, value, label }) {
  return (
    <div
      className={`rounded-2xl border p-5 backdrop-blur-sm ${
        isDark ? "bg-white/5 border-white/10" : "bg-white/70 border-slate-200"
      }`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            isDark ? "bg-gradient-to-br from-blue-600 to-purple-600" : "bg-gradient-to-br from-blue-500 to-indigo-500"
          }`}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{value}</div>
          <div className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{label}</div>
        </div>
      </div>
    </div>
  );
}

function QuickActionButton({ isDark, icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl px-4 py-4 flex items-center justify-between transition-all border
        ${
          isDark
            ? "bg-white/5 border-white/10 text-white hover:bg-white/10"
            : "bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100"
        }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isDark ? "bg-white/5" : "bg-white"
          }`}
        >
          <Icon className="w-5 h-5 text-blue-500" />
        </div>
        <span className="font-semibold">{label}</span>
      </div>
      <ChevronRight className={`w-4 h-4 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
    </button>
  );
}

function SmallInfoCard({ isDark, title, value }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        isDark ? "bg-slate-900/50 border-white/10" : "bg-white border-slate-200"
      }`}
    >
      <div className={`text-xs font-semibold ${isDark ? "text-slate-500" : "text-slate-400"}`}>{title}</div>
      <div className={`mt-1 font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{value}</div>
    </div>
  );
}

// this is my current code  give whole code only relative to chnage asked  dont change other existing parts of code , give full code so that i can directly replace and work