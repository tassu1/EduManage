const mongoose = require("mongoose");

const classroomSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  }, 
  grade: { 
    type: String, 
    required: true 
  }, 
  section: { 
    type: String, 
    required: true 
  }, 
  school: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "School", 
    required: true 
  },
  classTeacher: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  }, 
  students: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  }], 
  subject: { 
    type: String,
    required: true,
    trim: true
  },
  academicYear: { 
    type: String, 
    required: true,
    default: "2024-2025" 
  }
}, { timestamps: true });

module.exports = mongoose.model("Classroom", classroomSchema);