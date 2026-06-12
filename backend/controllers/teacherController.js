const Attendance = require("../models/Attendance");
const Grade = require("../models/Grade");
const Homework = require("../models/Homework");
const HomeworkSubmission = require("../models/HomeworkSubmisson"); // ✅ ADDED
const Classroom = require("../models/Classroom");
const User = require("../models/User");
const mongoose = require("mongoose");
const upload = require("../config/multer");
const Message = require("../models/Message");
const fs = require('fs');
const path = require('path');


const checkTeacher = (req) => {
  if (!req.user || req.user.role !== "teacher") {
    const err = new Error("Not authorized as teacher");
    err.statusCode = 403;
    throw err;
  }
  return req.user.id;
};

const verifyClassroomAccess = async (teacherId, classroomId) => {
  const classroom = await Classroom.findOne({
    _id: classroomId,
    classTeacher: teacherId
  });
  if (!classroom) throw new Error("Not authorized for this classroom");
  return classroom;
};

const handleFileCleanup = (files = []) => {
  files.forEach(file => {
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  });
};

const createErrorResponse = (err, res) => {
  res.status(err.statusCode || 500).json({ message: err.message });
};


exports.getMyClassrooms = async (req, res) => {
  try {
    const teacherId = await checkTeacher(req);

    const classrooms = await Classroom.find({
      classTeacher: teacherId,
      school: req.user.school
    })
    .populate('students', 'name email')
    .populate('classTeacher', 'name email')
    .lean();

    res.json({ 
      count: classrooms.length, 
      classrooms
    });
  } catch (err) {
    createErrorResponse(err, res);
  }
};


exports.markClassAttendance = async (req, res) => {
  try {
    const teacherId = await checkTeacher(req);
    const { classroomId, date, subject, attendanceList } = req.body;

    await verifyClassroomAccess(teacherId, classroomId);

    const attendanceRecords = await Promise.all(
      attendanceList.map(studentAttendance => 
        Attendance.create({
          student: studentAttendance.studentId,
          teacher: teacherId,
          school: req.user.school,
          classroom: classroomId,
          date: new Date(date),
          status: studentAttendance.status,
          subject
        })
      )
    );

    res.status(201).json({
      message: "Class attendance marked successfully",
      count: attendanceRecords.length,
      records: attendanceRecords
    });
  } catch (err) {
    createErrorResponse(err, res);
  }
};

exports.getClassAttendanceReport = async (req, res) => {
  try {
    const teacherId = await checkTeacher(req);
    const { classroomId } = req.params;
    const { startDate, endDate, subject } = req.query;

    const classroom = await verifyClassroomAccess(teacherId, classroomId);
    await classroom.populate('students', 'name email');

    const attendanceData = await Promise.all(
      classroom.students.map(async (student) => {
        const query = { 
          student: student._id,
          classroom: classroomId,
          date: { $gte: new Date(startDate), $lte: new Date(endDate) }
        };
        if (subject) query.subject = subject;

        const [totalClasses, presentClasses] = await Promise.all([
          Attendance.countDocuments(query),
          Attendance.countDocuments({ ...query, status: "present" })
        ]);

        const percentage = totalClasses > 0 ? (presentClasses / totalClasses) * 100 : 0;

        return {
          student: { _id: student._id, name: student.name, email: student.email },
          totalClasses,
          presentClasses,
          absentClasses: totalClasses - presentClasses,
          attendancePercentage: percentage.toFixed(2)
        };
      })
    );

    res.json({
      classroom: classroom.name,
      period: `${startDate} to ${endDate}`,
      subject: subject || "All Subjects",
      attendanceData
    });
  } catch (err) {
    createErrorResponse(err, res);
  }
};

exports.uploadGrade = async (req, res) => {
  try {
    const teacherId = await checkTeacher(req);
    const { studentId, classroomId, grades } = req.body;

    const gradeRecords = await Promise.all(
      grades.map(gradeData => 
        Grade.create({
          student: studentId,
          teacher: teacherId,
          school: req.user.school,
          classroom: classroomId,
          subject: gradeData.subject,
          examType: gradeData.examType,
          examTitle: gradeData.examTitle,
          marksObtained: gradeData.marksObtained,
          totalMarks: gradeData.totalMarks,
          semester: gradeData.semester,
          academicYear: gradeData.academicYear,
          comments: gradeData.comments
        })
      )
    );

    res.status(201).json({
      message: "Grades uploaded successfully",
      count: gradeRecords.length,
      grades: gradeRecords
    });
  } catch (err) {
    createErrorResponse(err, res);
  }
};

exports.uploadClassGrades = async (req, res) => {
  try {
    const teacherId = await checkTeacher(req);
    const { classroomId, examData, studentGrades } = req.body;

    const gradeRecords = await Promise.all(
      studentGrades.flatMap(studentGrade =>
        studentGrade.grades.map(grade =>
          Grade.create({
            student: studentGrade.studentId,
            teacher: teacherId,
            school: req.user.school,
            classroom: classroomId,
            subject: grade.subject,
            examType: examData.examType,
            examTitle: examData.examTitle,
            marksObtained: grade.marksObtained,
            totalMarks: grade.totalMarks,
            semester: examData.semester,
            academicYear: examData.academicYear
          })
        )
      )
    );

    res.status(201).json({
      message: "Class grades uploaded successfully",
      examTitle: examData.examTitle,
      totalRecords: gradeRecords.length,
      grades: gradeRecords
    });
  } catch (err) {
    createErrorResponse(err, res);
  }
};

exports.getStudentGrades = async (req, res) => {
  try {
    const teacherId = await checkTeacher(req);
    const { studentId, subject, semester } = req.query;

    const query = { student: studentId, teacher: teacherId };
    if (subject) query.subject = subject;
    if (semester) query.semester = semester;

    const [grades, subjectAverages] = await Promise.all([
      Grade.find(query).populate('student', 'name email').sort({ createdAt: -1 }),
      Grade.aggregate([
        { $match: query },
        { $group: {
            _id: "$subject",
            averagePercentage: { $avg: "$percentage" },
            totalExams: { $sum: 1 },
            highestScore: { $max: "$percentage" },
            lowestScore: { $min: "$percentage" }
          }
        }
      ])
    ]);

    res.json({
      student: grades[0]?.student || {},
      grades,
      subjectAverages,
      totalGrades: grades.length
    });
  } catch (err) {
    createErrorResponse(err, res);
  }
};

exports.getClassPerformance = async (req, res) => {
  try {
    const teacherId = await checkTeacher(req);
    const { classroomId, subject, semester } = req.query;

    const matchStage = {
      classroom: new  mongoose.Types.ObjectId(classroomId),
      teacher: new mongoose.Types.ObjectId(teacherId)
    };
    if (subject) matchStage.subject = subject;
    if (semester) matchStage.semester = semester;

    const performance = await Grade.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$student",
          averagePercentage: { $avg: "$percentage" },
          totalExams: { $sum: 1 },
          subjects: { $addToSet: "$subject" }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "studentInfo"
        }
      },
      { $unwind: "$studentInfo" },
      {
        $project: {
          studentName: "$studentInfo.name",
          studentEmail: "$studentInfo.email",
          averagePercentage: { $round: ["$averagePercentage", 2] },
          totalExams: 1,
          subjects: 1
        }
      },
      { $sort: { averagePercentage: -1 } }
    ]);

    res.json({
      classroom: classroomId,
      subject: subject || "All Subjects",
      performance,
      totalStudents: performance.length
    });
  } catch (err) {
    createErrorResponse(err, res);
  }
};

exports.createHomework = async (req, res) => {
  try {
    const teacherId = await checkTeacher(req);
    const { classroomId, title, description, subject, dueDate, instructions, totalPoints } = req.body;

    await verifyClassroomAccess(teacherId, classroomId);

    const attachments = (req.files || []).map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      filePath: file.path,
      fileSize: file.size,
      mimeType: file.mimetype
    }));

    const homework = await Homework.create({
      title,
      description,
      teacher: teacherId,
      school: req.user.school,
      classroom: classroomId,
      subject,
      dueDate: new Date(dueDate),
      attachments,
      instructions,
      totalPoints: totalPoints || 100
    });

    res.status(201).json({
      message: "Homework created successfully",
      homework: {
        ...homework._doc,
        attachments: homework.attachments.map(att => ({
          filename: att.filename,
          originalName: att.originalName,
          fileSize: att.fileSize,
          mimeType: att.mimeType
        }))
      }
    });
  } catch (err) {
    handleFileCleanup(req.files);
    createErrorResponse(err, res);
  }
};

exports.getMyHomework = async (req, res) => {
  try {
    const teacherId = await checkTeacher(req);
    const { classroomId, subject } = req.query;

    const query = { teacher: teacherId };
    if (classroomId) query.classroom = classroomId;
    if (subject) query.subject = subject;

    const homework = await Homework.find(query)
      .populate('classroom', 'name grade section')
      .sort({ dueDate: 1 });

    res.json({ count: homework.length, homework });
  } catch (err) {
    createErrorResponse(err, res);
  }
};

exports.getClassHomework = async (req, res) => {
  try {
    const teacherId = await checkTeacher(req);
    const { classroomId } = req.params;

    await verifyClassroomAccess(teacherId, classroomId);

    const homework = await Homework.find({
      classroom: classroomId,
      dueDate: { $gte: new Date() } 
    }).sort({ dueDate: 1 });

    res.json({ classroom: classroomId, count: homework.length, homework });
  } catch (err) {
    createErrorResponse(err, res);
  }
};

exports.updateHomework = async (req, res) => {
  try {
    const teacherId = await checkTeacher(req);
    const { homeworkId } = req.params;
    const updates = req.body;

    const homework = await Homework.findOne({ _id: homeworkId, teacher: teacherId });
    if (!homework) return res.status(404).json({ message: "Homework not found" });

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        homework[key] = key === 'dueDate' ? new Date(updates[key]) : updates[key];
      }
    });

    await homework.save();
    res.json({ message: "Homework updated successfully", homework });
  } catch (err) {
    createErrorResponse(err, res);
  }
};

exports.deleteHomework = async (req, res) => {
  try {
    const teacherId = await checkTeacher(req);
    const { homeworkId } = req.params;

    const homework = await Homework.findOne({ _id: homeworkId, teacher: teacherId });
    if (!homework) return res.status(404).json({ message: "Homework not found" });

    handleFileCleanup(homework.attachments);
    await Homework.findByIdAndDelete(homeworkId);

    res.json({ message: "Homework deleted successfully" });
  } catch (err) {
    createErrorResponse(err, res);
  }
};

exports.uploadHomeworkFiles = async (req, res) => {
  try {
    const teacherId = await checkTeacher(req);
    const { homeworkId } = req.params;

    const homework = await Homework.findOne({ _id: homeworkId, teacher: teacherId });
    if (!homework) {
      handleFileCleanup(req.files);
      return res.status(404).json({ message: "Homework not found" });
    }

    if (req.files?.length > 0) {
      const newAttachments = (req.files || []).map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype
      }));
      
      homework.attachments.push(...newAttachments);
      await homework.save();
    }

    res.json({
      message: "Files uploaded successfully",
      attachments: homework.attachments.map(att => ({
        filename: att.filename,
        originalName: att.originalName,
        fileSize: att.fileSize,
        mimeType: att.mimeType
      }))
    });
  } catch (err) {
    handleFileCleanup(req.files);
    createErrorResponse(err, res);
  }
};

exports.deleteHomeworkAttachment = async (req, res) => {
  try {
    const teacherId = await checkTeacher(req);
    const { homeworkId, attachmentId } = req.params;

    const homework = await Homework.findOne({ _id: homeworkId, teacher: teacherId });
    if (!homework) return res.status(404).json({ message: "Homework not found" });

    const attachment = homework.attachments.id(attachmentId);
    if (!attachment) return res.status(404).json({ message: "Attachment not found" });

    if (fs.existsSync(attachment.filePath)) {
      fs.unlinkSync(attachment.filePath);
    }

    homework.attachments.pull(attachmentId);
    await homework.save();

    res.json({ message: "Attachment deleted successfully" });
  } catch (err) {
    createErrorResponse(err, res);
  }
};

exports.getHomeworkFile = async (req, res) => {
  try {
    const { homeworkId, filename } = req.params;

    const homework = await Homework.findById(homeworkId);
    if (!homework) return res.status(404).json({ message: "Homework not found" });

    const attachment = homework.attachments.find(att => att.filename === filename);
    if (!attachment) return res.status(404).json({ message: "File not found" });

    if (!fs.existsSync(attachment.filePath)) {
      return res.status(404).json({ message: "File not found on server" });
    }

    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${attachment.originalName}"`);
    res.sendFile(path.resolve(attachment.filePath));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getHomeworkSubmissions = async (req, res) => {
  try {
    const teacherId = await checkTeacher(req);
    const { homeworkId } = req.params;

    const homework = await Homework.findOne({ 
      _id: homeworkId, 
      teacher: teacherId 
    }).populate('classroom', 'name students');
    
    if (!homework) {
      return res.status(404).json({ message: "Homework not found" });
    }

    const submissions = await HomeworkSubmission.find({ homework: homeworkId })
      .populate('student', 'name email rollNumber')
      .sort({ submittedAt: -1 });

    const allStudentIds = homework.classroom.students.map(s => s._id);
    const existingStudentIds = submissions.map(s => s.student._id.toString());
    const missingStudentIds = allStudentIds.filter(id => 
      !existingStudentIds.includes(id.toString())
    );

    if (missingStudentIds.length > 0) {
      const missingSubmissions = await Promise.all(
        missingStudentIds.map(studentId =>
          HomeworkSubmission.create({
            homework: homeworkId,
            student: studentId,
            teacher: teacherId,
            classroom: homework.classroom._id,
            school: req.user.school,
            status: "missing"
          })
        )
      );
      submissions.push(...missingSubmissions);
    }

    const stats = {
      total: submissions.length,
      submitted: submissions.filter(s => s.status === 'submitted' || s.status === 'graded').length,
      graded: submissions.filter(s => s.status === 'graded').length,
      pending: submissions.filter(s => s.status === 'submitted').length,
      missing: submissions.filter(s => s.status === 'missing').length,
      late: submissions.filter(s => s.isLate).length
    };

    res.json({
      homework: {
        _id: homework._id,
        title: homework.title,
        dueDate: homework.dueDate,
        totalPoints: homework.totalPoints,
        totalStudents: homework.classroom.students.length
      },
      submissions,
      statistics: stats
    });
  } catch (err) {
    createErrorResponse(err, res);
  }
};

exports.gradeSubmission = async (req, res) => {
  try {
    const teacherId = await checkTeacher(req);
    const { submissionId } = req.params;
    const { marksObtained, feedback } = req.body;

    const submission = await HomeworkSubmission.findOne({ 
      _id: submissionId,
      teacher: teacherId 
    }).populate('homework');

    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    submission.marksObtained = marksObtained;
    submission.totalMarks = submission.homework.totalPoints;
    submission.feedback = feedback;
    submission.status = "graded";
    submission.gradedAt = new Date();
    submission.gradedBy = teacherId;

    await submission.save();

    res.json({
      message: "Submission graded successfully",
      submission: await submission.populate('student', 'name email')
    });
  } catch (err) {
    createErrorResponse(err, res);
  }
};

exports.bulkGradeSubmissions = async (req, res) => {
  try {
    const teacherId = await checkTeacher(req);
    const { homeworkId, grades } = req.body;

    const homework = await Homework.findOne({ 
      _id: homeworkId, 
      teacher: teacherId 
    });
    
    if (!homework) {
      return res.status(404).json({ message: "Homework not found" });
    }

    const gradedSubmissions = await Promise.all(
      grades.map(async (gradeData) => {
        const submission = await HomeworkSubmission.findOne({
          _id: gradeData.submissionId,
          homework: homeworkId
        });

        if (submission) {
          submission.marksObtained = gradeData.marksObtained;
          submission.feedback = gradeData.feedback;
          submission.status = "graded";
          submission.gradedAt = new Date();
          submission.gradedBy = teacherId;
          return await submission.save();
        }
        return null;
      })
    );

    res.json({
      message: `${gradedSubmissions.filter(s => s).length} submissions graded successfully`,
      graded: gradedSubmissions.filter(s => s).length
    });
  } catch (err) {
    createErrorResponse(err, res);
  }
};

exports.downloadSubmissions = async (req, res) => {
  try {
    const teacherId = await checkTeacher(req);
    const { homeworkId } = req.params;

    const homework = await Homework.findOne({ 
      _id: homeworkId, 
      teacher: teacherId 
    }).populate('classroom', 'name');
    
    if (!homework) {
      return res.status(404).json({ message: "Homework not found" });
    }

    const submissions = await HomeworkSubmission.find({ 
      homework: homeworkId,
      status: { $in: ['submitted', 'graded'] }
    }).populate('student', 'name rollNumber');

    res.json({
      message: "Download functionality ready",
      totalFiles: submissions.reduce((sum, sub) => sum + sub.submittedFiles.length, 0),
      submissionsCount: submissions.length
    });
  } catch (err) {
    createErrorResponse(err, res);
  }
};


exports.TeacherDashboard = async (req, res) => {
  try {
    const teacherId = await checkTeacher(req);
    const classrooms = await Classroom.find({
      classTeacher: teacherId,
      school: req.user.school
    }).populate('students', 'name email rollNumber');

    const allStudentIds = new Set();
    classrooms.forEach(classroom => {
      classroom.students.forEach(student => {
        allStudentIds.add(student._id.toString());
      });
    });

    const teacherObjectId = new mongoose.Types.ObjectId(teacherId);
    const schoolObjectId = new mongoose.Types.ObjectId(req.user.school);

    const homeworkStats = await Homework.aggregate([
      { 
        $match: { 
          teacher: teacherObjectId,
          school: schoolObjectId
        } 
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: {
            $sum: {
              $cond: [{ $gt: ["$dueDate", new Date()] }, 1, 0]
            }
          },
          expired: {
            $sum: {
              $cond: [{ $lte: ["$dueDate", new Date()] }, 1, 0]
            }
          }
        }
      }
    ]);

    const submissionStats = await HomeworkSubmission.aggregate([
      {
        $lookup: {
          from: "homework",
          localField: "homework",
          foreignField: "_id",
          as: "homeworkInfo"
        }
      },
      { $unwind: "$homeworkInfo" },
      { 
        $match: { 
          "homeworkInfo.teacher": teacherObjectId,
          "homeworkInfo.school": schoolObjectId
        } 
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);

    const attendanceStats = await Attendance.aggregate([
      {
        $match: {
          teacher: teacherObjectId,
          date: { $gte: currentMonthStart }
        }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const upcomingDeadlines = await Homework.find({
      teacher: teacherId,
      dueDate: { 
        $gte: new Date(),
        $lte: nextWeek
      }
    })
    .populate('classroom', 'name')
    .sort({ dueDate: 1 })
    .limit(5);

    const recentSubmissions = await HomeworkSubmission.find({
      status: 'submitted',
      submittedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    })
    .populate('student', 'name')
    .populate('homework', 'title')
    .sort({ submittedAt: -1 })
    .limit(5);

    const recentGrades = await Grade.find({
      teacher: teacherId,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    })
    .sort({ createdAt: 1 })
    .limit(50);

    const performanceTrend = recentGrades.reduce((acc, grade) => {
      const date = grade.createdAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { total: 0, sum: 0, count: 0 };
      }
      acc[date].sum += grade.percentage;
      acc[date].count++;
      return acc;
    }, {});

    const performanceData = Object.entries(performanceTrend).map(([date, data]) => ({
      _id: date,
      averagePercentage: data.sum / data.count,
      totalGrades: data.count
    })).slice(-7); 

    const submissionSummary = submissionStats.reduce((acc, curr) => {
      acc[curr._id] = {
        count: curr.count
      };
      return acc;
    }, {});

    const attendanceSummary = attendanceStats.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    const stats = {

      totalClassrooms: classrooms.length,
      uniqueStudents: allStudentIds.size,
      totalSubjects: [...new Set(classrooms.map(c => c.subject).filter(Boolean))].length,
      totalHomework: homeworkStats[0]?.total || 0,
      activeHomework: homeworkStats[0]?.active || 0,
      expiredHomework: homeworkStats[0]?.expired || 0,
      totalSubmissions: Object.values(submissionSummary).reduce((sum, item) => sum + item.count, 0),
      submittedCount: submissionSummary['submitted']?.count || 0,
      gradedCount: submissionSummary['graded']?.count || 0,
      missingCount: submissionSummary['missing']?.count || 0,
      presentCount: attendanceSummary['present'] || 0,
      absentCount: attendanceSummary['absent'] || 0
    };

    const submissionRate = stats.uniqueStudents > 0 ? 
      ((stats.submittedCount / stats.uniqueStudents) * 100) : 0;

    const attendanceRate = (stats.presentCount + stats.absentCount) > 0 ?
      ((stats.presentCount / (stats.presentCount + stats.absentCount)) * 100) : 0;

    res.json({
      stats,
      summary: {
        submissionRate: submissionRate.toFixed(1),
        attendanceRate: attendanceRate.toFixed(1),
        averageScore: "0" 
      },
      upcomingDeadlines,
      recentSubmissions,
      performanceTrend: performanceData,
      classrooms: classrooms.map(classroom => ({
        _id: classroom._id,
        name: classroom.name,
        studentCount: classroom.students.length,
        subject: classroom.subject,
        grade: classroom.grade,
        section: classroom.section
      }))
    });
  } catch (err) {
    createErrorResponse(err, res);
  }
};

exports.getMyTimetable = async (req, res) => {
  try {
    const teacherId = await checkTeacher(req);

    const timetable = await Timetable.find({
      teacher: teacherId,
      school: req.user.school
    })
    .populate('classroom', 'name grade section')
    .sort({ dayOfWeek: 1, startTime: 1 });

    const timetableByDay = {
      monday: timetable.filter(t => t.dayOfWeek === 'monday'),
      tuesday: timetable.filter(t => t.dayOfWeek === 'tuesday'),
      wednesday: timetable.filter(t => t.dayOfWeek === 'wednesday'),
      thursday: timetable.filter(t => t.dayOfWeek === 'thursday'),
      friday: timetable.filter(t => t.dayOfWeek === 'friday'),
      saturday: timetable.filter(t => t.dayOfWeek === 'saturday')
    };

    res.json({ timetable: timetableByDay });
  } catch (err) {
    createErrorResponse(err, res);
  }
};

exports.getStudentDetailedReport = async (req, res) => {
  try {
    const teacherId = await checkTeacher(req);
    const { studentId, classroomId } = req.params;
    const classroom = await Classroom.findOne({
      _id: classroomId,
      classTeacher: teacherId,
      students: studentId
    });

    if (!classroom) {
      return res.status(403).json({ message: "Student not found in your classroom" });
    }
    const student = await User.findById(studentId).select('name email rollNumber avatar parent');
    const grades = await Grade.find({
      student: studentId,
      classroom: classroomId
    }).sort({ createdAt: -1 });
    const subjectPerformance = await Grade.aggregate([
      {
        $match: {
          student: new mongoose.Types.ObjectId(studentId),
          classroom: new mongoose.Types.ObjectId(classroomId)
        }
      },
      {
        $group: {
          _id: "$subject",
          averagePercentage: { $avg: "$percentage" },
          totalExams: { $sum: 1 },
          highestScore: { $max: "$percentage" },
          lowestScore: { $min: "$percentage" },
          recentGrades: { $push: { marks: "$marksObtained", total: "$totalMarks", date: "$createdAt" } }
        }
      },
      {
        $project: {
          subject: "$_id",
          averagePercentage: { $round: ["$averagePercentage", 2] },
          totalExams: 1,
          highestScore: 1,
          lowestScore: 1,
          performanceTrend: { $slice: ["$recentGrades", 5] }, // Last 5 grades
          _id: 0
        }
      }
    ]);
    const attendanceSummary = await Attendance.aggregate([
      {
        $match: {
          student: new mongoose.Types.ObjectId(studentId),
          classroom: new mongoose.Types.ObjectId(classroomId)
        }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          bySubject: { 
            $push: {
              subject: "$subject",
              date: "$date"
            }
          }
        }
      }
    ]);

    const homeworkStats = await HomeworkSubmission.aggregate([
      {
        $lookup: {
          from: "homework",
          localField: "homework",
          foreignField: "_id",
          as: "homeworkInfo"
        }
      },
      { $unwind: "$homeworkInfo" },
      {
        $match: {
          student: new mongoose.Types.ObjectId(studentId),
          "homeworkInfo.classroom": new mongoose.Types.ObjectId(classroomId)
        }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          averageScore: { $avg: "$marksObtained" },
          assignments: {
            $push: {
              title: "$homeworkInfo.title",
              marks: "$marksObtained",
              total: "$homeworkInfo.totalPoints",
              submittedAt: "$submittedAt",
              status: "$status"
            }
          }
        }
      }
    ]);
    const totalClasses = attendanceSummary.reduce((sum, item) => sum + item.count, 0);
    const presentClasses = attendanceSummary.find(item => item._id === 'present')?.count || 0;
    const attendanceRate = totalClasses > 0 ? (presentClasses / totalClasses) * 100 : 0;

    const submittedHomework = homeworkStats.find(item => item._id === 'submitted' || item._id === 'graded')?.count || 0;
    const gradedHomework = homeworkStats.find(item => item._id === 'graded')?.count || 0;
    const averageHomeworkScore = homeworkStats.find(item => item._id === 'graded')?.averageScore || 0;

    res.json({
      student: {
        _id: student._id,
        name: student.name,
        email: student.email,
        rollNumber: student.rollNumber,
        avatar: student.avatar,
        parent: student.parent
      },
      classroom: {
        _id: classroom._id,
        name: classroom.name,
        grade: classroom.grade,
        section: classroom.section
      },
      performance: {
        overallAverage: subjectPerformance.length > 0 
          ? subjectPerformance.reduce((sum, subj) => sum + subj.averagePercentage, 0) / subjectPerformance.length 
          : 0,
        subjectPerformance,
        gradeTrend: grades.slice(0, 10).map(grade => ({
          subject: grade.subject,
          percentage: grade.percentage,
          date: grade.createdAt,
          exam: grade.examTitle
        }))
      },
      attendance: {
        summary: attendanceSummary,
        rate: attendanceRate.toFixed(1),
        totalClasses,
        presentClasses,
        absentClasses: attendanceSummary.find(item => item._id === 'absent')?.count || 0
      },
      homework: {
        stats: homeworkStats,
        submitted: submittedHomework,
        graded: gradedHomework,
        averageScore: averageHomeworkScore.toFixed(1),
        submissionRate: classroom.students.length > 0 ? (submittedHomework / classroom.students.length) * 100 : 0
      },
      recommendations: generateRecommendations(subjectPerformance, attendanceRate, submittedHomework)
    });
  } catch (err) {
    createErrorResponse(err, res);
  }
};

const generateRecommendations = (subjectPerformance, attendanceRate, submittedHomework) => {
  const recommendations = [];
  subjectPerformance.forEach(subject => {
    if (subject.averagePercentage < 60) {
      recommendations.push({
        type: 'academic',
        priority: 'high',
        message: `Needs improvement in ${subject.subject}. Current average: ${subject.averagePercentage}%`,
        suggestion: 'Consider extra practice sessions and one-on-one support'
      });
    } else if (subject.averagePercentage < 75) {
      recommendations.push({
        type: 'academic', 
        priority: 'medium',
        message: `Doing well in ${subject.subject} but room for improvement`,
        suggestion: 'Encourage to aim for higher scores in upcoming assessments'
      });
    }
  });

  if (attendanceRate < 80) {
    recommendations.push({
      type: 'attendance',
      priority: 'high',
      message: `Low attendance rate: ${attendanceRate}%`,
      suggestion: 'Discuss attendance concerns with student and parents'
    });
  }

  if (submittedHomework < 5) {
    recommendations.push({
      type: 'homework',
      priority: 'medium',
      message: 'Low homework submission rate',
      suggestion: 'Monitor homework completion and provide reminders'
    });
  }

  return recommendations;
};

exports.getStudentAttendanceTimeline = async (req, res) => {
  try {
    const teacherId = await checkTeacher(req);
    const { studentId, classroomId } = req.params;
    const { startDate, endDate } = req.query;

    const classroom = await Classroom.findOne({
      _id: classroomId,
      classTeacher: teacherId,
      students: studentId
    });

    if (!classroom) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const attendance = await Attendance.find({
      student: studentId,
      classroom: classroomId,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).sort({ date: 1 });

    const monthlyAttendance = attendance.reduce((acc, record) => {
      const month = record.date.toISOString().substring(0, 7); // YYYY-MM
      if (!acc[month]) {
        acc[month] = { present: 0, absent: 0, total: 0 };
      }
      acc[month][record.status]++;
      acc[month].total++;
      return acc;
    }, {});

    res.json({
      student: studentId,
      classroom: classroomId,
      period: `${startDate} to ${endDate}`,
      dailyAttendance: attendance,
      monthlySummary: monthlyAttendance,
      statistics: {
        totalDays: attendance.length,
        present: attendance.filter(a => a.status === 'present').length,
        absent: attendance.filter(a => a.status === 'absent').length,
        attendanceRate: attendance.length > 0 ? 
          (attendance.filter(a => a.status === 'present').length / attendance.length) * 100 : 0
      }
    });
  } catch (err) {
    createErrorResponse(err, res);
  }
};

exports.getTeacherConversations = async (req, res) => {
  try {
    const teacherId = await checkTeacher(req);
    const teacherObjectId = new mongoose.Types.ObjectId(teacherId);

    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { from: teacherObjectId },
            { to: teacherObjectId }
          ],
          school: new mongoose.Types.ObjectId(req.user.school)
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$from", teacherObjectId] },
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
                    { $ne: ["$from", teacherObjectId] },
                    { $eq: ["$isRead", false] }
                  ]
                },
                1,
                0
              ]
            }
          },
          conversationType: { $first: "$conversationType" },
          student: { $first: "$student" },
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
        $lookup: {
          from: "users",
          localField: "student",
          foreignField: "_id",
          as: "studentInfo"
        }
      },
      {
        $project: {
          userId: "$_id",
          userName: "$userInfo.name",
          userRole: "$userInfo.role",
          userEmail: "$userInfo.email", 
          lastMessage: "$lastMessage.content",
          lastMessageTime: "$lastMessage.createdAt",
          unreadCount: 1,
          conversationType: 1,
          totalMessages: 1,
          student: { 
            $arrayElemAt: ["$studentInfo", 0] 
          }
        }
      },
      { $sort: { lastMessageTime: -1 } }
    ]);
    res.json({ 
      success: true, 
      conversations 
    });
  } catch (err) {
    createErrorResponse(err, res);
  }
};

exports.getTeacherConversation = async (req, res) => {
  try {
    const teacherId = await checkTeacher(req);
    const { otherUserId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const messages = await Message.find({
      school: req.user.school,
      $or: [
        { from: teacherId, to: otherUserId },
        { from: otherUserId, to: teacherId }
      ]
    })
    .populate('from', 'name role email') 
    .populate('to', 'name role email')   
    .populate('student', 'name email')  
        .sort({ createdAt: 1 });

    res.json({ 
      success: true, 
      messages 
    });
  } catch (err) {
    createErrorResponse(err, res);
  }
};


exports.getTeacherMessageContacts = async (req, res) => {
  try {
    const teacherId = await checkTeacher(req);

    const classrooms = await Classroom.find({
      classTeacher: teacherId,
      school: req.user.school
    })
    .populate('students', 'name email parentEmail'); 
    let contacts = [];

    for (let classroom of classrooms) {
      for (let student of classroom.students || []) {
        if (!student || !student._id) continue;

        contacts.push({
          _id: student._id,
          name: student.name,
          email: student.email,
          role: 'student',
          classroom: classroom.name,
          conversationType: 'teacher_student'
        });

        if (student.parentEmail) {
          try {
            const parentUser = await User.findOne({
              email: student.parentEmail,
              role: 'parent',
              school: req.user.school
            }).select('name email'); 

if (parentUser && parentUser._id) {
  contacts.push({
    _id: parentUser._id,
    name: parentUser.name || `Parent of ${student.name}`,
    email: parentUser.email,
    role: 'parent',
    studentName: student.name, 
    classroom: classroom.name,
    conversationType: 'teacher_parent'
  });
} 
          } catch (parentError) {
            res.status(500).json({ 
          error: parentError.message 
          });
          }
        }
      }
    }

    contacts = contacts.filter((contact, index, self) =>
      index === self.findIndex(c => 
        c._id.toString() === contact._id.toString()
      )
    );

    
    res.json({ 
      success: true, 
      contacts 
    });

  } catch (err) {
    res.status(500).json({ 
      message: "Failed to load contacts",
      error: err.message 
    });
  }
};

exports.getStudentParent = async (req, res) => {
  try {
    const teacherId = await checkTeacher(req);
    const { studentId } = req.params;
    const classroom = await Classroom.findOne({
      classTeacher: teacherId,
      students: studentId,
      school: req.user.school
    });

    if (!classroom) {
      return res.status(403).json({ message: "Student not found in your classroom" });
    }
    const student = await User.findById(studentId).select('name parentEmail');
    
    if (!student || !student.parentEmail) {
      return res.status(404).json({ message: "Student or parent email not found" });
    }

    const parent = await User.findOne({
      email: student.parentEmail,
      role: 'parent',
      school: req.user.school
    }).select('name email'); 

    res.json({
      success: true,
      student: {
        name: student.name,
        parentEmail: student.parentEmail
      },
      parent: parent
    });

  } catch (err) {
    res.status(500).json({ 
      message: "Failed to load parent information",
      error: err.message 
    });
  }
};