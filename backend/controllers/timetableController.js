const Timetable = require("../models/Timetable");
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

exports.uploadTimetable = async (req, res) => {
  try {
    const schoolId = await checkSchoolAdmin(req);
    const { classroomId, schedule } = req.body;

    if (!classroomId || !schedule || !Array.isArray(schedule)) {
      return res.status(400).json({ 
        message: "Classroom ID and schedule array are required" 
      });
    }

    const classroom = await Classroom.findOne({ 
      _id: classroomId, 
      school: schoolId 
    }).populate('classTeacher', 'name email');
    
    if (!classroom) {
      return res.status(404).json({ message: "Classroom not found" });
    }

    const cleanedSchedule = schedule.map(day => ({
      day: day.day,
      dayLabel: day.dayLabel || day.day.charAt(0).toUpperCase() + day.day.slice(1),
      periods: day.periods.map(period => ({
        periodNumber: period.periodNumber,
        periodName: period.periodName || `Period ${period.periodNumber}`,
        startTime: period.startTime,
        endTime: period.endTime,
        subject: period.subject?.trim() || '',
        teacher: period.teacher?.trim() || '', 
        room: period.room?.trim() || ''
      }))
    }));

    let timetable = await Timetable.findOne({ 
      classroom: classroomId,
      school: schoolId 
    });
    
    if (timetable) {
      timetable.schedule = cleanedSchedule;
      timetable.updatedBy = req.user.id;
      timetable.updatedAt = new Date();
    } else {
      timetable = new Timetable({
        classroom: classroomId,
        school: schoolId,
        schedule: cleanedSchedule,
        academicYear: "2024-2025",
        createdBy: req.user.id
      });
    }

    await timetable.save();
    const populatedTimetable = await Timetable.findById(timetable._id)
      .populate({
        path: 'classroom',
        populate: {
          path: 'classTeacher',
          select: 'name email'
        }
      })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    res.json({
      message: "Timetable uploaded successfully",
      timetable: populatedTimetable
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ 
      message: err.message || 'Internal server error' 
    });
  }
};

exports.getClassTimetable = async (req, res) => {
  try {
    const schoolId = await checkSchoolAdmin(req);
    const { classroomId } = req.params;

    const timetable = await Timetable.findOne({ 
      classroom: classroomId,
      school: schoolId 
    })
    .populate({
      path: 'classroom',
      populate: {
        path: 'classTeacher',
        select: 'name email'
      }
    });

    if (!timetable) {
      return res.status(404).json({ message: "Timetable not found for this classroom" });
    }

    res.json({ timetable });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

exports.getAllTimetables = async (req, res) => {
  try {
    const schoolId = await checkSchoolAdmin(req);

    const timetables = await Timetable.find({ school: schoolId })
      .populate({
        path: 'classroom',
        select: 'name grade section classTeacher subject',
        populate: {
          path: 'classTeacher',
          select: 'name email'
        }
      })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ 'classroom.grade': 1, 'classroom.section': 1 });

    const enhancedTimetables = timetables.map(timetable => {
      const enhancedSchedule = timetable.schedule.map(day => ({
        day: day.day,
        dayLabel: day.dayLabel,
        periods: day.periods.map(period => ({
          periodNumber: period.periodNumber,
          periodName: period.periodName,
          startTime: period.startTime,
          endTime: period.endTime,
          subject: period.subject,
          teacher: period.teacher,
          room: period.room,
          teacherDisplay: period.teacher && period.teacher.trim() !== '' 
            ? period.teacher 
            : timetable.classroom?.classTeacher?.name || 'No teacher assigned'
        }))
      }));

      return {
        _id: timetable._id,
        classroom: {
          _id: timetable.classroom?._id,
          name: timetable.classroom?.name,
          grade: timetable.classroom?.grade,
          section: timetable.classroom?.section,
          subject: timetable.classroom?.subject,
          classTeacher: timetable.classroom?.classTeacher ? {
            _id: timetable.classroom.classTeacher._id,
            name: timetable.classroom.classTeacher.name,
            email: timetable.classroom.classTeacher.email
          } : null
        },
        schedule: enhancedSchedule,
        academicYear: timetable.academicYear,
        createdAt: timetable.createdAt,
        updatedAt: timetable.updatedAt,
        createdBy: timetable.createdBy,
        updatedBy: timetable.updatedBy
      };
    });

    res.json({
      count: enhancedTimetables.length,
      timetables: enhancedTimetables
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

exports.deleteTimetable = async (req, res) => {
  try {
    const schoolId = await checkSchoolAdmin(req);
    const { timetableId } = req.params;

    const timetable = await Timetable.findOneAndDelete({
      _id: timetableId,
      school: schoolId
    });

    if (!timetable) {
      return res.status(404).json({ message: "Timetable not found" });
    }

    res.json({ message: "Timetable deleted successfully" });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
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