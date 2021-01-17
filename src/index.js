const path = require("path");
const express = require("express");
const http = require("http");
const socketio = require("socket.io");

const app = express();
/**
 * The below line is required because we have to pass "server" to "socketio()"
 * REMEMEBER THAT EXPRESS ALWAYS CREATES A SERVER BEHIND THE SCENES BUT HERE WE ARE ARE CREATING EXPLICITLY
 * OTHERWISE WE CAN'T PASS IT TO SOCKETIO()
 */
const server = http.createServer(app);
const io = socketio(server); // creating new instance of socket.io and now our server supports websockets

const port = process.env.PORT || 3000;
const publicDirectory = path.join(__dirname, "../public");

app.use(express.static(publicDirectory));

// let count = 0;

// This is going to fire, we socket.io server gets a new connection
io.on("connection", socket => {
  console.log("New web socket connection");

  socket.emit("message", "Welcome!"); // Only the client just joined will get the message
  socket.broadcast.emit("message", "A new user has joined"); // message will be sent to all clients excepts the client just joined

  socket.on("sendMessage", msg => {
    io.emit("message", msg); // All clients will get the message
  });

  socket.on("sendLocation", ({ latitude, longitude }) => {
    io.emit("message", `https://google.com/maps?q=${latitude},${longitude}`);
  });

  // run when a given client disconnects - the message will be sent to all other clients than the one already disconnected
  socket.on("disconnect", () => {
    io.emit("message", "A user has left!");
  });
});

server.listen(port, () => {
  console.log(`Server is up on port ${port}`);
});
