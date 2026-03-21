import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import {
  ApiError,
  clearAuthTokens,
  fetchJsonWithAuth,
  getAccessToken,
  isTokenExpired,
} from "@/services/auth";
import { useGlobalCleanup } from "../hooks/useGlobalCleanup";
type MeResponse = {
  data?: {
    user?: {
      is_admin?: boolean;
    };
  };
};

export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const token = getAccessToken();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const verifyAdmin = async () => {
      if (!token || isTokenExpired(token)) {
        setIsChecking(false);
        return;
      }

      try {
        const me = await fetchJsonWithAuth<MeResponse>("/api/auth/me");
        if (cancelled) {
          return;
        }

        const admin = Boolean(me?.data?.user?.is_admin);
        if (!admin) {
          clearAuthTokens();
        }

        setIsAdmin(admin);
      } catch (err: unknown) {
        if (cancelled) {
          return;
        }

        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          clearAuthTokens();
        }

        setIsAdmin(false);
      } finally {
        if (!cancelled) {
          setIsChecking(false);
        }
      }
    };

    verifyAdmin();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!token || isTokenExpired(token)) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (isChecking) {
    return null;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};