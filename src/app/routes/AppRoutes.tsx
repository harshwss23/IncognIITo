import React, { useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { AdminRoute } from "../components/AdminRoute";
import { PublicRoute } from "../components/PublicRoute";

import { Loader2, MonitorSmartphone, AlertTriangle, ArrowRight, Sparkles } from "lucide-react";
import { buildApiUrl } from "@/services/config";
import { getAccessToken } from "@/services/auth";
import { useEffect } from "react";
// Components
import { FuturisticChatInterface } from "../components/FuturisticChatInterface";
import { ChatRequestsDashboard } from "../components/ChatRequestsDashboard";
import { MainDashboard } from "../components/MainDashboard";
import { LiveInteractionRoom } from "../components/LiveInteractionRoom";
import { UserProfile } from "../components/UserProfile";
import { LandingAuthPortal } from "../components/LandingAuthPortal";
import { RegistrationScreen } from "../components/RegistrationScreen";
import { DedicatedLoginScreen } from "../components/DedicatedLoginScreen";
import { PostSessionModal } from "../components/PostSessionModal";
import { AdminDashboard } from "../components/AdminDashboard";
import { ForgotPasswordScreen } from "../components/ForgptPassword";
import { HomePageScreen } from "../components/Homepage";
import { MatchingBuffer } from "../components/MatchingBuffer";
import { PublicUserProfile } from "../components/PublicUserProfile";
import { useTheme } from "../contexts/ThemeContext";
import { ThemeToggle } from "../components/ThemeToggle";

// Import SINGLE socket instance! Adjust path if needed
import { socket } from "../../services/socket"; 

// ─── 🛡️ SESSION BLOCKED SCREEN ──────────────────────────────────
// ─── 🛡️ SMART SESSION BLOCKED SCREEN ──────────────────────────────────
export const SessionBlockedScreen = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true); // 🔥 NEW: Verification state
  const token = getAccessToken();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    if (!token) return;

    let isMounted = true;

    // Server ne bola "Koi aur tab nahi hai", wapas jao homepage pe
    const handleNoConflict = () => {
      if (isMounted) {
        navigate('/homepage', { replace: true });
      }
    };

    // Server ne bola "Haan sach mein block ho", ab button dikhao
    const handleBlocked = () => {
      if (isMounted) {
        setIsVerifying(false); 
      }
    };

    socket.on("no_conflict", handleNoConflict);
    socket.on("multiple_tabs_error", handleBlocked);

    // Jab user /blocked pe aaye, ek test connection bhej ke dekho
    socket.auth = { token };
    socket.connect();

    // Safety Timeout: Agar server se 2 second tak koi jawab na aaye (network issue), 
    // toh ghumne ki jagah UI dikha do taaki user stuck na rahe.
    const timeoutId = setTimeout(() => {
      if (isMounted && isVerifying) {
        setIsVerifying(false);
      }
    }, 2000);

    return () => {
      isMounted = false;
      socket.off("no_conflict", handleNoConflict);
      socket.off("multiple_tabs_error", handleBlocked);
      clearTimeout(timeoutId);
    };
  }, [token, navigate]);

  if (!token) {
    return <Navigate to="/" replace />;
  }

  // 🔥 Jab tak server verify kar raha hai, user ko ek loading screen dikhao
  if (isVerifying) {
    return (
      <div className={`min-h-[100dvh] flex flex-col items-center justify-center transition-colors duration-500 ${isDark ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"}`}>
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
        <p className={`font-medium animate-pulse ${isDark ? "text-slate-400" : "text-slate-600"}`}>
          Verifying session status...
        </p>
      </div>
    );
  }

  const handleUseHere = async () => {
    setIsLoading(true);

    const channel = new BroadcastChannel('incogniito_tabs');
    channel.postMessage('TAKE_OVER');
    channel.close();

    try {
      fetch(buildApiUrl('/api/match/force-disconnect'), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(() => {});
      fetch(buildApiUrl('/api/match/leave'), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(() => {});
    } catch (error) {
      console.error("Error clearing session:", error);
    }

    socket.disconnect();
    
    let hasNavigated = false;

    const executeTakeover = () => {
      if (hasNavigated) return;
      hasNavigated = true;
      socket.auth = { token }; 
      setIsLoading(false);
      navigate('/homepage', { replace: true });
    };

    socket.once("takeover_success", executeTakeover);
    socket.auth = { token, takeover: true };
    socket.connect();

    setTimeout(() => {
      if (!hasNavigated) {
        console.warn("Server takeover event delayed. Forcing navigation.");
        executeTakeover();
      }
    }, 2000); 
  };

  return (
    <div className={`relative min-h-[100dvh] w-full flex items-center justify-center p-4 overflow-hidden transition-colors duration-500 ${isDark ? "bg-slate-950" : "bg-slate-50"}`}>
      <div className="absolute top-6 right-6 sm:top-8 sm:right-8 z-50">
        <ThemeToggle />
      </div>
      
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className={`absolute w-[300px] h-[300px] rounded-full blur-[100px] opacity-20 transform -translate-y-20 ${isDark ? "bg-red-600" : "bg-red-400"}`} />
        <div className={`absolute w-[400px] h-[400px] rounded-full blur-[120px] opacity-20 transform translate-y-32 translate-x-20 ${isDark ? "bg-orange-600" : "bg-orange-300"}`} />
      </div>

      <div className={`relative z-10 max-w-lg w-full rounded-[2rem] border p-8 md:p-10 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-500
        ${isDark ? "bg-slate-900/60 border-white/10 shadow-black/50" : "bg-white/80 border-slate-200 shadow-slate-200"}`}>
        <div className="flex flex-col items-center text-center">
          
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold mb-6
            ${isDark ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-red-50 border-red-200 text-red-600"}`}>
            <AlertTriangle className="w-4 h-4" />
            Session Conflict Detected
          </div>

          <div className="relative mb-6">
            <div className={`absolute inset-0 rounded-full blur-xl opacity-50 ${isDark ? "bg-red-500" : "bg-red-300"}`}></div>
            <div className={`relative w-20 h-20 rounded-3xl flex items-center justify-center border shadow-inner
              ${isDark ? "bg-gradient-to-br from-slate-800 to-slate-900 border-white/10" : "bg-gradient-to-br from-white to-slate-100 border-slate-200"}`}>
              <MonitorSmartphone className={`w-10 h-10 ${isDark ? "text-slate-300" : "text-slate-700"}`} />
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              </div>
            </div>
          </div>

          <h1 className={`text-3xl md:text-4xl font-black mb-3 tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
            App is open elsewhere
          </h1>
          <p className={`text-sm md:text-base leading-relaxed mb-8 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            IncognIITo is currently active in another tab or device. To maintain a secure and anonymous environment, only one active session is allowed at a time.
          </p>

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

// ─── 🛣️ ROUTES CONFIGURATION ────────────────────────────────
export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        {/* Public Routes */}
        <Route path="/" element={<PublicRoute><LandingAuthPortal /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegistrationScreen /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><DedicatedLoginScreen /></PublicRoute>} />
        <Route path="/forgot" element={<PublicRoute><ForgotPasswordScreen /></PublicRoute>} />

        {/* Error Route */}
        <Route path="/blocked" element={<SessionBlockedScreen />} />

        {/* Protected Routes */}
        <Route path="/chat" element={<ProtectedRoute><FuturisticChatInterface /></ProtectedRoute>} />
        <Route path="/requests" element={<ProtectedRoute><ChatRequestsDashboard /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><MainDashboard /></ProtectedRoute>} />
        <Route path="/live" element={<ProtectedRoute><LiveInteractionRoom /></ProtectedRoute>} />
        <Route path="/live/:roomId" element={<ProtectedRoute><LiveInteractionRoom /></ProtectedRoute>} />
        <Route path="/matchmaking" element={<ProtectedRoute><MatchingBuffer /></ProtectedRoute>} />
        <Route path="/match-waiting" element={<ProtectedRoute><MatchingBuffer /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
        
        <Route path="/profile/:id" element={<ProtectedRoute><PublicUserProfile /></ProtectedRoute>} />
        <Route path="/users/:id" element={<ProtectedRoute><PublicUserProfile /></ProtectedRoute>} />
        <Route path="/session/:roomid" element={<ProtectedRoute><PostSessionModal /></ProtectedRoute>} />
        <Route path="/homepage" element={<ProtectedRoute><HomePageScreen /></ProtectedRoute>} />
        <Route path="/user/:id" element={<ProtectedRoute><PublicUserProfile /></ProtectedRoute>} />

        {/* Admin Route */}
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
