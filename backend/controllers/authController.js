const User = require("../models/User");
const jwt = require("jsonwebtoken");
const School = require("../models/School");

const generateToken = (id, role, school, email) => {  
  return jwt.sign({ id, role, school, email }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, role, school } = req.body;

    if (!name || !email || !password || !role || !school) {
      return res.status(400).json({
        message: "Name, email, password, role, and school are required",
      });
    }

    const allowedRoles = ["student", "teacher", "parent", "staff"];

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        message: "You cannot create this role",
      });
    }

  
    if (!req.user || !req.user.school) {
      return res.status(403).json({
        message: "Your account is not assigned to a school",
      });
    }
const schoolExists = await School.findById(req.user.school);

    if (schoolExists.name !== school) {
      return res.status(403).json({
        message: "You cannot create users for another school",
      });
    }
    
    const normalizedEmail = email.trim().toLowerCase();
    const userExists = await User.findOne({
      email: normalizedEmail,
    });

    if (userExists) {
      return res.status(409).json({
        message: "User already exists",
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role,
      school: req.user.school,
    });

    return res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      school: user.school,
      token: generateToken(
        user._id,
        user.role,
        user.school,
        user.email
      ),
    });
  } catch (err) {
    console.error("registerUser error:", err.message);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};


exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if(user && (await user.matchPassword(password))) {
      
      let responseData = {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        school: user.school,
        token: generateToken(user._id, user.role, user.school, user.email)  
      };

      if (user.role === "parent") {
        const children = await User.find({ 
          parentEmail: user.email,
          school: user.school 
        }).select('name email role _id');
        
        responseData.children = children;
      }

      res.json(responseData);
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};