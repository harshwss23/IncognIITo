import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/app/layout/AppShell";

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
        <Route path="/" element={<HomePageScreen />} />

        {/* Auth */}
        <Route path="/landing" element={<LandingAuthPortal />} />
        <Route path="/register" element={<RegistrationScreen />} />
        <Route path="/login" element={<DedicatedLoginScreen />} />
        <Route path="/forgot" element={<ForgotPasswordScreen />} />

        {/* App */}
        <Route path="/chat" element={<FuturisticChatInterface />} />
        <Route path="/requests" element={<ChatRequestsDashboard />} />
        <Route path="/dashboard" element={<MainDashboard />} />
        <Route path="/live" element={<LiveInteractionRoom />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="/session" element={<PostSessionModal />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/homepage" element={<HomePageScreen />} />
{/* To be removed Later at end Active Users*/}
<Route path="/active-users" element={<ActiveUsersScreen/>}/>
        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
