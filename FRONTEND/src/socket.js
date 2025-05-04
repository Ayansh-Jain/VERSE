// src/socket.js
import { io } from "socket.io-client";

// Base URL for your Socket server (no trailing slash)
const SOCKET_SERVER_URL =
  import.meta.env.VITE_SOCKET_URL ||
  "https://verse-48io.onrender.com";

let socket = null;

/**
 * Initialize (or re-initialize) the socket connection.
 * Must be called after you have a valid `verse_token` in localStorage.
 */
export function connectSocket() {
  const token = localStorage.getItem("verse_token");
  if (!token) {
    console.warn("connectSocket(): no token found in localStorage.");
    return;
  }

  // If already connected, do nothing
  if (socket && socket.connected) {
    return socket;
  }

  // Otherwise, create a new socket instance
  socket = io(SOCKET_SERVER_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
  });

  socket.on("connect", () => {
    console.log(`✅ Connected to socket server (id=${socket.id})`);
  });

  socket.on("connect_error", (err) => {
    console.error("❌ Socket connection error:", err);
  });

  return socket;
}

/**
 * Retrieve the existing socket instance (or null if not initialized).
 */
export function getSocket() {
  return socket;
}
