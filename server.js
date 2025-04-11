require("dotenv").config();
const express = require("express");
const app = express();
const http = require("http");
const socketIO = require("socket.io");

const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
  },
});

const port = process.env.PORT || 4000;
const cors = require("cors");
const authRoutes = require("./routers/authRoutes");
const profileRoutes = require("./routers/profileRoutes");
const userRoutes = require("./routers/userRoutes");
const connectDB = require("./db");
const path = require("path");
const Message = require("./models/Message");
const Conversation = require("./models/Conversation");
const User = require("./models/User");
const jwt = require("jsonwebtoken");

connectDB();

app.use(cors());
app.use(express.json());

app.use(express.static("public"));

app.use("/images", express.static(path.join(__dirname, "../public/images")));

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/user", userRoutes);

const authenticateUser = (token) => {
  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    return decodedToken.userId;
  } catch (error) {
    console.log(error);
  }
};

io.use((socket, next) => {
  const token = socket.handshake.query.token;
  const userId = authenticateUser(token);

  if (userId) {
    socket.userId = userId;
    next();
  }
});

io.on("connection", async (socket) => {
  console.log("a user connected", socket.userId);

  const userId = socket.userId; // getting userId from previous middleware

  // Store the socketId in the user document in the DB
  await User.findByIdAndUpdate(userId, { isOnline: true, socketId: socket.id });

  // let other user know that this user is online
  socket.broadcast.emit("userStatusChanged", {
    userId,
    isOnline: true,
  });

  // Send message logic
  socket.on("sendMessage", async ({ recipientId, text }) => {
    const senderId = socket.userId;

    try {
      let conversation = await Conversation.findOne({
        participants: { $all: [senderId, recipientId] },
      });

      if (!conversation) {
        conversation = await Conversation.create({
          participants: [senderId, recipientId],
        });

        await User.findByIdAndUpdate(senderId, {
          $push: { conversations: conversation._id },
        });
        await User.findByIdAndUpdate(recipientId, {
          $push: { conversations: conversation._id },
        });
      }

      const newMessage = await Message.create({
        conversationId: conversation._id,
        sender: senderId,
        text,
      });

      conversation.lastMessage = newMessage._id;
      await conversation.save();

      // Emit the message to the recipient using their socketId stored in the DB
      const recipient = await User.findById(recipientId);
      if (recipient?.socketId) {
        io.to(recipient.socketId).emit("messageReceived", newMessage);
      }

      io.to(socket.id).emit("messageSent", newMessage);
    } catch (e) {
      console.log(e);
    }
  });

  socket.on("disconnect", async () => {
    console.log("⛔ User disconnected:", userId);

    await User.findByIdAndUpdate(userId, {
      isOnline: false,
      socketId: null,
    });

    // Optional: Notify others user went offline
    socket.broadcast.emit("userStatusChanged", {
      userId,
      isOnline: false,
    });
  });
});

server.listen(port, console.log("Server is running on port ", port));
