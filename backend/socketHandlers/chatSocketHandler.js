const Message = require("../models/Message");
const User = require("../models/User");
const Classroom = require("../models/Classroom");

const handleChatMessage = async (socket, messageData) => {
  try {
    const { from, to, content, schoolId, studentId } = messageData;
    if (!content?.trim()) {
      socket.emit("message-error", { error: "Message content is required" });
      return;
    }
    if (!from || !to || !schoolId) {
      socket.emit("message-error", { error: "Missing required fields" });
      return;
    }

    const [fromUser, toUser] = await Promise.all([
      User.findById(from),
      User.findById(to)
    ]);

    if (!fromUser || !toUser) {
      socket.emit("message-error", { error: "User not found" });
      return;
    }

    if (fromUser.school.toString() !== schoolId || toUser.school.toString() !== schoolId) {
      socket.emit("message-error", { error: "School mismatch" });
      return;
    }

    let conversationType = "teacher_student";
    let studentRef = null;

    if ((fromUser.role === 'teacher' && toUser.role === 'parent') || 
        (fromUser.role === 'parent' && toUser.role === 'teacher')) {
      conversationType = "teacher_parent";
      studentRef = studentId; 
    }

    const message = await Message.create({
      from,
      to,
      school: schoolId,
      messageType: "text",
      content: content.trim(),
      conversationType,
      student: studentRef
    });

    await message.populate('from', 'name role email');
    socket.to(to).emit("new-chat-message", {
      id: message._id,
      from: message.from,
      content: message.content,
      conversationType: message.conversationType,
      student: studentRef,
      timestamp: message.createdAt
    });

    socket.emit("message-sent", {
      id: message._id,
      success: true,
      message: {
        _id: message._id,
        content: message.content,
        createdAt: message.createdAt,
        conversationType: message.conversationType
      }
    });

  } catch (error) {
    socket.emit("message-error", {
      error: "Failed to send message"
    });
  }
};


const handleTyping = (socket, data) => {
  socket.to(data.to).emit("user-typing", {
    from: data.from,
    typing: data.typing
  });
};



module.exports = {
  handleChatMessage,
  handleTyping
  
};