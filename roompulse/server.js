const express = require("express");
const next = require("next");
const http = require("http");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

let ioRef = null;

function registerSocket(io) {
  ioRef = io;
  io.on("connection", (socket) => {
    socket.on("joinRoom", (roomId) => {
      if (typeof roomId === "string") socket.join(roomId);
    });
  });
}

function emitAggregate(roomId, payload) {
  if (ioRef) ioRef.to(roomId).emit("aggregate", payload);
}

// Make emitter available to API routes via global (simple, effective)
global.__ROOMPULSE_EMIT_AGG__ = emitAggregate;

async function main() {
  await app.prepare();

  const expressApp = express();
  const server = http.createServer(expressApp);

  const io = new Server(server, {
    cors: { origin: true, credentials: true }
  });

  registerSocket(io);

  expressApp.all("*", (req, res) => handle(req, res));

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  server.listen(port, () => {
    console.log(`RoomPulse running on http://localhost:${port} (dev=${dev})`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
