const mongoose = require("mongoose");

const examScheduleSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String 
  },
  examType: { 
    type: String, 
    enum: ["quiz", "mid-term", "final", "unit-test", "practical"],
    required: true 
  },
  schedules: [{
    classroom: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Classroom", 
      required: true 
    },
    subject: { 
      type: String, 
      required: true 
    },
    date: { 
      type: Date, 
      required: true 
    },
    startTime: { 
      type: String, 
      required: true 
    },
    endTime: { 
      type: String, 
      required: true 
    },
    duration: { 
      type: String 
    },
    totalMarks: { 
      type: Number, 
      default: 100 
    },
    room: { 
      type: String 
    },
    supervisor: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" ,
       default: null
    }
  }],
  school: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "School", 
    required: true 
  },
  academicYear: {
    type: String,
    default: "2024-2025"
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  }
}, { timestamps: true });

module.exports = mongoose.model("ExamSchedule", examScheduleSchema);