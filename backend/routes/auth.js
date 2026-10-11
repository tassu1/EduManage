const express = require("express");
const router = express.Router();
const { registerUser, 
    loginUser
 } = require("../controllers/authController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

router.post(
  "/register",
  protect,
  authorize("schooladmin"),
  registerUser
);
router.post(
    "/login", 
    loginUser);

module.exports = router;
