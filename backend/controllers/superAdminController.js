const School = require("../models/School");
const User = require("../models/User");
const Attendance = require("../models/Attendance");
const Grade = require("../models/Grade");


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


    const schools = await School.find(
  { superAdmin: req.user.id },
  { _id: 1 }
);

const schoolIds = schools.map((school) => school._id);

const totalSchools = schoolIds.length;

const totalAdmins = await User.countDocuments({
  role: "schooladmin",
  createdBy: req.user.id,
});

const totalTeachers = await User.countDocuments({
  role: "teacher",
  school: { $in: schoolIds },
});

const totalStudents = await User.countDocuments({
  role: "student",
  school: { $in: schoolIds },
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
     console.log("aagya")

    const school = await School.findOne({ 
      _id: schoolId, 
      superAdmin: req.user.id 
    }).populate('teachers students parents staff adminId');

    if (!school) {
      return res.status(404).json({ message: "School not found or not authorized" });
    }

    const attendanceRecords = await Attendance.find({ school: schoolId });
    console.log(attendanceRecords)
    if (attendanceRecords.length === 0) {
      return { average: 0, totalRecords: 0, present: 0, absent: 0 };
    }

    const presentCount = attendanceRecords.filter(record => record.status === 'present').length;
    const average = Number(((presentCount / attendanceRecords.length) * 100).toFixed(2));
    average.toFixed(2);

    const gradeRecords = await Grade.find({ school: schoolId });
    
    if (gradeRecords.length === 0) {
      return { average: 0, totalRecords: 0, highest: 0, lowest: 0 };
    }

    const totalPercentage = gradeRecords.reduce((sum, record) => sum + record.percentage, 0);
   const averagegr = Number((totalPercentage / gradeRecords.length).toFixed(2));
   
    console.log("dekhte h")

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
        attendance: average,
        grades: averagegr
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
    console.log(analyticsData)
    res.json(analyticsData);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

