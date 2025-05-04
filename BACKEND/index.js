// src/index.js  (your main server entrypoint)
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import http from "http";
import cookie from "cookie";
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
    origin:"https://verse-frontend.onrender.com",   // your FRONTEND URL
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static uploads
app.use("/uploads", express.static("public/uploads"));

// API routes
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/polls", pollRoutes);

// Debug endpoint
app.get("/api/test", (req, res) => {
  return res.status(200).json({ message: "Backend is alive" });
});

// HTTP + Socket.IO setup
const server = http.createServer(app);
const io = new SocketIO(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

const onlineUsers = new Map();

io.use((socket, next) => {
  try {
    const raw = socket.handshake.headers.cookie || "";
    const parsed = cookie.parse(raw);
    const token = parsed.jwt;
    if (!token) throw new Error("No JWT cookie");

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return next(new Error("Invalid token"));
      socket.userId = decoded.userId || decoded._id;
      next();
    });
  } catch (err) {
    console.error("Socket auth error:", err);
    return next(new Error("Authentication error"));
  }
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
