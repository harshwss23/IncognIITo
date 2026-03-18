import React, { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { useThemeColors } from "@/app/hooks/useThemeColors";
import { useTheme } from "@/app/contexts/ThemeContext";
import { authFetch, clearAuthTokens } from "@/services/auth";

export function HomePageScreen() {
  const colors = useThemeColors();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("home"); // home | requests | chats | match | profile

  // ✅ profile state
  const [user, setUser] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // ✅ Fetch Profile
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
    window.location.href = "/landing";
  };

  const navItems = [
    { id: "requests", label: "Connection Requests", icon: Users, count: 0 },
    { id: "chats", label: "Active Chats", icon: MessageSquareText, count: 0 },
    { id: "people", label: "Active Users", icon: Users, count: 0 }, // ✅ redirects to /active-users
    { id: "match", label: "Start Matching", icon: Video, count: 0 },
    { id: "profile", label: "Profile", icon: User, count: 0 },
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
      className={`w-full h-full flex overflow-hidden transition-colors duration-500
      ${isDark ? "bg-slate-950" : "bg-slate-50"}`}
    >
      {/* --- LEFT SIDEBAR --- */}
      <div
        className={`w-80 flex flex-col border-r z-20 transition-colors
          ${isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-200"}`}
      >
        {/* Logo */}
        <div className="h-24 flex items-center px-8">
          <h2 className="text-2xl font-bold tracking-tight">
            <span className={isDark ? "text-white" : "text-slate-900"}>Incogn</span>
            <span className="text-blue-500">IIT</span>
            <span className={isDark ? "text-white" : "text-slate-900"}>o</span>
          </h2>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2">
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
              className={`w-full flex items-center justify-between px-4 py-4 rounded-xl transition-all duration-300 group
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
              <div className="flex items-center gap-3">
                <item.icon className={`w-5 h-5 ${activeTab === item.id ? "text-blue-500" : ""}`} />
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

        {/* User snippet */}
        <div className={`p-6 border-t ${isDark ? "border-white/10" : "border-slate-200"}`}>
          <div
            className={`p-4 rounded-2xl flex items-center gap-3 transition-colors
              ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-slate-100 hover:bg-slate-200"}`}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
              {profileLoading ? "…" : avatarLetter}
            </div>

            <div className="flex-1 overflow-hidden">
              <p className={`font-bold text-sm truncate ${isDark ? "text-white" : "text-slate-900"}`}>
                {profileLoading ? "Loading..." : displayName}
              </p>
              <p className="text-xs text-blue-500 font-medium">Verified IITK</p>
            </div>

            <button onClick={logout} title="Logout" className="p-1">
              <LogOut className={`w-4 h-4 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
            </button>
          </div>
        </div>
      </div>

      {/* --- RIGHT MAJOR CONTENT --- */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Background glow */}
        <div
          className={`absolute top-0 right-0 w-[650px] h-[650px] rounded-full blur-[110px] opacity-20 pointer-events-none transition-colors
            ${isDark ? "bg-blue-600/20" : "bg-blue-200/50"}`}
        />

        {/* Header */}
        <div
          className={`h-24 px-10 flex items-center justify-between z-10 border-b backdrop-blur-sm
            ${isDark ? "bg-slate-900/50 border-white/10" : "bg-white/60 border-slate-200"}`}
        >
          <div>
            <h3 className={`text-3xl font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
              {title}
            </h3>
            <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {activeTab === "home" ? "Quick overview of the platform." : "Understand this section and proceed."}
            </p>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 overflow-y-auto p-10">
          <div
            className={`max-w-4xl rounded-3xl border p-8 transition-colors
              ${isDark ? "bg-slate-900/40 border-white/10" : "bg-white border-slate-200"}`}
          >
            <div
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold
                ${isDark ? "border-white/10 bg-white/5 text-slate-200" : "border-slate-200 bg-slate-50 text-slate-700"}`}
            >
              <ShieldCheck className="w-4 h-4 text-blue-500" />
              Verified IITK-only access
            </div>

            <h1 className={`text-4xl font-bold mt-5 ${isDark ? "text-white" : "text-slate-900"}`}>
              {activeTab === "home" ? "IncognIITo — Anonymous Connections, Real Conversations." : title}
            </h1>

            <p className={`text-base mt-4 leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              {desc}
            </p>

            {/* HOME */}
            {activeTab === "home" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
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
            ) : (
              // OTHER TABS placeholder (you’ll implement later)
              <div className="mt-8 space-y-4">
                <MiniStep isDark={isDark} n="01" t="Read the details" d="Understand what this section controls." />
                <MiniStep isDark={isDark} n="02" t="Take action" d="Accept/decline, open chats, or join queue." />
                <MiniStep isDark={isDark} n="03" t="Stay safe" d="Use report/block if anything feels wrong." />

                <button className="mt-3 w-full group relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 text-white font-bold text-sm shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]">
                  <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
                  <div className="relative flex items-center justify-center gap-2">
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              </div>
            )}
          </div>
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
          className={`w-10 h-10 rounded-xl flex items-center justify-center
            ${isDark ? "bg-gradient-to-br from-blue-600 to-purple-600" : "bg-gradient-to-br from-blue-500 to-indigo-500"}`}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
        <h4 className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{title}</h4>
      </div>
      <p className={`text-sm mt-2 ${isDark ? "text-slate-400" : "text-slate-600"}`}>{text}</p>
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
        <div className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>{d}</div>
      </div>
    </div>
  );
}