import React, { useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { getAccessToken, isTokenExpired } from "@/services/auth";
import { socket } from "@/services/socket";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = getAccessToken();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Agar token valid hai, toh socket connect karo
    if (token && !isTokenExpired(token)) {
      if (!socket.connected) {
        console.log("🔒 Protected Route: Connecting Global Socket...");
        socket.auth = { token };
        socket.connect();
      }

      // 🚨 HANDLER: Backend se aane wale duplicate session errors
      const handleDuplicateSession = () => {
        console.log("Duplicate session detected by backend! Redirecting to /blocked");
        socket.disconnect(); // Socket band karo
        navigate('/blocked', { replace: true }); // Blocked screen pe bhej do
      };

      socket.on('session_already_active', handleDuplicateSession);
      socket.on('duplicate_session_detected', handleDuplicateSession);

      // 🚨 HANDLER: "Use Here" takeover signal frontend ke dusre tab se
      const channel = new BroadcastChannel('incogniito_tabs');
      channel.onmessage = (event) => {
        if (event.data === 'TAKE_OVER') {
          console.log("Another tab took over the session. Terminating here...");
          socket.disconnect(); // Apna socket kaat do
          navigate('/blocked', { replace: true }); // Khud block screen pe chale jao
        }
      };

      // Cleanup listeners when component unmounts
      return () => {
        socket.off('session_already_active', handleDuplicateSession);
        socket.off('duplicate_session_detected', handleDuplicateSession);
        channel.close(); // Clean up broadcast channel
      };
    }
  }, [token, navigate]);

  // Agar token hi nahi hai, toh login pe bhejo
  if (!token || isTokenExpired(token)) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};