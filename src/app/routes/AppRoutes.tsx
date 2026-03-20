import React, { useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { AdminRoute } from "../components/AdminRoute";
import { PublicRoute } from "../components/PublicRoute";

// Icons & Services
import { Loader2 } from "lucide-react";
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
import { ActiveUsersScreen } from "../components/ActiveUsersScreen";
import { MatchingBuffer } from "../components/MatchingBuffer";
import { PublicUserProfile } from "../components/PublicUserProfile";

// ─── SESSION BLOCKED SCREEN (WITH TAKEOVER LOGIC) ─────────────────────────────
const SessionBlockedScreen = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const token = getAccessToken();

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
      // Ye naya REST API call hai jo humne banaya
      await fetch('http://localhost:5050/api/match/force-disconnect', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(err => console.log("Force disconnect failed:", err));

      // 3. Purani Matchmaking/Live call clear karo
      await fetch('http://localhost:5050/api/match/leave', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(err => console.log("Leave queue info:", err));
      
      await fetch('http://localhost:5050/api/match/end', {
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