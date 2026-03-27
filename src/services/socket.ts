import { io } from "socket.io-client";
import { socketUrl } from "@/services/config";
import { clearAuthTokens, getAccessToken } from "@/services/auth";

export const socket = io(socketUrl, {
  autoConnect: false,
  auth: (callback) => {
    callback({ token: getAccessToken() });
  },
  transports: ["websocket"],
});

// ─── 🛡️ GLOBAL SESSION ENFORCER ──────────────────────────────
socket.on("multiple_tabs_error", (message) => {
  console.warn("🚨 Session blocked by server:", message);
  
  // 1. Connection turant kaato taaki infinite reconnect loop na bane
  socket.disconnect(); 

  // 2. Hard redirect to blocked page
  if (window.location.pathname !== "/blocked") {
    window.location.href = "/blocked";
  }
});
// ────────────────────────────────────────────────────────────

// Listeners for matchmaking events
socket.on("matched", (payload: { roomId: string; matchScore: number; event: string }) => {
  console.log("✅ Matched event received:", payload);
});

socket.on("connect", () => {
  console.log("🟢 Socket connected successfully");
});

socket.on("disconnect", () => {
  console.warn("⚠️ Socket disconnected");
});

socket.on("connect_error", (error) => {
  if (error.message === "TOKEN_EXPIRED" || error.message === "INVALID_TOKEN" || error.message === "AUTH_REQUIRED") {
    clearAuthTokens();
    socket.disconnect();

    if (window.location.pathname !== "/") {
      window.location.href = "/";
    }
  }
});

// ─── 🔥 KILL GHOST SOCKETS ON REFRESH ──────────────────────────
// Ye ensure karega ki refresh hone par server pe murda connections na bachein
window.addEventListener("beforeunload", () => {
  if (socket.connected) {
    socket.disconnect();
  }
});
// ────────────────────────────────────────────────────────────
