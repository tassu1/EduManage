const Classroom = require("../models/Classroom");
const Attendance = require("../models/Attendance");
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


exports.createClassroom = async (req, res) => {
  try {
    const schoolId = await checkSchoolAdmin(req);
    const { name, grade, section, subject, classTeacherEmail } = req.body;


    let classTeacherId = null;

    if (classTeacherEmail) {
      const teacher = await User.findOne({ 
        email: classTeacherEmail, 
        school: schoolId, 
        role: 'teacher' 
      });
      
      if (!teacher) {
        return res.status(404).json({ 
          message: `Teacher with email ${classTeacherEmail} not found in your school` 
        });
      }
      classTeacherId = teacher._id;
    }

    const classroom = await Classroom.create({
      name,
      grade,
      section,
      subject: subject || 'General', 
      classTeacher: classTeacherId,
      school: schoolId
    });

    await classroom.populate('classTeacher', 'name email');

    res.status(201).json({
      message: "Classroom created successfully",
      classroom
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

exports.getAllClassrooms = async (req, res) => {
  try {
    const schoolId = await checkSchoolAdmin(req);
    
    const classrooms = await Classroom.find({ school: schoolId })
      .populate('classTeacher', 'name email')
      .populate('students', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      count: classrooms.length,
      classrooms
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

exports.addStudentToClass = async (req, res) => {
  try {
    const schoolId = await checkSchoolAdmin(req);
    const { classroomId, studentEmail } = req.body;

    const classroom = await Classroom.findOne({ _id: classroomId, school: schoolId });
    if (!classroom) return res.status(404).json({ message: "Classroom not found" });

    const student = await User.findOne({ 
      email: studentEmail, 
      school: schoolId, 
      role: 'student' 
    });
    
    if (!student) {
      return res.status(404).json({ 
        message: `Student with email ${studentEmail} not found in your school` 
      });
    }

    if (classroom.students.includes(student._id)) {
      return res.status(400).json({ 
        message: `${student.name} is already in this classroom` 
      });
    }

    classroom.students.push(student._id);
    await classroom.save();

    res.json({ 
      message: `${student.name} added to classroom successfully`,
      student: {
        name: student.name,
        email: student.email
      }
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

exports.getClassAttendance = async (req, res) => {
  try {
    const schoolId = await checkSchoolAdmin(req);
    const { classroomId } = req.params;

    const classroom = await Classroom.findOne({ _id: classroomId, school: schoolId });

    if (!classroom) {
      return res.status(404).json({ message: "Classroom not found" });
    }

    const attendance = await Attendance.find({ 
      classroom: classroomId,
      school: schoolId 
    })
      .populate('student', 'name email')
      .populate('teacher', 'name email')
      .sort({ date: -1 })
      .limit(50);

    res.json({
      count: attendance.length,
      attendance
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};


exports.getUnassignedStudents = async (req, res) => {
  try {
    const schoolId = await checkSchoolAdmin(req);
    const { classroomId } = req.params;

    const classroom = await Classroom.findOne({ _id: classroomId, school: schoolId });
    if (!classroom) {
      return res.status(404).json({ message: "Classroom not found" });
    }

    const unassignedStudents = await User.find({
      school: schoolId,
      role: 'student',
      _id: { $nin: classroom.students }
    }).select('name email grade section');

    res.json({
      count: unassignedStudents.length,
      students: unassignedStudents
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

exports.addMultipleStudentsByIds = async (req, res) => {
  try {
    const schoolId = await checkSchoolAdmin(req);
    const { classroomId, studentIds } = req.body;

    const classroom = await Classroom.findOne({ _id: classroomId, school: schoolId });
    if (!classroom) return res.status(404).json({ message: "Classroom not found" });

    const students = await User.find({
      _id: { $in: studentIds },
      school: schoolId,
      role: 'student'
    });

    if (students.length === 0) {
      return res.status(404).json({ message: "No valid students found" });
    }

    const newStudentIds = studentIds.filter(studentId => 
      !classroom.students.includes(studentId)
    );

    classroom.students.push(...newStudentIds);
    await classroom.save();

    await classroom.populate('students', 'name email');

    res.json({ 
      message: `${newStudentIds.length} students added to classroom successfully`,
      added: newStudentIds.length,
      classroom
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

exports.deleteClassroom = async (req, res) => {
  try {
    const schoolId = await checkSchoolAdmin(req);
    const { classroomId } = req.params;

    const classroom = await Classroom.findOne({ _id: classroomId, school: schoolId });
    if (!classroom) return res.status(404).json({ message: "Classroom not found" });

    await User.updateMany(
      { classroom: classroomId, school: schoolId },
      { $unset: { classroom: "" } }
    );

    await Classroom.findByIdAndDelete(classroomId);

    res.json({ 
      message: "Classroom deleted successfully",
      deletedClassroom: {
        name: classroom.name,
        grade: classroom.grade,
        section: classroom.section
      }
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};


exports.assignTeacherToClass = async (req, res) => {
  try {
    const schoolId = await checkSchoolAdmin(req);
    const { classroomId } = req.params;
    const { teacherEmail } = req.body;
    const classroom = await Classroom.findOne({ _id: classroomId, school: schoolId });
    if (!classroom) return res.status(404).json({ message: "Classroom not found" });

 
    const teacher = await User.findOne({ 
      email: teacherEmail, 
      school: schoolId, 
      role: 'teacher' 
    });
    
    if (!teacher) {
      return res.status(404).json({ 
        message: `Teacher with email ${teacherEmail} not found in your school` 
      });
    }

    classroom.classTeacher = teacher._id;
    await classroom.save();
    await classroom.populate('classTeacher', 'name email');

    res.json({ 
      message: `${teacher.name} assigned as class teacher successfully`,
      classroom
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};