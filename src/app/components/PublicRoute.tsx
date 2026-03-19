import React from "react";
import { Navigate } from "react-router-dom";
import { getAccessToken, isTokenExpired } from "@/services/auth";

export const PublicRoute = ({ children, redirectPath = "/homepage" }: { children: React.ReactNode; redirectPath?: string }) => {
  const token = getAccessToken();

  if (token && !isTokenExpired(token)) {
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};
