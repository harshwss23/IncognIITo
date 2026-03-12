import { io } from "socket.io-client";
import { socketUrl } from "@/services/config";

export const socket = io(socketUrl, {
  auth: (callback) => {
    callback({ token: localStorage.getItem("token") });
  },
  transports: ["websocket"],
});