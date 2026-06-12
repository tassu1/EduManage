const mongoose = require("mongoose");

const homeworkSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String 
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
  subject: { 
    type: String, 
    required: true 
  },
  dueDate: { 
    type: Date, 
    required: true 
  },
 
  attachments: [{
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    filePath: { type: String, required: true },
    fileSize: { type: Number },
    mimeType: { type: String },
    uploadedAt: { type: Date, default: Date.now }
  }],
  instructions: { 
    type: String 
  },
  totalPoints: { 
    type: Number, 
    default: 100 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  }
}, { timestamps: true });

module.exports = mongoose.model("Homework", homeworkSchema);