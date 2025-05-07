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
connectDB();

const app = express();
const PORT = process.env.PORT || 3000;

// ─── CORS ───────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL,
  `https://www.${new URL(process.env.CLIENT_URL).host}`,
  `https://${new URL(process.env.CLIENT_URL).host}`,
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS policy: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

app.use(compression());

// ─── SECURITY & PARSERS ────────────────────────────────────────────────────────
app.use(helmet());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── CLIENT CACHE CONTROL ──────────────────────────────────────────────────────
app.use((req, res, next) => {
  // Cache static assets for 10 seconds
  res.set("Cache-Control", "public, max-age=10");
  next();
});

// ─── ROUTES ───────────────────────────────────────────────────────────────────
app.use("/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/polls", pollRoutes);

app.get("/api/test", (req, res) => {
  res.status(200).json({ message: "Backend is alive" });
});

// ─── SERVER & SOCKET.IO ────────────────────────────────────────────────────────
const server = http.createServer(app);
const io = new SocketIO(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// **Expose Socket.IO instance to controllers via `req.app.get("socketio")`**
app.set("socketio", io);

// Socket authentication via Bearer token
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("Authentication error: No token"));
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error("Authentication error: Invalid token"));
    socket.userId = decoded.id;
    next();
  });
});

const onlineUsers = new Map();

io.on("connection", (socket) => {
  const userId = socket.userId;
  onlineUsers.set(userId, socket.id);
  socket.join(userId.toString());
  io.emit("user_online", userId);

  socket.on("getOnlineUsers", () => {
    socket.emit("onlineUsers", Array.from(onlineUsers.keys()));
  });

  socket.on("joinRoom", (roomId) => {
    socket.join(roomId.toString());
  });

  socket.on("sendMessage", (msg) => {
    const recv = msg.receiver.toString();
    io.to(recv).emit("receiveMessage", msg);

    const snd = (msg.sender._id || msg.sender).toString();
    if (snd !== recv) {
      io.to(snd).emit("receiveMessage", msg);
    }
  });

  socket.on("disconnect", () => {
    onlineUsers.delete(userId);
    io.emit("user_offline", userId);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
