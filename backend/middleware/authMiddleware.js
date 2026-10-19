const jwt = require("jsonwebtoken");
const User = require("../models/User")

const authMiddleware = async (req, res, next) => {
  try {
    let token;
  
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }


    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route - No Token Provided'
      });
    }

    try {
  
      
const decoded = jwt.verify(token, process.env.JWT_SECRET);



const user = await User.findById(decoded.id).select("-password");

if (!user) {
  return res.status(401).json({
    success: false,
    message: "User account no longer exists",
  });
}

req.user = user;

next();

    
} catch (error) {
  console.error("JWT Error Name:", error.name);
  console.error("JWT Error Message:", error.message);

  return res.status(401).json({
    success: false,
    message: "Not authorized to access this route - Invalid Token"
  });
}

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

const protect = authMiddleware;

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

module.exports = {
  authMiddleware,
  protect, 
  authorize
};