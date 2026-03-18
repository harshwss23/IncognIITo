import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getAccessToken, isTokenExpired } from "@/services/auth";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = getAccessToken();
  const location = useLocation();

  if (!token || isTokenExpired(token)) {
    // Redirect to login but save the current location to redirect back after login
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
