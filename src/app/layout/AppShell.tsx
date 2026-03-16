import React, { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { useThemeColors } from "@/app/hooks/useThemeColors";

export function AppShell() {
  const colors = useThemeColors();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const publicPaths = ["/login", "/register", "/landing", "/forgot"];
    const isPublicPath = publicPaths.some((path) => location.pathname.startsWith(path));

    if (!token && !isPublicPath) {
      navigate("/login");
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

      {/* FLOATING CONTROLS */}
      <div className="fixed top-6 right-8 z-[100] flex items-center gap-4 bg-white/10 backdrop-blur-md p-2 rounded-full border border-white/20 shadow-lg">
        <span className={`text-xs font-bold px-2 ${colors.textPrimary}`}>App</span>
        <ThemeToggle />
      </div>

      {/* ROUTE CONTENT */}
      <main className="relative h-full w-full">
        <Outlet />
      </main>
    </div>
  );
}
