// src/index.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import http from "http";
import jwt from "jsonwebtoken";
import { Server as SocketIO } from "socket.io";

import connectDB from "./db/connectDB.js";
import userRoutes from "./routes/userRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import pollRoutes from "./routes/pollRoutes.js";

dotenv.config();
connectDB();

const app = express();
const PORT = process.env.PORT || 3000;

// Security & CORS
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL,  // e.g. "https://verse-frontend.onrender.com"
    credentials: true,
  })
);

// Body parsers
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

// Static uploads
app.use("/uploads", express.static("public/uploads"));

// API routes
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/polls", pollRoutes);

// Simple health‑check
app.get("/api/test", (req, res) => {
  return res.status(200).json({ message: "Backend is alive" });
});

// Create HTTP server & Socket.IO instance
const server = http.createServer(app);
const io = new SocketIO(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

const onlineUsers = new Map();

// Socket authentication via Bearer token
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication error: No token"));
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error("Authentication error: Invalid token"));
    socket.userId = decoded.id || decoded._id;
    next();
  });
});

io.on("connection", (socket) => {
  const userId = socket.userId;
  onlineUsers.set(userId, socket.id);
  socket.join(userId.toString());
  io.emit("user_online", userId);

  socket.on("getOnlineUsers", () =>
    socket.emit("onlineUsers", Array.from(onlineUsers.keys()))
  );

  socket.on("joinRoom", (roomId) => socket.join(roomId.toString()));

  socket.on("sendMessage", (msg) => {
    const recv = msg.receiver.toString();
    io.to(recv).emit("receiveMessage", msg);

    const snd = (msg.sender._id || msg.sender).toString();
    if (snd !== recv) io.to(snd).emit("receiveMessage", msg);
  });

  socket.on("disconnect", () => {
    onlineUsers.delete(userId);
    io.emit("user_offline", userId);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
