// npm init -y
// npm i socket.io
const express = require("express");
const http = require("http");

const { Server } = require("socket.io");

const app = express();
const httpserver = http.createServer(app);

const io = new Server(httpserver);

// NEW: sirf user ke banaye rooms ki list (socket id wale default rooms hata kar)
function getRooms() {
  const list = [];
  for (const [name, members] of io.sockets.adapter.rooms) {
    if (!io.sockets.sockets.has(name)) list.push({ name, users: members.size });
  }
  return list;
}

let count = 0;
io.on("connection", (socket) => {
  count++;
  console.log("Active user: ", count);

  // Sending
  socket.emit("gyankibaat", "welcome to socket.io server");

  socket.broadcast.emit("join", "New User Joined");

  //   Reading
  socket.on("kuchbhi", (msg) => {
    console.log(msg);
  });

  socket.on("disconnect", () => {
    count--;
    console.log("Active user: ", count);
  });

  io.emit("announcement", "Today is last time we study web dev -3");

  // ================= NEW FEATURES (upar ka code same hai) =================

  socket.username = "User-" + socket.id.slice(0, 4);

  // username set karna
  socket.on("set-username", (name) => {
    name = String(name || "").trim().slice(0, 20);
    if (name) socket.username = name;
  });

  // public chat (sabke liye)
  socket.on("chat-message", (text) => {
    text = String(text || "").trim().slice(0, 500);
    if (!text) return;
    io.emit("chat-message", { user: socket.username, text, time: Date.now() });
  });

  // room banana / join karna
  socket.on("join-room", (room) => {
    room = String(room || "").trim().slice(0, 30);
    if (!room) return;
    socket.join(room);
    socket.emit("joined-room", room);
    io.to(room).emit("room-notice", { room, text: socket.username + " joined" });
    io.emit("room-list", getRooms());
  });

  // room chhodna
  socket.on("leave-room", (room) => {
    if (!socket.rooms.has(room)) return;
    socket.leave(room);
    socket.emit("left-room", room);
    io.to(room).emit("room-notice", { room, text: socket.username + " left" });
    io.emit("room-list", getRooms());
  });

  // sirf room ke members ko message
  socket.on("room-message", ({ room, text }) => {
    text = String(text || "").trim().slice(0, 500);
    if (!text || !socket.rooms.has(room)) return;
    io.to(room).emit("room-message", { room, user: socket.username, text, time: Date.now() });
  });

  socket.emit("room-list", getRooms());

  socket.on("disconnecting", () => {
    for (const room of socket.rooms) {
      if (room !== socket.id) {
        socket.to(room).emit("room-notice", { room, text: socket.username + " left" });
      }
    }
  });

  socket.on("disconnect", () => {
    io.emit("room-list", getRooms());
  });
});

httpserver.listen(8080, () => {
  console.log("Server started");
});
