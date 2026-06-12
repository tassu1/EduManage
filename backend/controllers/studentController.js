const Attendance = require("../models/Attendance");
const Grade = require("../models/Grade");
const Homework = require("../models/Homework");
const HomeworkSubmission = require("../models/HomeworkSubmisson");
const User = require("../models/User");
const Message = require("../models/Message");
const ExamSchedule = require("../models/ExamSchedule");
const Classroom = require("../models/Classroom");
const mongoose = require("mongoose");

const checkStudent = async (req) => {
  if (!req.user || req.user.role !== "student") {
    const err = new Error("Not authorized as student");
    err.statusCode = 403;
    throw err;
  }
  return req.user.id;
};

exports.getDashboard = async (req, res) => {
  try {
   
    const studentId = await checkStudent(req);
    const student = await User.findById(studentId)
      .populate('classroom', 'name grade section');

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentAttendance = await Attendance.countDocuments({
      student: studentId,
      date: { $gte: thirtyDaysAgo }
    });
    
    const recentPresent = await Attendance.countDocuments({
      student: studentId,
      date: { $gte: thirtyDaysAgo },
      status: "present"
    });

    const recentAttendancePercentage = recentAttendance > 0 
      ? (recentPresent / recentAttendance) * 100 
      : 0;

    const recentGrades = await Grade.find({ student: studentId })
      .sort({ createdAt: -1 })
      .limit(5);

    const studentWithClass = await User.findById(studentId).populate('classroom');
    let upcomingHomework = [];
    
    if (studentWithClass.classroom) {
      upcomingHomework = await Homework.find({
        classroom: studentWithClass.classroom._id,
        isActive: true,
        dueDate: { $gte: new Date() }
      })
      .sort({ dueDate: 1 })
      .limit(5);
    }

    let upcomingExams = [];
    
    if (studentWithClass.classroom) {
      const examSchedules = await ExamSchedule.find({
        school: req.user.school,
        isPublished: true,
        'schedules.classroom': studentWithClass.classroom._id,
        'schedules.date': { $gte: new Date() }
      })
      .sort({ 'schedules.date': 1 })
      .limit(5);

      // Flatten the schedules
      upcomingExams = examSchedules.flatMap(exam => 
        exam.schedules.map(schedule => ({
          title: exam.title,
          subject: schedule.subject,
          date: schedule.date,
          examType: exam.examType
        }))
      ).slice(0, 5);
    }

    const unreadMessages = await Message.countDocuments({
      to: studentId,
      isRead: false
    });


    const dashboardData = {
      profile: {
        _id: student._id,
        name: student.name,
        email: student.email,
        classroom: student.classroom,
        parents: student.parents
      },
      summary: {
        recentAttendance: recentAttendancePercentage.toFixed(2) + '%',
        totalExams: recentGrades.length,
        upcomingHomework: upcomingHomework.length,
        upcomingExams: upcomingExams.length,
        unreadMessages
      },
      recentGrades: recentGrades.map(grade => ({
        subject: grade.subject,
        examTitle: grade.examTitle,
        percentage: grade.percentage,
        grade: grade.grade
      })),
      upcomingHomework: upcomingHomework.map(hw => ({
        _id: hw._id,
        title: hw.title,
        subject: hw.subject,
        dueDate: hw.dueDate
      })),
      upcomingExams: upcomingExams
    };

  

    res.json(dashboardData);

  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};
exports.getMyAttendance = async (req, res) => {
  try {
    const studentId = await checkStudent(req);
    const { startDate, endDate, subject } = req.query;

    const currentYear = new Date().getFullYear();
    const defaultStartDate = `${currentYear}-01-01`;
    const defaultEndDate = `${currentYear}-12-31`;

    const query = { 
      student: studentId,
      date: { 
        $gte: new Date(startDate || defaultStartDate), 
        $lte: new Date(endDate || defaultEndDate) 
      }
    };
    
    if (subject) query.subject = subject;

    const attendance = await Attendance.find(query)
      .populate('teacher', 'name')
      .sort({ date: -1 });

    const totalClasses = await Attendance.countDocuments(query);
    const presentClasses = await Attendance.countDocuments({ 
      ...query, 
      status: "present" 
    });
    const attendancePercentage = totalClasses > 0 ? (presentClasses / totalClasses) * 100 : 0;

    res.json({
      student: req.user.name,
      period: `${startDate || defaultStartDate} to ${endDate || defaultEndDate}`,
      summary: {
        totalClasses,
        presentClasses,
        absentClasses: totalClasses - presentClasses,
        attendancePercentage: attendancePercentage.toFixed(2) + '%'
      },
      attendanceRecords: attendance
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

exports.getMyGrades = async (req, res) => {
  try {
    const studentId = await checkStudent(req);
    const { subject, semester } = req.query;

    const query = { student: studentId };
    if (subject) query.subject = subject;
    if (semester) query.semester = semester;

    const grades = await Grade.find(query)
      .populate('teacher', 'name')
      .sort({ createdAt: -1 });

    const subjectAverages = await Grade.aggregate([
      { $match: query },
      { 
        $group: {
          _id: "$subject",
          averagePercentage: { $avg: "$percentage" },
          totalExams: { $sum: 1 },
          highestScore: { $max: "$percentage" },
          lowestScore: { $min: "$percentage" }
        }
      }
    ]);

    const overallAverage = grades.length > 0 
      ? (grades.reduce((sum, grade) => sum + grade.percentage, 0) / grades.length).toFixed(2)
      : 0;

    res.json({
      student: req.user.name,
      overallAverage: overallAverage + '%',
      totalExams: grades.length,
      subjectAverages,
      grades
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

exports.getGradeReports = async (req, res) => {
  try {
    const studentId = await checkStudent(req);
    const {  subject, semester, examType } = req.query;

    const query = { student: studentId };
    if (subject) query.subject = subject;
    if (semester) query.semester = semester;
    if (examType) query.examType = examType;

    const grades = await Grade.find(query)
      .populate('teacher', 'name')
      .sort({ createdAt: -1 });

 
    const examWiseAnalysis = await Grade.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$examType",
          averagePercentage: { $avg: "$percentage" },
          totalExams: { $sum: 1 },
          highestScore: { $max: "$percentage" },
          lowestScore: { $min: "$percentage" },
          exams: {
            $push: {
              examTitle: "$examTitle",
              percentage: "$percentage",
              grade: "$grade",
              date: "$createdAt"
            }
          }
        }
      }
    ]);

    const subjectProgress = await Grade.aggregate([
      { $match: query },
      {
        $group: {
          _id: { subject: "$subject", month: { $month: "$createdAt" } },
          averageScore: { $avg: "$percentage" },
          examCount: { $sum: 1 }
        }
      },
      { $sort: { "_id.month": 1 } }
    ]);

    res.json({
      student: req.user.name,
      summary: {
        totalExams: grades.length,
        overallAverage: (grades.reduce((sum, g) => sum + g.percentage, 0) / grades.length).toFixed(2) + '%',
        subjects: [...new Set(grades.map(g => g.subject))]
      },
      examWiseAnalysis,
      subjectProgress,
      detailedGrades: grades
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyHomework = async (req, res) => {
  try {
    const studentId = await checkStudent(req);
    
    const student = await User.findById(studentId).populate('classroom');
    
    if (!student.classroom) {
      return res.json({
        message: "No classroom assigned",
        homework: []
      });
    }

    const homework = await Homework.find({
      classroom: student.classroom._id,
      isActive: true  
    })
    .populate('teacher', 'name email')
    .populate('classroom', 'name grade section')
    .sort({ dueDate: 1 });

    const now = new Date();
    const upcomingHomework = homework.filter(hw => new Date(hw.dueDate) >= now);
    const pastDueHomework = homework.filter(hw => new Date(hw.dueDate) < now);

    res.json({
      student: req.user.name,
      classroom: student.classroom.name,
      summary: {
        total: homework.length,
        upcoming: upcomingHomework.length,
        pastDue: pastDueHomework.length
      },
      upcomingHomework,
      pastDueHomework
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

exports.submitHomework = async (req, res) => {
  try {
    const studentId = await checkStudent(req);
    const { homeworkId, submissionText } = req.body;

    const homework = await Homework.findById(homeworkId);
    if (!homework) {
      return res.status(404).json({ message: "Homework not found" });
    }

    const existingSubmission = await HomeworkSubmission.findOne({
      homework: homeworkId,
      student: studentId
    });

    if (existingSubmission) {
      return res.status(400).json({ message: "Homework already submitted" });
    }

    const submission = new HomeworkSubmission({
      homework: homeworkId,
      student: studentId,
      teacher: homework.teacher,
      classroom: homework.classroom,
      school: req.user.school,
      submissionText,
      submittedFiles: req.files || [],
      status: new Date() > homework.dueDate ? "late" : "submitted",
      isLate: new Date() > homework.dueDate
    });

    await submission.save();
    
    res.json({ 
      message: "Homework submitted successfully", 
      submission 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMySubmissions = async (req, res) => {
  try {
    const studentId = await checkStudent(req);
    
    const submissions = await HomeworkSubmission.find({
      student: studentId
    })
    .populate('homework', 'title subject dueDate totalPoints instructions')
    .populate('teacher', 'name')
    .sort({ submittedAt: -1 });

    res.json({ submissions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.getMyExamSchedule = async (req, res) => {
  try {
    const studentId = await checkStudent(req);
    
    const student = await User.findById(studentId).populate('classroom');
    if (!student.classroom) {
      return res.status(400).json({ message: "No classroom assigned" });
    }

    const { examType, subject, upcomingOnly = true } = req.query;

    const query = { 
      school: req.user.school,
      isPublished: true,
      'schedules.classroom': student.classroom._id
    };

    if (examType) query.examType = examType;

    const examSchedules = await ExamSchedule.find(query)
      .populate('schedules.supervisor', 'name')
      .populate('schedules.classroom', 'name grade section')
      .sort({ 'schedules.date': 1 });

    let formattedExams = [];
    
    examSchedules.forEach(exam => {
      exam.schedules.forEach(schedule => {
        if (schedule.classroom._id.toString() === student.classroom._id.toString()) {
          
          const examDate = new Date(schedule.date);
          const now = new Date();
          
          if (!upcomingOnly || examDate >= now) {
            formattedExams.push({
              examId: exam._id,
              title: exam.title,
              description: exam.description,
              examType: exam.examType,
              subject: schedule.subject,
              date: schedule.date,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
              duration: schedule.duration,
              totalMarks: schedule.totalMarks,
              room: schedule.room,
              supervisor: schedule.supervisor,
              isUpcoming: examDate >= now,
              daysRemaining: Math.ceil((examDate - now) / (1000 * 60 * 60 * 24))
            });
          }
        }
      });
    });

    formattedExams.sort((a, b) => new Date(a.date) - new Date(b.date));

    const upcomingExams = formattedExams.filter(exam => exam.isUpcoming);
    const pastExams = formattedExams.filter(exam => !exam.isUpcoming);

    res.json({
      student: req.user.name,
      classroom: student.classroom.name,
      summary: {
        totalExams: formattedExams.length,
        upcoming: upcomingExams.length,
        completed: pastExams.length,
        nextExam: upcomingExams[0] || null
      },
      exams: formattedExams
    });

  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};


exports.getStudentConversations = async (req, res) => {
  try {
    const studentId = await checkStudent(req);
    const studentObjectId = new mongoose.Types.ObjectId(studentId);
    const schoolObjectId = new mongoose.Types.ObjectId(req.user.school);

    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { from: studentObjectId },
            { to: studentObjectId }
          ],
          school: schoolObjectId
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$from", studentObjectId] },
              "$to",
              "$from"
            ]
          },
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                { 
                  $and: [
                    { $ne: ["$from", studentObjectId] },
                    { $eq: ["$isRead", false] }
                  ]
                },
                1,
                0
              ]
            }
          },
          totalMessages: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userInfo"
        }
      },
      { $unwind: "$userInfo" },
      {
        $match: {
          "userInfo.role": "teacher"
        }
      },
      {
        $lookup: {
          from: "classrooms",
          let: { teacherId: "$_id", studentId: studentObjectId },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$classTeacher", "$$teacherId"] },
                    { $in: ["$$studentId", "$students"] },
                    { $eq: ["$school", schoolObjectId] }
                  ]
                }
              }
            }
          ],
          as: "classroomInfo"
        }
      },
      {
        $project: {
          userId: "$_id",
          userName: "$userInfo.name",
          userRole: "$userInfo.role",
          userAvatar: "$userInfo.avatar",
          userEmail: "$userInfo.email",
          lastMessage: "$lastMessage.content",
          lastMessageTime: "$lastMessage.createdAt",
          unreadCount: 1,
          totalMessages: 1,
          conversationType: "teacher_student",
          classroom: { $arrayElemAt: ["$classroomInfo.name", 0] },
          subject: { $arrayElemAt: ["$classroomInfo.subject", 0] },
          isClassTeacher: { $gt: [{ $size: "$classroomInfo" }, 0] }
        }
      },
      { $sort: { lastMessageTime: -1 } }
    ]);

    res.json({ 
      success: true, 
      conversations 
    });
  } catch (err) {

    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

exports.getStudentMessageContacts = async (req, res) => {
  try {
    const studentId = req.user.id;
    const classrooms = await Classroom.find({
      students: studentId,
      school: req.user.school
    })
    .populate('classTeacher', 'name email avatar');

    if (!classrooms || classrooms.length === 0) {
      return res.json({ 
        success: true, 
        contacts: [] 
      });
    }

    let contacts = [];
    const teacherIds = new Set(); 

    classrooms.forEach(classroom => {
      if (classroom.classTeacher && !teacherIds.has(classroom.classTeacher._id.toString())) {
        teacherIds.add(classroom.classTeacher._id.toString());
        
        contacts.push({
          _id: classroom.classTeacher._id,
          name: classroom.classTeacher.name,
          email: classroom.classTeacher.email,
          avatar: classroom.classTeacher.avatar,
          role: 'teacher',
          classroom: classroom.name,
          gradeSection: `${classroom.grade}-${classroom.section}`,
          subject: classroom.subject,
          conversationType: 'teacher_student',
          isClassTeacher: true
        });
    
      }
    });

    res.json({ 
      success: true, 
      contacts 
    });

  } catch (err) {
    res.status(500).json({ 
      success: false,
      message: "Failed to load contacts",
      error: err.message 
    });
  }
};

exports.getStudentConversation = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { otherUserId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const messages = await Message.find({
      school: req.user.school,
      $or: [
        { from: studentId, to: otherUserId },
        { from: otherUserId, to: studentId }
      ]
    })
    .populate('from', 'name role email')
    .populate('to', 'name role email')
    .sort({ createdAt: 1 });

    res.json({ 
      success: true, 
      messages 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

exports.getAIConversations = async (req, res) => {
  try {
    const studentId = req.user.id;
  
    const aiMessages = await Message.find({
      $or: [
        { 
          from: studentId, 
          to: studentId, 
          messageType: "ai-query" 
        }
      ],
      school: req.user.school
    })
    .sort({ createdAt: -1 })
    .limit(50); 

    const formattedMessages = aiMessages.map(msg => {
      const [questionPart, answerPart] = msg.content.split('\n\nA: ');
      const question = questionPart.replace('Q: ', '');
      
      return {
        id: msg._id,
        question: question,
        answer: answerPart || msg.content,
        timestamp: msg.createdAt,
        messageType: msg.messageType,
        isAI: true
      };
    });

    res.json({
      success: true,
      conversations: formattedMessages.reverse() 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

exports.getAIConversationHistory = async (req, res) => {
  try {
    const studentId = await checkStudent(req);
    const { limit = 20, offset = 0 } = req.query;

    const aiConversations = await Message.find({
      from: studentId,
      to: studentId,
      messageType: "ai-query",
      school: req.user.school
    })
    .sort({ createdAt: -1 })
    .skip(parseInt(offset))
    .limit(parseInt(limit));

    const totalCount = await Message.countDocuments({
      from: studentId,
      to: studentId,
      messageType: "ai-query",
      school: req.user.school
    });

    const conversations = aiConversations.map(msg => {
      const [questionPart, answerPart] = msg.content.split('\n\nA: ');
      const question = questionPart.replace('Q: ', '');
      
      return {
        id: msg._id,
        question: question,
        answer: answerPart || msg.content,
        timestamp: msg.createdAt,
        messageType: msg.messageType
      };
    });

    res.json({
      success: true,
      conversations,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: totalCount > (parseInt(offset) + parseInt(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

exports.clearAIConversations = async (req, res) => {
  try {
    const studentId = await checkStudent(req);

    const result = await Message.deleteMany({
      from: studentId,
      to: studentId,
      messageType: "ai-query",
      school: req.user.school
    });

    res.json({
      success: true,
      message: "AI conversation history cleared successfully",
      deletedCount: result.deletedCount
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};