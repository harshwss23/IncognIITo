import { io } from "socket.io-client";
import { socketUrl } from "@/services/config";

export const socket = io(socketUrl, {
  auth: (callback) => {
    callback({ token: localStorage.getItem("token") });
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

socket.on("connect_error", (error: any) => {
  console.error("❌ Socket connection error:", error);
});