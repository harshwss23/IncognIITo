import React, { useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { AdminRoute } from "../components/AdminRoute";
import { PublicRoute } from "../components/PublicRoute";

// Icons & Services (FIXED IMPORTS HERE 👇)
import { Loader2, MonitorSmartphone, AlertTriangle, ArrowRight, Sparkles } from "lucide-react";
import { buildApiUrl } from "@/services/config";
import { getAccessToken } from "@/services/auth";
import { socket } from "@/services/socket";

// Components (your existing screens)
import { FuturisticChatInterface } from "../components/FuturisticChatInterface";
import { ChatRequestsDashboard } from "../components/ChatRequestsDashboard";
import { MainDashboard } from "../components/MainDashboard";
import { LiveInteractionRoom } from "../components/LiveInteractionRoom";
import { UserProfile } from "../components/UserProfile";
import { LandingAuthPortal } from "../components/LandingAuthPortal";
import { RegistrationScreen } from "../components/RegistrationScreen";
import { OTPVerificationScreen } from "../components/OTPVerificationScreen";
import { DedicatedLoginScreen } from "../components/DedicatedLoginScreen";
import { PostSessionModal } from "../components/PostSessionModal";
import { AdminDashboard } from "../components/AdminDashboard";
import { ForgotPasswordScreen } from "../components/ForgptPassword";
import { HomePageScreen } from "../components/Homepage";
import { ActiveUsersScreen } from "../components/ActiveUsersScreen.jsx";
import { MatchingBuffer } from "../components/MatchingBuffer";
import { PublicUserProfile } from "../components/PublicUserProfile";
import { useTheme } from "../contexts/ThemeContext";
import { ThemeToggle } from "../components/ThemeToggle"; // YAHAN IMPORT KARO (Path check kar lena)
export const SessionBlockedScreen = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const token = getAccessToken();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // 🚨 Agar user logged in hi nahi hai, toh seedha login (/) pe bhejo
  if (!token) {
    return <Navigate to="/" replace />;
  }

  const handleUseHere = async () => {
    setIsLoading(true);

    // 1. Frontend Message: Active tabs ko turant hatane ke liye
    const channel = new BroadcastChannel('incogniito_tabs');
    channel.postMessage('TAKE_OVER');
    channel.close();

    try {
      // 2. 🚨 BACKEND STRIKE: Frozen/Background tabs ki taar server se kaato 🚨
      await fetch(buildApiUrl('/api/match/force-disconnect'), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(err => console.log("Force disconnect failed:", err));

      // 3. Purani Matchmaking/Live call clear karo
      await fetch(buildApiUrl('/api/match/leave'), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(err => console.log("Leave queue info:", err));
      
      await fetch(buildApiUrl('/api/match/end'), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(err => console.log("End session info:", err));
      
    } catch (error) {
      console.error("Error forcefully clearing session:", error);
    }

    // Server ko process karne ke liye ek tiny micro-delay do
    await new Promise(resolve => setTimeout(resolve, 300));

    // 4. Apna naya socket connect karo (Ab rasta ekdum saaf hai)
    socket.auth = { token };
    socket.connect();
    
    setIsLoading(false);
    navigate('/homepage', { replace: true });
  };

  return (
    // 👇 YAHAN CHANGE KIYA HAI (min-h-[100dvh]) 👇
    <div className={`relative min-h-[100dvh] w-full flex items-center justify-center p-4 overflow-hidden transition-colors duration-500 ${isDark ? "bg-slate-950" : "bg-slate-50"}`}>
      <div className="absolute top-6 right-6 sm:top-8 sm:right-8 z-50">
        <ThemeToggle />
      </div>
      {/* --- Ambient Background Glows --- */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className={`absolute w-[300px] h-[300px] rounded-full blur-[100px] opacity-20 transform -translate-y-20 ${isDark ? "bg-red-600" : "bg-red-400"}`} />
        <div className={`absolute w-[400px] h-[400px] rounded-full blur-[120px] opacity-20 transform translate-y-32 translate-x-20 ${isDark ? "bg-orange-600" : "bg-orange-300"}`} />
      </div>

      {/* --- Glassmorphic Card --- */}
      <div className={`relative z-10 max-w-lg w-full rounded-[2rem] border p-8 md:p-10 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-500
        ${isDark ? "bg-slate-900/60 border-white/10 shadow-black/50" : "bg-white/80 border-slate-200 shadow-slate-200"}`}
      >
        <div className="flex flex-col items-center text-center">
          
          {/* Badge */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold mb-6
            ${isDark ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-red-50 border-red-200 text-red-600"}`}>
            <AlertTriangle className="w-4 h-4" />
            Session Conflict Detected
          </div>

          {/* Icon Container */}
          <div className="relative mb-6">
            <div className={`absolute inset-0 rounded-full blur-xl opacity-50 ${isDark ? "bg-red-500" : "bg-red-300"}`}></div>
            <div className={`relative w-20 h-20 rounded-3xl flex items-center justify-center border shadow-inner
              ${isDark ? "bg-gradient-to-br from-slate-800 to-slate-900 border-white/10" : "bg-gradient-to-br from-white to-slate-100 border-slate-200"}`}>
              <MonitorSmartphone className={`w-10 h-10 ${isDark ? "text-slate-300" : "text-slate-700"}`} />
              
              {/* Notification Dot */}
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Typography */}
          <h1 className={`text-3xl md:text-4xl font-black mb-3 tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
            App is open elsewhere
          </h1>
          <p className={`text-sm md:text-base leading-relaxed mb-8 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            IncognIITo is currently active in another tab or device. To maintain a secure and anonymous environment, only one active session is allowed at a time.
          </p>

          {/* Action Button */}
          <button 
            onClick={handleUseHere}
            disabled={isLoading}
            className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-4 text-white font-bold text-sm sm:text-base shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
            <div className="relative flex items-center justify-center gap-2">
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Taking Over...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Use Here Instead</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </div>
          </button>

        </div>
      </div>
    </div>
  );
};
// ─── ROUTES CONFIGURATION ────────────────────────────────
export default function AppRoutes() {
  return (
    <Routes>
      {/* Global layout (background + theme toggle) */}
      <Route element={<AppShell />}>
        
        {/* 🟢 Public Routes */}
        <Route path="/" element={<PublicRoute><LandingAuthPortal /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegistrationScreen /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><DedicatedLoginScreen /></PublicRoute>} />
        <Route path="/forgot" element={<PublicRoute><ForgotPasswordScreen /></PublicRoute>} />

        {/* 🔴 The Error Route for Duplicate Tabs */}
        <Route path="/blocked" element={<SessionBlockedScreen />} />

        {/* 🛡️ Protected Routes */}
        <Route path="/chat" element={<ProtectedRoute><FuturisticChatInterface /></ProtectedRoute>} />
        <Route path="/requests" element={<ProtectedRoute><ChatRequestsDashboard /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><MainDashboard /></ProtectedRoute>} />
        <Route path="/live" element={<ProtectedRoute><LiveInteractionRoom /></ProtectedRoute>} />
        <Route path="/live/:roomId" element={<ProtectedRoute><LiveInteractionRoom /></ProtectedRoute>} />
        <Route path="/matchmaking" element={<ProtectedRoute><MatchingBuffer /></ProtectedRoute>} />
        <Route path="/match-waiting" element={<ProtectedRoute><MatchingBuffer /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
        
        {/* Other person's profile */}
        <Route path="/profile/:id" element={<ProtectedRoute><PublicUserProfile /></ProtectedRoute>} />
        <Route path="/users/:id" element={<ProtectedRoute><PublicUserProfile /></ProtectedRoute>} />
        
        <Route path="/session/:roomid" element={<ProtectedRoute><PostSessionModal /></ProtectedRoute>} />
        <Route path="/homepage" element={<ProtectedRoute><HomePageScreen /></ProtectedRoute>} />
        <Route path="/active-users" element={<ProtectedRoute><ActiveUsersScreen /></ProtectedRoute>} />
        <Route path="/user/:id" element={<ProtectedRoute><PublicUserProfile /></ProtectedRoute>} />

        {/* 👑 Admin Route */}
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

        {/* ⚡ Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}