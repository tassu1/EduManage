const mongoose = require("mongoose");

const timetableSchema = new mongoose.Schema({
  classroom: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Classroom", 
    required: true 
  },
  school: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "School", 
    required: true 
  },
  schedule: [{
    day: { 
      type: String, 
      required: true 
    },
    dayLabel: {  
      type: String,
      required: true
    },
    periods: [{
      periodNumber: { type: Number, required: true },
      periodName: { type: String, required: true },
      startTime: { type: String, required: true },
      endTime: { type: String, required: true },
      subject: { type: String, required: true },
      teacher: { type: String }, 
      room: { type: String }
    }]
  }],
  academicYear: {
    type: String,
    required: true,
    default: "2024-2025"
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  updatedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  }
}, { timestamps: true });

timetableSchema.index({ classroom: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model("Timetable", timetableSchema);