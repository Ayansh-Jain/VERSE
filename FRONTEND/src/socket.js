// src/socket.js
import { io } from "socket.io-client";

const SOCKET_SERVER_URL =
  import.meta.env.VITE_SOCKET_SERVER_URL || "https://verse-48io.onrender.com";

const socket = io(SOCKET_SERVER_URL, {
  auth: {
    token: localStorage.getItem("verse_token"),
  },
  transports: ["websocket", "polling"],
});

socket.on("connect", () => {
  console.log(`✅ Connected to socket server (id=${socket.id})`);
});

socket.on("connect_error", (err) => {
  console.error("❌ Socket connection error:", err);
});

export default socket;
