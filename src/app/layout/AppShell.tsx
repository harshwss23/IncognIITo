import React, { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useThemeColors } from "@/app/hooks/useThemeColors";
import { getAccessToken, isTokenExpired } from "@/services/auth";

export function AppShell() {
  const colors = useThemeColors();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = getAccessToken();
    const publicPaths = ["/", "/login", "/register", "/forgot"];
    const isPublicPath = publicPaths.some((path) => 
      path === "/" ? location.pathname === "/" : location.pathname.startsWith(path)
    );

    if ((!token || isTokenExpired(token)) && !isPublicPath) {
      navigate("/");
    }
  }, [location, navigate]);

  return (
    <div className={`h-screen w-screen overflow-hidden ${colors.bgPrimary}`}>
      {/* GLOBAL BACKGROUND */}
      <div className={`fixed inset-0 pointer-events-none transition-opacity duration-500 ${colors.gridOpacity}`}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: colors.gridPattern,
            backgroundSize: "100px 100px, 100px 100px, 20px 20px, 20px 20px",
          }}
        />
      </div>

      {/* ROUTE CONTENT */}
      <main className="relative h-full w-full">
        <Outlet />
      </main>
    </div>
  );
}
