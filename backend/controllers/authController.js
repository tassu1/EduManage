const User = require("../models/User");
const jwt = require("jsonwebtoken");


const generateToken = (id, role, school, email) => {  
  return jwt.sign({ id, role, school, email }, process.env.JWT_SECRET, { expiresIn: "7d" });  // ADD EMAIL
}

exports.registerUser = async (req, res) => {
  const { name, email, password, role, school } = req.body;
  try {
    let userExists = await User.findOne({ email });
    if(userExists) return res.status(400).json({ message: "User already exists" });

    const user = await User.create({ name, email, password, role, school });
    res.status(201).json({ 
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      school: user.school,
      token: generateToken(user._id, user.role, user.school, user.email)  
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
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