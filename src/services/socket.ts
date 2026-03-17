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

socket.on("connect_error", (error) => {
  if (error.message === "TOKEN_EXPIRED" || error.message === "INVALID_TOKEN" || error.message === "AUTH_REQUIRED") {
    clearAuthTokens();
    socket.disconnect();

    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }
});