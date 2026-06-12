const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  student: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  teacher: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  school: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "School", 
    required: true 
  },
  classroom: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Classroom", 
    required: true 
  }, 
  date: { 
    type: Date, 
    required: true,
    default: Date.now 
  },
  status: { 
    type: String, 
    enum: ["present", "absent"],
    required: true 
  },
  subject: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model("Attendance", attendanceSchema);