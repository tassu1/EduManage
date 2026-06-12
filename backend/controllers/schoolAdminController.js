const School = require("../models/School");
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

exports.createUser = async (req, res) => {
  try {
    const schoolId = await checkSchoolAdmin(req);
    const { name, email, password, role, department, parentEmail } = req.body;

    const school = await School.findById(schoolId);
    if (!school) return res.status(404).json({ message: "School not found" });

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: "User already exists" });

    const allowedRoles = ["teacher", "student", "parent", "staff"];
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ message: "Not authorized to create this role" });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      school: schoolId,
      department: department || "",
      parentEmail: role === "student" ? parentEmail : undefined
    });

    const roleField = role + 's';
    school[roleField].push(user._id);
    await school.save();

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      parentEmail: user.parentEmail,
      school: user.school,
      message: `${role} created successfully`
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};


exports.getUsersByRole = async (req, res) => {
  try {
    const schoolId = await checkSchoolAdmin(req);
    const { role } = req.params;

    const school = await School.findById(schoolId).populate(role , 'name email role department');
    if (!school) return res.status(404).json({ message: "School not found" });

    const users = school[role ]; 
    res.json({
      
      users: users
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};


exports.getSchoolDashboard = async (req, res) => {
  try {
    const schoolId = await checkSchoolAdmin(req);

    const school = await School.findById(schoolId)
      .populate('teachers', 'name email')
      .populate('students', 'name email')
      .populate('parents', 'name email')
      .populate('staff', 'name email');

    if (!school) return res.status(404).json({ message: "School not found" });

    const dashboardData = {
      schoolName: school.name,
      schoolCode: school.code,
      totalTeachers: school.teachers.length,
      totalStudents: school.students.length,
      totalParents: school.parents.length,
      totalStaff: school.staff.length,
      recentActivity: `School created on ${school.createdAt.toDateString()}`
    };

    res.json(dashboardData);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};


exports.updateUser = async (req, res) => {
  try {
    const schoolId = await checkSchoolAdmin(req);
    const { userId } = req.params;
    const { name, email, department, parentEmail, subjects, classroom } = req.body;

    const user = await User.findOne({ _id: userId, school: schoolId });
    if (!user) return res.status(404).json({ message: "User not found in your school" });

    if (name) user.name = name;
    if (email) user.email = email;
    if (department) user.department = department;
    if (parentEmail) user.parentEmail = parentEmail;
    if (subjects ) user.subjects = subjects; 
    if (classroom ) user.classroom = classroom;

    await user.save();

    res.json({
      message: "User updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        parentEmail: user.parentEmail,
        subjects: user.subjects,
        classroom: user.classroom
      }
    });
  } catch (err) {
  
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const schoolId = await checkSchoolAdmin(req);
    const { userId } = req.params;

    const user = await User.findOne({ _id: userId, school: schoolId });
    if (!user) return res.status(404).json({ message: "User not found in your school" });

    const school = await School.findById(schoolId);
    const roleArray = user.role + 's'; 
    school[roleArray] = school[roleArray].filter(id => id.toString() !== userId);
    
    await school.save();
    await User.findByIdAndDelete(userId);

    res.json({ message: `${user.role} deleted successfully` });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

