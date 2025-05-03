// src/socket.js
import { io } from "socket.io-client";

const SOCKET_SERVER_URL =
  import.meta.env.VITE_SOCKET_SERVER_URL || "https://verse-48io.onrender.com";

const socket = io(SOCKET_SERVER_URL, {
  // ensure the browser will send the HTTP-only cookie along with the handshake
  withCredentials: true,
  transports: ["websocket", "polling"],
});

socket.on("connect", () => {
  console.log(`✅ Connected to socket server (id=${socket.id})`);
});

socket.on("connect_error", (err) => {
  console.error("❌ Socket connection error:", err);
  // You can implement retry logic here if you like, but
  // with HTTP-only cookies in place you shouldn't hit auth errors
});

// No more manual token management or storage event listeners!

export default socket;
