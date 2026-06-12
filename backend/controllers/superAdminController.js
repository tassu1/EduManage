const School = require("../models/School");
const User = require("../models/User");
const Attendance = require("../models/Attendance");
const Grade = require("../models/Grade");

const checkSuperAdmin = (req) => {
  if (!req.user || req.user.role !== "superadmin") {
    const err = new Error("Not authorized as superadmin");
    err.statusCode = 403;
    throw err;
  }
};

exports.createSchool = async (req, res) => {
  try {
 

    const { name, code, address, feesStructure } = req.body;
    
    const schoolExists = await School.findOne({ $or: [{ name }, { code }] });
    if (schoolExists)
      return res.status(400).json({ message: "School name or code already exists" });

    const defaultFeesStructure = {
      tuition: 0,
      transportation: 0,
      library: 0,
      sports: 0,
      other: 0
    };

    const school = await School.create({ 
      name, 
      code, 
      address, 
      feesStructure: feesStructure || defaultFeesStructure,
      superAdmin: req.user.id
    });
    
    res.status(201).json({
      message: "School created successfully",
      school: {
        _id: school._id,
        name: school.name,
        code: school.code,
        address: school.address,
        feesStructure: school.feesStructure,
        createdAt: school.createdAt
      }
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

exports.editSchool = async (req, res) => {
  try {
    const { code } = req.params;
    
    const school = await School.findOne({ 
      code: code, 
      superAdmin: req.user.id
    });
    
    if (!school) return res.status(404).json({ message: "School not found or not authorized" });

    const { name, newcode, address, feesStructure } = req.body;
    
    if (name) school.name = name;
    if (newcode) school.code = newcode;
    if (address) school.address = address;
    if (feesStructure) school.feesStructure = feesStructure;

    await school.save();
    
    res.json({
      message: "School updated successfully",
      school: {
        _id: school._id,
        name: school.name,
        code: school.code,
        address: school.address,
        feesStructure: school.feesStructure,
        updatedAt: school.updatedAt
      }
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

exports.deleteSchool = async (req, res) => {
  try {
    checkSuperAdmin(req);

    const { code } = req.params;
    
    const school = await School.findOne({ 
      code: code, 
      superAdmin: req.user.id
    });
    
    if (!school) return res.status(404).json({ message: "School not found or not authorized" });

    await School.findByIdAndDelete(school._id);
    res.json({ message: "School removed successfully" });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

exports.createSchoolAdmin = async (req, res) => {
  try {
    checkSuperAdmin(req);

    const { name, email, password, schoolCode } = req.body;
    
    const school = await School.findOne({ 
      code: schoolCode, 
      superAdmin: req.user.id
    });
    
    if (!school) return res.status(404).json({ message: "School not found or not authorized" });

    const adminExists = await User.findOne({ email });
    if (adminExists) return res.status(400).json({ message: "Email already used" });

    const admin = await User.create({
      name,
      email,
      password,
      role: "schooladmin",
      school: school._id,
      createdBy: req.user.id
    });

    school.adminId = admin._id;
    await school.save();

    res.status(201).json({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      school: school.name
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

exports.upgradeUserRole = async (req, res) => {
  try {
    checkSuperAdmin(req);
    
    const { email, newRole, schoolCode } = req.body; 
    
    const user = await User.findOne({ 
      email: email, 
      createdBy: req.user.id
    });

    const allowedRoles = ["schooladmin", "teacher", "staff"];
    if (!allowedRoles.includes(newRole))
      return res.status(403).json({ message: "Invalid role for upgrade" });

    if (!user) return res.status(404).json({ message: "User not found" });

    user.role = newRole;

    if (newRole === "schooladmin") {
      const school = await School.findOne({ 
        code: schoolCode, 
        superAdmin: req.user.id  
      });
      if (!school) return res.status(404).json({ message: "School not found" });
      school.adminId = user._id;
      await school.save();
      user.school = school._id;
    }

    await user.save();
    res.json({ message: `User ${user.name} upgraded to ${newRole}`, user });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

exports.getAllSchools = async (req, res) => {
  try {
  
    const schools = await School.find({ superAdmin: req.user.id })
      .select('name code address adminId feesStructure createdAt')
      .populate('adminId', 'name email');

    const schoolsWithStats = schools.map(school => ({
      _id: school._id,
      name: school.name,
      code: school.code,
      address: school.address,
      admin: school.adminId,
      feesStructure: school.feesStructure,
      createdAt: school.createdAt
    }));

    res.json({
      count: schools.length,
      schools: schoolsWithStats
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

exports.getSuperDashboard = async (req, res) => {
  try {


    const totalSchools = await School.countDocuments({ superAdmin: req.user.id });
    const totalAdmins = await User.countDocuments({ 
      role: "schooladmin", 
      createdBy: req.user.id 
    });
    const totalTeachers = await User.countDocuments({ 
      role: "teacher", 
      createdBy: req.user.id 
    });
    const totalStudents = await User.countDocuments({ 
      role: "student", 
      createdBy: req.user.id 
    });

    const dashboardData = {
      totalSchools,
      totalAdmins, 
      totalTeachers,
      totalStudents,
      message: "Your schools dashboard"
    };

    res.json(dashboardData);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};


exports.getSchoolAnalytics = async (req, res) => {
  try {
    const { schoolId } = req.params;

    const school = await School.findOne({ 
      _id: schoolId, 
      superAdmin: req.user.id 
    }).populate('teachers students parents staff adminId');

    if (!school) {
      return res.status(404).json({ message: "School not found or not authorized" });
    }

    const attendanceData = await calculateRealAttendance(schoolId);
    const gradeData = await calculateRealGrades(schoolId);

    const analyticsData = {
      schoolInfo: {
        name: school.name,
        code: school.code,
        address: school.address,
        admin: school.adminId ? school.adminId.name : 'Not assigned'
      },
      overview: {
        teachers: school.teachers.length,
        students: school.students.length,
        parents: school.parents.length,
        staff: school.staff.length
      },
      performance: {
        attendance: attendanceData.average,
        grades: gradeData.average
      },
      feesStructure: school.feesStructure,
      recentActivity: [
        {
          message: `${school.teachers.length} teachers active`,
          date: new Date().toLocaleDateString()
        },
        {
          message: `${school.students.length} students enrolled`,
          date: new Date().toLocaleDateString()
        }
      ]
    };

    res.json(analyticsData);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};


const calculateRealAttendance = async (schoolId) => {
  try {
  
    const attendanceRecords = await Attendance.find({ school: schoolId });
    
    if (attendanceRecords.length === 0) {
      return { average: 0, totalRecords: 0, present: 0, absent: 0 };
    }

    const presentCount = attendanceRecords.filter(record => record.status === 'present').length;
    const average = (presentCount / attendanceRecords.length) * 100;

    return {
      average: Math.round(average),
      totalRecords: attendanceRecords.length,
      present: presentCount,
      absent: attendanceRecords.length - presentCount
    };
  } catch (error) {
    return { average: 0, totalRecords: 0, present: 0, absent: 0 };
  }
};


const calculateRealGrades = async (schoolId) => {
  try {

    const gradeRecords = await Grade.find({ school: schoolId });
    
    if (gradeRecords.length === 0) {
      return { average: 0, totalRecords: 0, highest: 0, lowest: 0 };
    }

    const totalPercentage = gradeRecords.reduce((sum, record) => sum + record.percentage, 0);
    const average = totalPercentage / gradeRecords.length;
    const highest = Math.max(...gradeRecords.map(record => record.percentage));
    const lowest = Math.min(...gradeRecords.map(record => record.percentage));

    return {
      average: Math.round(average),
      totalRecords: gradeRecords.length,
      highest: Math.round(highest),
      lowest: Math.round(lowest)
    };
  } catch (error) {
    return { average: 0, totalRecords: 0, highest: 0, lowest: 0 };
  }
};