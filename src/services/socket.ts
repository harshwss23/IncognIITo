import { io } from "socket.io-client";

const token = localStorage.getItem("token");

export const socket = io("http://localhost:5000", {
  auth: { token },
  transports: ["websocket"],
});