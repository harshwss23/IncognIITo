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

// Listener for matchmaking events
// This is called when the backend matches two users
socket.on("matched", (payload: { roomId: string; matchScore: number; event: string }) => {
  console.log("✅ Matched event received:", payload);
  // The MatchingBuffer component will listen for this event and navigate to live room
});

// Listener for connection errors
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