import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/app/layout/AppShell";
import { ProtectedRoute } from "@/app/components/ProtectedRoute";

// components (your existing screens)
import { FuturisticChatInterface } from "@/app/components/FuturisticChatInterface";
import { ChatRequestsDashboard } from "@/app/components/ChatRequestsDashboard";
import { MainDashboard } from "@/app/components/MainDashboard";
import { LiveInteractionRoom } from "@/app/components/LiveInteractionRoom";
import { UserProfile } from "@/app/components/UserProfile";
import { LandingAuthPortal } from "@/app/components/LandingAuthPortal";
import { RegistrationScreen } from "@/app/components/RegistrationScreen";
import { OTPVerificationScreen } from "@/app/components/OTPVerificationScreen";
import { DedicatedLoginScreen } from "@/app/components/DedicatedLoginScreen";
import { PostSessionModal } from "@/app/components/PostSessionModal";
import { AdminDashboard } from "@/app/components/AdminDashboard";
import { ForgotPasswordScreen } from "@/app/components/ForgptPassword";
import { HomePageScreen } from "@/app/components/Homepage";
import { ActiveUsersScreen } from "../components/ActiveUsersScreen";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Global layout (background + theme toggle) */}
      <Route element={<AppShell />}>
        {/* Public Routes */}
        <Route path="/landing" element={<LandingAuthPortal />} />
        <Route path="/register" element={<RegistrationScreen />} />
        <Route path="/login" element={<DedicatedLoginScreen />} />
        <Route path="/forgot" element={<ForgotPasswordScreen />} />

        {/* Protected Routes */}
        <Route path="/" element={<ProtectedRoute><HomePageScreen /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><FuturisticChatInterface /></ProtectedRoute>} />
        <Route path="/requests" element={<ProtectedRoute><ChatRequestsDashboard /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><MainDashboard /></ProtectedRoute>} />
        <Route path="/live/:roomId" element={<LiveInteractionRoom />} />
        <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
        <Route path="/session" element={<ProtectedRoute><PostSessionModal /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/homepage" element={<ProtectedRoute><HomePageScreen /></ProtectedRoute>} />
        <Route path="/active-users" element={<ProtectedRoute><ActiveUsersScreen /></ProtectedRoute>} />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
