import React from "react";
import { ThemeProvider } from "@/app/contexts/ThemeContext";
import AppRoutes from "@/app/routes/AppRoutes";
import { useGlobalCleanUp } from '@/app/hooks/useGlobalCleanup'; // Hook import karo
export default function App() {
  useGlobalCleanUp(); // Hook call karo
  return (
    <ThemeProvider>
      <AppRoutes />
    </ThemeProvider>
  );
}
