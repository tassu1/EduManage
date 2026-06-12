const mongoose = require("mongoose");

const gradeSchema = new mongoose.Schema({
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
  
  
  subject: { 
    type: String, 
    required: true 
  }, 
  
  examType: { 
    type: String, 
    required: true,
    enum: ["quiz", "mid-term", "final", "assignment", "project", "practical"]
  },
  
  examTitle: { 
    type: String, 
    required: true 
  }, 
  
  marksObtained: { 
    type: Number, 
    required: true,
    min: 0
  },
  
  totalMarks: { 
    type: Number, 
    required: true,
    min: 1
  },
  

  percentage: { 
    type: Number,
    min: 0,
    max: 100
  },
  
  grade: {
    type: String,
    enum: ["A+", "A", "B+", "B", "C+", "C", "D", "F"]
  },
  
  semester: {
    type: String,
    required: true
  }, 
  
  academicYear: {
    type: String,
    required: true
  },
  
  comments: {
    type: String
  }
  
}, { timestamps: true });


gradeSchema.pre("save", function(next) {
  if (this.marksObtained && this.totalMarks) {
    
    this.percentage = (this.marksObtained / this.totalMarks) * 100;
    
    
    if (this.percentage >= 90) this.grade = "A+";
    else if (this.percentage >= 80) this.grade = "A";
    else if (this.percentage >= 75) this.grade = "B+";
    else if (this.percentage >= 70) this.grade = "B";
    else if (this.percentage >= 65) this.grade = "C+";
    else if (this.percentage >= 60) this.grade = "C";
    else if (this.percentage >= 50) this.grade = "D";
    else this.grade = "F";
  }
  next();
});

// Index for efficient queries
gradeSchema.index({ student: 1, subject: 1, examType: 1, semester: 1 });

module.exports = mongoose.model("Grade", gradeSchema);