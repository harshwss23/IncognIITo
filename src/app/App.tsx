import React from "react";
import { ThemeProvider } from "@/app/contexts/ThemeContext";
import AppRoutes from "@/app/routes/AppRoutes";

export default function App() {
  return (
    <ThemeProvider>
      <AppRoutes />
    </ThemeProvider>
  );
}
