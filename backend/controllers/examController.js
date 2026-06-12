const ExamSchedule = require("../models/ExamSchedule");
const Classroom = require("../models/Classroom");
const User = require("../models/User");

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


exports.createExamSchedule = async (req, res) => {
  try {
    const schoolId = await checkSchoolAdmin(req);
    const { title, description, examType, schedules, academicYear } = req.body;

    if (!title || !examType) {
      return res.status(400).json({ 
        message: "Title and exam type are required" 
      });
    }

    if (!schedules || schedules.length === 0) {
      return res.status(400).json({ 
        message: "At least one exam schedule is required" 
      });
    }

    for (let i = 0; i < schedules.length; i++) {
      const schedule = schedules[i];
      
      if (!schedule.classroom) {
        return res.status(400).json({ 
          message: `Classroom is required for schedule ${i + 1}` 
        });
      }
      
      if (!schedule.subject || schedule.subject.trim() === '') {
        return res.status(400).json({ 
          message: `Subject is required for schedule ${i + 1}` 
        });
      }
      
      if (!schedule.date) {
        return res.status(400).json({ 
          message: `Date is required for schedule ${i + 1}` 
        });
      }
      
      if (!schedule.startTime) {
        return res.status(400).json({ 
          message: `Start time is required for schedule ${i + 1}` 
        });
      }
      
      if (!schedule.endTime) {
        return res.status(400).json({ 
          message: `End time is required for schedule ${i + 1}` 
        });
      }

      const classroom = await Classroom.findOne({ 
        _id: schedule.classroom, 
        school: schoolId 
      });
      
      if (!classroom) {
        return res.status(400).json({ 
          message: `Classroom not found or doesn't belong to your school for schedule ${i + 1}` 
        });
      }

      if (schedule.supervisor && schedule.supervisor.trim() !== '') {
        const supervisor = await User.findOne({ 
          _id: schedule.supervisor, 
          school: schoolId,
          role: 'teacher'
        });
        
        if (!supervisor) {
          return res.status(400).json({ 
            message: `Supervisor not found or is not a teacher for schedule ${i + 1}` 
          });
        }
      }
    }

    const cleanedSchedules = schedules.map(schedule => ({
      ...schedule,
      supervisor: schedule.supervisor && schedule.supervisor.trim() !== '' ? schedule.supervisor : null
    }));

    const examSchedule = await ExamSchedule.create({
      title: title.trim(),
      description: description?.trim() || '',
      examType,
      schedules: cleanedSchedules,
      academicYear: academicYear || "2024-2025",
      school: schoolId,
      createdBy: req.user.id
    });

    const populatedExamSchedule = await ExamSchedule.findById(examSchedule._id)
      .populate('schedules.classroom', 'name grade section subject')
      .populate('schedules.supervisor', 'name email')
      .populate('createdBy', 'name email');


    res.status(201).json({
      message: "Exam schedule created successfully",
      examSchedule: populatedExamSchedule
    });
  } catch (err) {

    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(error => error.message);
      return res.status(400).json({ 
        message: "Validation error", 
        errors 
      });
    }

    if (err.code === 11000) {
      return res.status(400).json({ 
        message: "Exam schedule with this title already exists" 
      });
    }
    
    res.status(err.statusCode || 500).json({ 
      message: err.message || "Internal server error" 
    });
  }
};

exports.getExamSchedules = async (req, res) => {
  try {
    const schoolId = await checkSchoolAdmin(req);

    const examSchedules = await ExamSchedule.find({ school: schoolId })
      .populate({
        path: 'schedules.classroom',
        select: 'name grade section subject',
        populate: {
          path: 'classTeacher',
          select: 'name email'
        }
      })
      .populate('schedules.supervisor', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    const enhancedExamSchedules = examSchedules.map(exam => ({
      _id: exam._id,
      title: exam.title,
      description: exam.description,
      examType: exam.examType,
      academicYear: exam.academicYear,
      isPublished: exam.isPublished,
      createdAt: exam.createdAt,
      updatedAt: exam.updatedAt,
      createdBy: exam.createdBy,
      schedules: exam.schedules.map(schedule => ({
        _id: schedule._id,
        classroom: schedule.classroom ? {
          _id: schedule.classroom._id,
          name: schedule.classroom.name,
          grade: schedule.classroom.grade,
          section: schedule.classroom.section,
          subject: schedule.classroom.subject,
          classTeacher: schedule.classroom.classTeacher
        } : null,
        subject: schedule.subject,
        date: schedule.date,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        duration: schedule.duration,
        totalMarks: schedule.totalMarks,
        room: schedule.room,
        supervisor: schedule.supervisor ? {
          _id: schedule.supervisor._id,
          name: schedule.supervisor.name,
          email: schedule.supervisor.email
        } : null
      }))
    }));

    res.json({
      count: enhancedExamSchedules.length,
      examSchedules: enhancedExamSchedules
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

exports.updateExamSchedule = async (req, res) => {
  try {
    const schoolId = await checkSchoolAdmin(req);
    const { examId } = req.params;
    const updates = req.body;

    const examSchedule = await ExamSchedule.findOne({ 
      _id: examId, 
      school: schoolId 
    });

    if (!examSchedule) {
      return res.status(404).json({ message: "Exam schedule not found" });
    }

    if (updates.schedules) {
      for (let i = 0; i < updates.schedules.length; i++) {
        const schedule = updates.schedules[i];
        
        if (schedule.classroom) {
          const classroom = await Classroom.findOne({ 
            _id: schedule.classroom, 
            school: schoolId 
          });
          
          if (!classroom) {
            return res.status(400).json({ 
              message: `Classroom not found for schedule ${i + 1}` 
            });
          }
        }

        if (schedule.supervisor !== undefined) {
          updates.schedules[i].supervisor = schedule.supervisor && schedule.supervisor.trim() !== '' ? schedule.supervisor : null;
        }
      }
    }

    Object.keys(updates).forEach(key => {
      examSchedule[key] = updates[key];
    });

    await examSchedule.save();

    const populatedExamSchedule = await ExamSchedule.findById(examSchedule._id)
      .populate('schedules.classroom', 'name grade section subject')
      .populate('schedules.supervisor', 'name email')
      .populate('createdBy', 'name email');

    res.json({
      message: "Exam schedule updated successfully",
      examSchedule: populatedExamSchedule
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

exports.deleteExamSchedule = async (req, res) => {
  try {
    const schoolId = await checkSchoolAdmin(req);
    const { examId } = req.params;

    const examSchedule = await ExamSchedule.findOne({ 
      _id: examId, 
      school: schoolId 
    });

    if (!examSchedule) {
      return res.status(404).json({ message: "Exam schedule not found" });
    }

    await ExamSchedule.findByIdAndDelete(examId);

    res.json({ message: "Exam schedule deleted successfully" });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};