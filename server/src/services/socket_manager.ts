import { Server as HttpServer } from "http";
import { Server as SocketServer } from "socket.io";
import { processManager } from "../services/process_manager.js";

export function setupWebSocket(httpServer: HttpServer) {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || "*",
      methods: ["GET", "POST"],
    },
    path: "/socket.io",
  });

  // Pass io instance to process manager for broadcasting logs
  processManager.setSocketServer(io);

  io.on("connection", (socket) => {
    console.log("Client connected to WebSocket:", socket.id);

    // Join room for specific app to receive logs
    socket.on("join-app", (appId: number) => {
      socket.join(`app-${appId}`);
      console.log(`Socket ${socket.id} joined app-${appId}`);
    });

    // Leave app room
    socket.on("leave-app", (appId: number) => {
      socket.leave(`app-${appId}`);
      console.log(`Socket ${socket.id} left app-${appId}`);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  return io;
}

