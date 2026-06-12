const { getAIResponse } = require("../config/ai");
const User = require("../models/User");
const Message = require("../models/Message");

const handleAILearning = async (socket, learningData) => {
  try {
    const { message, userId } = learningData;
    if (!message?.trim()) {
      socket.emit("ai-error", {
        error: "Please ask a question to learn",
        timestamp: new Date()
      });
      return;
    }

    const student = await User.findById(userId)
      .populate('classroom school')
      .select('name classroom school role');
    
    if (!student || student.role !== 'student') {
      socket.emit("ai-error", {
        error: "AI learning is only available for students",
        timestamp: new Date()
      });
      return;
    }

    const gradeLevel = student.classroom?.grade || "your grade";
    const studentName = student.name || "Student";

    const previousConversations = await Message.find({
      from: userId, 
      to: userId,
      messageType: "ai-query"
    })
    .sort({ createdAt: 1 }) 
    .limit(30);

    const conversationHistory = [];
    
    previousConversations.forEach(msg => {
      const [questionPart, answerPart] = msg.content.split('\n\nA: ');
      const question = questionPart.replace('Q: ', '');
      const answer = answerPart || msg.content;
   
      conversationHistory.push({ role: "user", content: question });
      conversationHistory.push({ role: "assistant", content: answer });
    });

    conversationHistory.push({ role: "user", content: message });

    socket.emit("ai-thinking", { thinking: true });
    const aiResponse = await getAIResponse(
      message.trim(), 
      gradeLevel,
      studentName,
      conversationHistory 
    );

    socket.emit("ai-thinking", { thinking: false });
    if (aiResponse.success) {
      const messageContent = `Q: ${message}\n\nA: ${aiResponse.answer}`;
   
      
      const savedMessage = await Message.create({
        from: userId,
        to: userId,
        school: student.school?._id,
        messageType: "ai-query",
        content: messageContent
      });
      
      socket.emit("new-conversation-added", {
        id: savedMessage._id,
        question: message,
        answer: aiResponse.answer,
        timestamp: savedMessage.createdAt,
        type: "ai-query"
      });
    }

    socket.emit("learning-response", {
      success: true,
      question: message, 
      answer: aiResponse.answer,
      gradeLevel,
      timestamp: new Date(),
      totalConversationMessages: conversationHistory.length + 1 
    });

  } catch (error) {

    socket.emit("ai-thinking", { thinking: false });
    socket.emit("ai-error", {
      error: "Our AI tutor is busy. Please try again in a moment.",
      timestamp: new Date()
    });
  }
};

const getLearningHistory = async (socket, userId) => {
  try {
   
    
    const learningSessions = await Message.find({
      from: userId, 
      to: userId,
      messageType: "ai-query"
    })
    .sort({ createdAt: -1 })
    .limit(50);

   

    const sessions = learningSessions.map(msg => {
      
      let question = '';
      let answer = '';
      
      if (msg.content.includes('\n\nA: ')) {
        const [questionPart, answerPart] = msg.content.split('\n\nA: ');
        question = questionPart.replace('Q: ', '');
        answer = answerPart || msg.content;
      } else {
        question = 'Previous question';
        answer = msg.content;
      }
      
      return {
        id: msg._id,
        question: question,
        answer: answer,
        timestamp: msg.createdAt,
        type: msg.messageType
      };
    });

    socket.emit("learning-history", {
      success: true,
      sessions: sessions,
      totalCount: sessions.length
    });

  } catch (error) {
    socket.emit("learning-history", {
      success: false,
      error: "Failed to load learning history",
      details: error.message
    });
  }
};

module.exports = {
  handleAILearning,
  getLearningHistory
};