import React, { useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { AdminRoute } from "../components/AdminRoute";
import { getAccessToken } from "@/services/auth";
import { socket } from "@/services/socket";
import { Loader2 } from "lucide-react";

// Components
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
import { ActiveUsersScreen } from "../components/ActiveUsersScreen";
import { MatchingBuffer } from "../components/MatchingBuffer";

// ─── SESSION BLOCKED SCREEN (WITH TAKEOVER LOGIC) ─────────────────────────────
const SessionBlockedScreen = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleUseHere = async () => {
    setIsLoading(true);
    const token = getAccessToken();

    // 1. Purane tabs ko message bhejo ki wo apna socket disconnect kar lein
    const channel = new BroadcastChannel('incogniito_tabs');
    channel.postMessage('TAKE_OVER');
    channel.close();

    // 2. Wait for 500ms taaki purana tab (aur uska Live Room) properly destroy ho jaye
    await new Promise(resolve => setTimeout(resolve, 500));

    // 3. Backend states clear karo (Queue leave karo aur agar live match mein tha toh end karo)
    try {
      if (token) {
        // Leave Matchmaking Queue just in case
        await fetch('http://localhost:5050/api/match/leave', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(err => console.log("Leave queue info:", err));
        
        // Force End any active session
        await fetch('http://localhost:5050/api/match/end', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(err => console.log("End session info:", err));
      }
    } catch (error) {
      console.error("Error clearing session:", error);
    }

    // 4. Apna socket wapas connect karo aur Homepage pe jao
    if (token) {
      socket.auth = { token };
      socket.connect();
    }
    
    setIsLoading(false);
    navigate('/homepage', { replace: true });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
      <div className="p-8 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Access Denied</h2>
        <p className="text-slate-300 mb-6">
          IncognIITo is already open in another window or device.
        </p>
        <p className="text-slate-500 text-sm mb-8">
          To use the app here, close the other tab or click the button below to force a takeover.
        </p>
        
        <button 
          onClick={handleUseHere}
          disabled={isLoading}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-blue-500/25 flex items-center justify-center disabled:opacity-70 disabled:hover:scale-100 hover:scale-[1.02]"
        >
          {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Use Here Instead"}
        </button>
      </div>
    </div>
  );
};

// ─── ROUTES CONFIGURATION ────────────────────────────────
export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        {/* Public Routes */}
        <Route path="/" element={<LandingAuthPortal />} />
        <Route path="/register" element={<RegistrationScreen />} />
        <Route path="/login" element={<DedicatedLoginScreen />} />
        <Route path="/forgot" element={<ForgotPasswordScreen />} />
        
        {/* The Error Route for Duplicate Tabs */}
        <Route path="/blocked" element={<SessionBlockedScreen />} />

        {/* 🛡️ Protected Routes */}
        <Route path="/chat" element={<ProtectedRoute><FuturisticChatInterface /></ProtectedRoute>} />
        <Route path="/requests" element={<ProtectedRoute><ChatRequestsDashboard /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><MainDashboard /></ProtectedRoute>} />
        <Route path="/live" element={<ProtectedRoute><LiveInteractionRoom /></ProtectedRoute>} />
        <Route path="/live/:roomId" element={<ProtectedRoute><LiveInteractionRoom /></ProtectedRoute>} />
        <Route path="/matchmaking" element={<ProtectedRoute><MatchingBuffer /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
        <Route path="/session/:roomid" element={<ProtectedRoute><PostSessionModal /></ProtectedRoute>} />
        <Route path="/homepage" element={<ProtectedRoute><HomePageScreen /></ProtectedRoute>} />
        <Route path="/active-users" element={<ProtectedRoute><ActiveUsersScreen /></ProtectedRoute>} />

        {/* Admin Route */}
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}