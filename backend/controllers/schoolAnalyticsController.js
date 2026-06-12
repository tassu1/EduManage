const Attendance = require("../models/Attendance");
const Grade = require("../models/Grade");
const Classroom = require("../models/Classroom");
const User = require("../models/User");
const mongoose = require("mongoose");

const checkSchoolAdmin = async (req) => {
  if (!req.user || req.user.role !== "schooladmin") {
    const err = new Error("Not authorized as school admin");
    err.statusCode = 403;
    throw err;
  }
  
  const admin = await User.findById(req.user.id);
  if (!admin.school) {
    const err = new Error("School admin not assigned to any school");
    err.statusCode = 403;
    throw err;
  }
  
  return admin.school; 
};


exports.getSchoolAnalytics = async (req, res) => {
  try {
    const schoolId = await checkSchoolAdmin(req);

    const [teachers, students, parents, staff, totalClassrooms] = await Promise.all([
      User.countDocuments({ school: schoolId, role: 'teacher' }),
      User.countDocuments({ school: schoolId, role: 'student' }),
      User.countDocuments({ school: schoolId, role: 'parent' }),
      User.countDocuments({ school: schoolId, role: 'staff' }),
      Classroom.countDocuments({ school: schoolId })
    ]);

  
    const attendanceStats = await Attendance.aggregate([
      { $match: { school: new mongoose.Types.ObjectId(schoolId) } },
      { $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          presentCount: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
          absentCount: { $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] } }
        }
      }
    ]);

     
    const gradeStats = await Grade.aggregate([
      { $match: { school: new mongoose.Types.ObjectId(schoolId) } },
      { $group: {
          _id: null,
          averagePercentage: { $avg: "$percentage" },
          totalExams: { $sum: 1 },
          topScore: { $max: "$percentage" }
        }
      }
    ]);

     
    const topStudents = await Grade.aggregate([
      { $match: { school: new mongoose.Types.ObjectId(schoolId) } },
      { $group: {
          _id: "$student",
          averagePercentage: { $avg: "$percentage" },
          totalExams: { $sum: 1 }
        }
      },
      { $sort: { averagePercentage: -1 } },
      { $limit: 10 },
      { $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "studentInfo"
        }
      },
      { $unwind: "$studentInfo" },
      { $project: {
          name: "$studentInfo.name",
          email: "$studentInfo.email",
          averagePercentage: { $round: ["$averagePercentage", 2] },
          totalExams: 1
        }
      }
    ]);

    const recentAttendance = await Attendance.aggregate([
      { 
        $match: { 
          school: new mongoose.Types.ObjectId(schoolId),
          date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
        } 
      },
      { $group: {
          _id: "$classroom",
          presentCount: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
          totalCount: { $sum: 1 }
        }
      },
      { $lookup: {
          from: "classrooms",
          localField: "_id",
          foreignField: "_id",
          as: "classroomInfo"
        }
      },
      { $unwind: "$classroomInfo" },
      { $project: {
          classroomName: "$classroomInfo.name",
          grade: "$classroomInfo.grade",
          attendanceRate: { 
            $multiply: [
              { $divide: ["$presentCount", "$totalCount"] }, 
              100
            ] 
          },
          totalRecords: "$totalCount"
        }
      },
      { $sort: { attendanceRate: -1 } }
    ]);

    const analytics = {
      schoolOverview: {
        totalTeachers: teachers,
        totalStudents: students,
        totalParents: parents,
        totalStaff: staff,
        totalClassrooms: totalClassrooms
      },
      attendance: attendanceStats[0] ? {
        totalRecords: attendanceStats[0].totalRecords,
        presentCount: attendanceStats[0].presentCount,
        absentCount: attendanceStats[0].absentCount,
        overallRate: attendanceStats[0].totalRecords > 0 ? 
          ((attendanceStats[0].presentCount / attendanceStats[0].totalRecords) * 100).toFixed(2) : 0
      } : { totalRecords: 0, presentCount: 0, absentCount: 0, overallRate: 0 },
      academicPerformance: gradeStats[0] ? {
        averagePercentage: gradeStats[0].averagePercentage ? gradeStats[0].averagePercentage.toFixed(2) : 0,
        totalExams: gradeStats[0].totalExams,
        topScore: gradeStats[0].topScore ? gradeStats[0].topScore.toFixed(2) : 0
      } : { averagePercentage: 0, totalExams: 0, topScore: 0 },
      topStudents: topStudents || [],
      recentAttendance: recentAttendance || []
    };

    res.json(analytics);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};