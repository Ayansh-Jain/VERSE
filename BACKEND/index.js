import cluster from "cluster";
import os from "os";
import path from "path";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import http from "http";
import jwt from "jsonwebtoken";
import { Server as SocketIO } from "socket.io";
import compression from "compression";

import connectDB from "./db/connectDB.js";
import userRoutes from "./routes/userRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import pollRoutes from "./routes/pollRoutes.js";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();

// Cluster setup for multi-core
if (cluster.isPrimary) {
  const cpus = os.cpus().length;
  console.log(`Master process is forking ${cpus} workers`);
  for (let i = 0; i < cpus; i++) cluster.fork();
} else {
  // Worker processes run the server
  connectDB();
  const app = express();
  const PORT = process.env.PORT || 3000;

  // ─── CORS ────────────────────────────────────────────────────────────────
  const allowedOrigins = new Set([
    process.env.CLIENT_URL,
    `https://www.${new URL(process.env.CLIENT_URL).host}`,
    `https://${new URL(process.env.CLIENT_URL).host}`,
  ]);
  app.use(cors({
    origin(origin, cb) {
      if (!origin || allowedOrigins.has(origin)) return cb(null, true);
      cb(new Error(`CORS policy: ${origin} not allowed`));
    },
    credentials: true,
  }));

  // ─── PERFORMANCE ─────────────────────────────────────────────────────────
  app.use(compression());

  // ─── SECURITY & PARSERS ──────────────────────────────────────────────────
  app.use(helmet());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Serve static assets separately with cache control
  app.use(
    "/assets",
    express.static(path.join(process.cwd(), "public/assets"), {
      maxAge: "10s",
      etag: false,
      lastModified: true
    })
  );

  // ─── ROUTES ────────────────────────────────────────────────────────────────
  app.use("/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/posts", postRoutes);
  app.use("/api/messages", messageRoutes);
  app.use("/api/polls", pollRoutes);
  app.get("/api/test", (req, res) => res.status(200).json({ message: "Backend is alive" }));

  // ─── SERVER & SOCKET.IO ─────────────────────────────────────────────────
  const server = http.createServer(app);
  const io = new SocketIO(server, {
    cors: { origin: Array.from(allowedOrigins), credentials: true },
    transports: process.env.NODE_ENV === "production" ? ["websocket"] : ["websocket", "polling"],
  });

  app.set("socketio", io);

  // Socket authentication
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication error: No token"));
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return next(new Error("Authentication error: Invalid token"));
      socket.userId = decoded.id;
      next();
    });
  });

  io.on("connection", (socket) => {
    const userId = socket.userId;
    socket.join(userId.toString());
    io.emit("user_online", userId);

    socket.on("getOnlineUsers", () => {
      // derive rooms that are single-socket userIds
      const online = Array.from(io.sockets.adapter.rooms.keys()).filter(r => io.sockets.adapter.rooms.get(r).has(r));
      socket.emit("onlineUsers", online);
    });

    socket.on("joinRoom", (roomId) => socket.join(roomId.toString()));

    socket.on("sendMessage", (msg) => {
      const recv = msg.receiver.toString();
      io.to(recv).emit("receiveMessage", msg);
      const snd = (msg.sender._id || msg.sender).toString();
      if (snd !== recv) io.to(snd).emit("receiveMessage", msg);
    });

    socket.on("disconnect", () => {
      io.emit("user_offline", userId);
    });
  });

  server.listen(PORT, () => console.log(`Worker ${process.pid} running on port ${PORT}`));
}