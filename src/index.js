const path = require("path");
const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const Filter = require("bad-words");
const {
  generateMessage,
  generateLocationMessage
} = require("./utils/messages");
const {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom
} = require("./utils/users");

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

// This is going to fire, we socket.io server gets a new connection
io.on("connection", socket => {
  console.log("New web socket connection");

  socket.on("join", (options, cb) => {
    const { error, user } = addUser({ id: socket.id, ...options });

    if (error) return cb(error);

    socket.join(user.room);

    socket.emit("message", generateMessage("Admin", "Welcome!")); // Only the client just joined will get the message
    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        generateMessage("Admin", `${user.username} has joined!`)
      );

    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room)
    });

    cb();
  });

  socket.on("sendMessage", (msg, cb) => {
    const user = getUser(socket.id);
    const filter = new Filter();
    console.log(msg);

    if (filter.isProfane(msg)) return cb("Profanity is not allowed!");

    io.to(user.room).emit("message", generateMessage(user.username, msg)); // All clients will get the message
    cb(); // This will send the acknowledgement to the client that message has been received
  });

  socket.on("sendLocation", ({ latitude, longitude }, cb) => {
    const user = getUser(socket.id);
    io.to(user.room).emit(
      "locationMessage",
      generateLocationMessage(
        user.username,
        `https://google.com/maps?q=${latitude},${longitude}`
      )
    );
    cb();
  });

  // run when a given client disconnects - the message will be sent to all other clients than the one already disconnected
  socket.on("disconnect", () => {
    const user = removeUser(socket.id);
    if (user) {
      io.to(user.room).emit(
        "message",
        generateMessage("Admin", `${user.username} has left!`)
      );
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room)
      });
    }
  });
});

server.listen(port, () => {
  console.log(`Server is up on port ${port}`);
});
