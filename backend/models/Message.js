const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  school: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
  messageType: { 
    type: String, 
    enum: ["text", "ai-query"],
    default: "text" 
  },
  content: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date },
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // For teacher-parent conversations about specific student
  conversationType: { 
    type: String, 
    enum: ["teacher_student", "teacher_parent"],
    default: "teacher_student"
  }
}, { 
  timestamps: true
});
messageSchema.index({ from: 1, to: 1, createdAt: -1 });
messageSchema.index({ school: 1, conversationType: 1 });

module.exports = mongoose.model("Message", messageSchema);