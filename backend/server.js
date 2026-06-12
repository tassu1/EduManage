const express = require("express");
const connectDB = require('./config/db');
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const superadmin = require("./routes/superAdminRoutes");
const schoolAdminRoutes = require("./routes/schoolAdminRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const studentRoutes = require("./routes/studentRoutes");
const parentRoutes = require("./routes/parentRoutes");
const { handleAILearning, getLearningHistory } = require("./socketHandlers/aiSocketHandler");
const { handleChatMessage, handleTyping } = require("./socketHandlers/chatSocketHandler");
const app = express();
const PORT = process.env.PORT || 5000;


app.use(express.json());
app.use(cors(
  {
  origin: "*", 
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}
));


connectDB();

app.use("/api/auth", authRoutes);
app.use("/api/super", superadmin);
app.use("/api/school-admin", schoolAdminRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/parent", parentRoutes);


app.get("/", (req, res) => {
  res.send("School Management Backend is running!");
});


const server = require('http').createServer(app);
const io = require("socket.io")(server, {
   cors: {
    origin: "*", 
    methods: ["GET", "POST"],
    credentials: true
  }
});


io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

 
  socket.on("join-user", (userId) => {
    socket.join(userId);
  });

  socket.on("ask-ai-tutor", (learningData) => {
    console.log("Student asking AI tutor:", learningData);
    handleAILearning(socket, learningData);
  });

  socket.on("get-learning-history", (userId) => {
    getLearningHistory(socket, userId);
  });

  socket.on("send-chat-message", (messageData) => {
    handleChatMessage(socket, messageData);
  });

  socket.on("typing-start", (data) => {
    handleTyping(socket, { ...data, typing: true });
  });

  socket.on("typing-stop", (data) => {
    handleTyping(socket, { ...data, typing: false });
  });

  
});


server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);

});