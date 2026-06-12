const mongoose = require("mongoose");
const Attendance = require("../models/Attendance");
const Grade = require("../models/Grade");
const User = require("../models/User");
const Message = require("../models/Message");
const Classroom = require("../models/Classroom");
const Homework = require("../models/Homework");

const checkParent = (req) => {
  if (!req.user || req.user.role !== "parent") {
    const err = new Error("Not authorized as parent");
    err.statusCode = 403;
    throw err;
  }
  return req.user.id;
};


exports.getMyChildren = async (req, res) => {
  try {
    const children = await User.find({ 
      parentEmail: req.user.email,
      school: req.user.school, 
      role: "student"           
    }).populate('classroom', 'name grade section');


    res.json({
      parent: req.user.name,
      parentEmail: req.user.email,
      children: children.map(child => ({
        _id: child._id,
        name: child.name,
        email: child.email,
        classroom: child.classroom,
        parentEmail: child.parentEmail 
      }))
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};


exports.getChildAttendance = async (req, res) => {
  try {
   
    const { childId } = req.params;
    const { startDate, endDate, subject } = req.query;

    const child = await User.findOne({
      _id: childId,
      parentEmail: req.user.email,
      school: req.user.school, 
      role: "student"
    });

    if (!child) {
      return res.status(404).json({ 
        message: "Child not found or you don't have access to this child" 
      });
    }

    const currentYear = new Date().getFullYear();
    const defaultStartDate = `${currentYear}-01-01`;
    const defaultEndDate = `${currentYear}-12-31`;

    const query = { 
      student: childId,
      school: req.user.school,
      date: { 
        $gte: new Date(startDate || defaultStartDate), 
        $lte: new Date(endDate || defaultEndDate) 
      }
    };
    
    if (subject) query.subject = subject;

    const attendance = await Attendance.find(query)
      .populate('teacher', 'name')
      .sort({ date: -1 });

    const totalClasses = attendance.length;
    const presentClasses = attendance.filter(a => a.status === 'present').length;
    const attendancePercentage = totalClasses > 0 ? (presentClasses / totalClasses) * 100 : 0;

    res.json({
      child: child.name,
      period: `${startDate || defaultStartDate} to ${endDate || defaultEndDate}`,
      summary: {
        totalClasses,
        presentClasses,
        absentClasses: totalClasses - presentClasses,
        attendancePercentage: attendancePercentage.toFixed(2) + '%'
      },
      attendanceRecords: attendance.map(record => ({
        _id: record._id,
        date: record.date,
        subject: record.subject,
        status: record.status,
        teacher: record.teacher
      }))
    });

  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

exports.getChildGrades = async (req, res) => {
  try {

    const { childId } = req.params;
    const { subject } = req.query;

    const child = await User.findOne({
      _id: childId,
      parentEmail: req.user.email,
      school: req.user.school,  
      role: "student"
    });

    if (!child) {
      return res.status(404).json({ 
        message: "Child not found or you don't have access to this child" 
      });
    }

    const query = { 
      student: childId,
      school: req.user.school
    };

    if (subject) query.subject = subject;

    const grades = await Grade.find(query)
      .populate('teacher', 'name')
      .sort({ createdAt: -1 });

    res.json({
      child: child.name,
      grades
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

exports.getMyProfile = async (req, res) => {
  try {

    const children = await User.find({ 
      parentEmail: req.user.email,
      school: req.user.school,  
      role: "student"          
    }).populate('classroom', 'name');

    res.json({
      parent: {
        name: req.user.name,
        email: req.user.email,
        school: req.user.school
      },
      children: children.map(child => ({
        name: child.name,
        email: child.email,
        classroom: child.classroom?.name,
        parentEmail: child.parentEmail
      }))
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const parentId = checkParent(req);

    const children = await User.find({ 
      parentEmail: req.user.email,
      school: req.user.school, 
      role: "student"           
    }).populate('classroom', 'name');


    if (children.length === 0) {
      return res.json({
        parent: req.user,
        children: [],
        summary: {
          overallAverage: "N/A",
          attendanceRate: "N/A",
          unreadMessages: 0,
          totalChildren: 0,
          pendingHomework: 0
        }
      });
    }

    const childrenIds = children.map(child => child._id);
    
    const recentGrades = await Grade.find({ 
      student: { $in: childrenIds },
      school: req.user.school
    })
    .populate('student', 'name')
    .populate('teacher', 'name')
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const attendanceRecords = await Attendance.find({ 
      student: { $in: childrenIds },
      school: req.user.school,
      date: { $gte: startOfMonth }
    });

    const presentCount = attendanceRecords.filter(a => a.status === 'present').length;
    const attendanceRate = attendanceRecords.length > 0 
      ? Math.round((presentCount / attendanceRecords.length) * 100) + '%'
      : "N/A";

      const allGrades = await Grade.find({ 
      student: { $in: childrenIds },
      school: req.user.school
    });
    
    const overallAverage = allGrades.length > 0 
      ? (allGrades.reduce((sum, grade) => sum + grade.percentage, 0) / allGrades.length).toFixed(1) + '%'
      : "N/A";

    const unreadMessages = await Message.countDocuments({
      to: parentId,
      isRead: false,
      school: req.user.school
    });

    const pendingHomework = await Homework.countDocuments({
      classroom: { $in: children.map(c => c.classroom?._id).filter(Boolean) },
      dueDate: { $gte: new Date() },
      school: req.user.school
    });

    const formattedRecentGrades = recentGrades.map(grade => ({
      childName: grade.student.name,
      subject: grade.subject,
      examTitle: grade.examTitle,
      percentage: grade.percentage,
      grade: grade.grade,
      teacherName: grade.teacher?.name || 'Teacher'
    }));

  
    const recentMessages = await Message.find({
      $or: [
        { from: parentId },
        { to: parentId }
      ],
      school: req.user.school,
      conversationType: "teacher_parent"
    })
    .populate('from', 'name role')
    .populate('student', 'name')
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

    const formattedRecentMessages = recentMessages.map(msg => ({
      teacherName: msg.from.role === 'teacher' ? msg.from.name : 'You',
      content: msg.content,
      timestamp: msg.createdAt,
      childName: msg.student?.name || 'Child'
    }));

    res.json({
      parent: {
        name: req.user.name,
        email: req.user.email,
        school: req.user.school
      },
      children: children.map(child => ({
        _id: child._id,
        name: child.name,
        email: child.email,
        classroom: child.classroom?.name,
        parentEmail: child.parentEmail,
        school: child.school
      })),
      summary: {
        overallAverage,
        attendanceRate,
        unreadMessages,
        totalChildren: children.length,
        pendingHomework
      },
      recentGrades: formattedRecentGrades,
      recentMessages: formattedRecentMessages
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

exports.getChildHomework = async (req, res) => {
  try {
    const { childId } = req.params;

    const child = await User.findOne({
      _id: childId,
      parentEmail: req.user.email,
      school: req.user.school,
      role: "student"
    }).populate('classroom');

    if (!child) {
      return res.status(404).json({ 
        message: "Child not found or you don't have access to this child" 
      });
    }

    const homework = await Homework.find({
      classroom: child.classroom,
      school: req.user.school
    })
    .populate('teacher', 'name')
    .sort({ dueDate: 1 });

    res.json({
      child: child.name,
      homework: homework.map(hw => ({
        _id: hw._id,
        title: hw.title,
        description: hw.description,
        subject: hw.subject,
        teacher: hw.teacher,
        dueDate: hw.dueDate,
        totalPoints: hw.totalPoints,
        instructions: hw.instructions,
        isSubmitted: false 
      }))
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};


exports.getParentConversations = async (req, res) => {
  try {
    
    const parentId = checkParent(req);
    const parentObjectId = new mongoose.Types.ObjectId(parentId);
    const schoolObjectId = new mongoose.Types.ObjectId(req.user.school);


    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { from: parentObjectId },
            { to: parentObjectId }
          ],
          school: schoolObjectId,
     
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$from", parentObjectId] },
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
                    { $ne: ["$from", parentObjectId] },
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
          from: "users",
          localField: "lastMessage.student",
          foreignField: "_id",
          as: "studentInfo"
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
          conversationType: "teacher_parent",
          student: { $arrayElemAt: ["$studentInfo", 0] }
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

exports.getParentMessageContacts = async (req, res) => {
  try {
    const children = await User.find({
      parentEmail: req.user.email,
      role: 'student',
      school: req.user.school
    });

    if (!children || children.length === 0) {
      return res.json({ 
        success: true, 
        contacts: [] 
      });
    }


    let contacts = [];
    const teacherIds = new Set(); 

    for (const child of children) {
      const classrooms = await Classroom.find({
        students: child._id,
        school: req.user.school
      }).populate('classTeacher', 'name email avatar');

      // Add teachers from each classroom
      classrooms.forEach(classroom => {
        if (classroom.classTeacher && !teacherIds.has(classroom.classTeacher._id.toString())) {
          teacherIds.add(classroom.classTeacher._id.toString());
          
          contacts.push({
            _id: classroom.classTeacher._id,
            name: classroom.classTeacher.name,
            email: classroom.classTeacher.email,
            avatar: classroom.classTeacher.avatar,
            role: 'teacher',
            studentName: child.name,
            studentId: child._id,
            classroom: classroom.name,
            gradeSection: `${classroom.grade}-${classroom.section}`,
            subject: classroom.subject,
            conversationType: 'teacher_parent',
            isClassTeacher: true
          });
          
        }
      });
    }

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

exports.getParentConversation = async (req, res) => {
  try {
    const parentId = await checkParent(req); 
    const { otherUserId } = req.params;

    const messages = await Message.find({
      school: req.user.school,
      $or: [
        { from: parentId, to: otherUserId },
        { from: otherUserId, to: parentId }
      ]
    })
    .populate('from', 'name role email avatar')
    .populate('to', 'name role email avatar')
    .populate('student', 'name')
    .sort({ createdAt: 1 });

    await Message.updateMany(
      {
        from: otherUserId,
        to: parentId,
        isRead: false,
        school: req.user.school
      },
      {
        $set: { isRead: true, readAt: new Date() }
      }
    );

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


// exports.sendParentMessage = async (req, res) => {
//   try {
//     const parentId = checkParent(req);
//     const { to, content, studentId } = req.body;

//     const message = new Message({
//       from: parentId,
//       to: to,
//       content: content,
//       school: req.user.school,
//       student: studentId,
//       conversationType: 'teacher_parent'
//     });

//     await message.save();

//     // Populate for response
//     await message.populate('from', 'name role avatar');
//     await message.populate('to', 'name role avatar');
//     await message.populate('student', 'name');

//     console.log(`✅ [PARENT] Message sent successfully`);

//     // Emit socket event for real-time messaging
//     if (global.io) {
//       global.io.to(to.toString()).emit('new-chat-message', {
//         id: message._id,
//         from: { 
//           _id: message.from._id, 
//           name: message.from.name, 
//           role: message.from.role 
//         },
//         content: message.content,
//         timestamp: message.createdAt,
//         student: message.student,
//         conversationType: 'teacher_parent'
//       });
//     }

//     res.json({
//       success: true,
//       message: {
//         _id: message._id,
//         from: message.from,
//         to: message.to,
//         content: message.content,
//         createdAt: message.createdAt,
//         student: message.student,
//         conversationType: 'teacher_parent'
//       }
//     });
//   } catch (err) {
//     console.error('❌ [PARENT] Error sending message:', err);
//     res.status(500).json({
//       success: false,
//       message: err.message
//     });
//   }
// };