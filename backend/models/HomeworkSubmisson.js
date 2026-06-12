const mongoose = require("mongoose");

const homeworkSubmissionSchema = new mongoose.Schema({
  homework: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Homework", 
    required: true 
  },
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
  submittedAt: { 
    type: Date, 
    default: Date.now 
  },
  submittedFiles: [{
    filename: String,
    originalName: String,
    filePath: String,
    fileSize: Number,
    mimeType: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  submissionText: {
    type: String,
    maxlength: 5000
  },
  status: {
    type: String,
    enum: ["submitted", "graded", "late", "missing", "draft"],
    default: "missing"
  },
  marksObtained: {
    type: Number,
    min: 0,
    default: 0
  },
  totalMarks: {
    type: Number,
    default: 100
  },
  percentage: {
    type: Number,
    min: 0,
    max: 100
  },
  grade: {
    type: String,
    enum: ["A+", "A", "B+", "B", "C+", "C", "D", "F", null],
    default: null
  },
  feedback: {
    type: String,
    maxlength: 1000
  },
  gradedAt: Date,
  gradedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  },
  isLate: {
    type: Boolean,
    default: false
  },
  lateSubmission: {
    hoursLate: Number,
    penaltyApplied: { type: Boolean, default: false }
  }
}, { timestamps: true });

// Calculate percentage and grade automatically
homeworkSubmissionSchema.pre("save", function(next) {
  if (this.marksObtained && this.totalMarks) {
    this.percentage = (this.marksObtained / this.totalMarks) * 100;
    
    // Auto-grade based on percentage
    if (this.percentage >= 90) this.grade = "A+";
    else if (this.percentage >= 80) this.grade = "A";
    else if (this.percentage >= 75) this.grade = "B+";
    else if (this.percentage >= 70) this.grade = "B";
    else if (this.percentage >= 65) this.grade = "C+";
    else if (this.percentage >= 60) this.grade = "C";
    else if (this.percentage >= 50) this.grade = "D";
    else this.grade = "F";
  }
  
  // Check if submission is late
  if (this.submittedAt && this.homework) {
    // This will be populated when querying
    this.isLate = false; // Will be calculated in controller
  }
  
  next();
});

module.exports = mongoose.model("HomeworkSubmission", homeworkSubmissionSchema);