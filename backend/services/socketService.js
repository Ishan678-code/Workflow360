import { Server } from "socket.io";

let io;

export function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || "*",
      methods: ["GET", "POST"],
    },
    path: "/socket.io",
  });

  io.on("connection", (socket) => {
    socket.on("join", (userId) => {
      if (!userId) return;
      socket.join(userId.toString());
    });

    socket.on("disconnect", () => {
      // Client disconnected.
    });
  });

  return io;
}

export function sendNotification(userId, payload) {
  if (!io || !userId) return;
  io.to(userId.toString()).emit("notification", payload);
}
