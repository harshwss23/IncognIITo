import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { AdminRoute } from "../components/AdminRoute";
import { PublicRoute } from "../components/PublicRoute";

// components (your existing screens)
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

export default function AppRoutes() {
  return (
    <Routes>
      {/* Global layout (background + theme toggle) */}
      <Route element={<AppShell />}>
        {/* Public Routes */}
        <Route path="/" element={<PublicRoute><LandingAuthPortal /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegistrationScreen /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><DedicatedLoginScreen /></PublicRoute>} />
        <Route path="/forgot" element={<PublicRoute><ForgotPasswordScreen /></PublicRoute>} />

        {/* Protected Routes */}
        <Route path="/chat" element={<ProtectedRoute><FuturisticChatInterface /></ProtectedRoute>} />
        <Route path="/requests" element={<ProtectedRoute><ChatRequestsDashboard /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><MainDashboard /></ProtectedRoute>} />
        <Route path="/live" element={<ProtectedRoute><LiveInteractionRoom /></ProtectedRoute>} />
        <Route path="/live/:roomId" element={<ProtectedRoute><LiveInteractionRoom /></ProtectedRoute>} />
        <Route path="/matchmaking" element={<ProtectedRoute><MatchingBuffer /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
        {/* Other person's profile */}
        <Route path="/profile/:id" element={<ProtectedRoute><PublicUserProfile /></ProtectedRoute>} />
        <Route path="/users/:id" element={<ProtectedRoute><PublicUserProfile /></ProtectedRoute>} />
        <Route path="/session/:roomid" element={<ProtectedRoute><PostSessionModal /></ProtectedRoute>} />
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/homepage" element={<ProtectedRoute><HomePageScreen /></ProtectedRoute>} />
        <Route path="/active-users" element={<ProtectedRoute><ActiveUsersScreen /></ProtectedRoute>} />
        <Route path="/match-waiting" element={<ProtectedRoute><MatchingBuffer /></ProtectedRoute>} />
        <Route path="/user/:id" element={<ProtectedRoute><PublicUserProfile /></ProtectedRoute>} />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}