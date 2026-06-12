const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  getMyChildren,
  getDashboard,
  getChildAttendance,
  getChildGrades,
  getMyProfile,
  getParentConversations,
  getParentMessageContacts,
  getParentConversation,
  getChildHomework
} = require("../controllers/parentController");

router.get("/dashboard", protect, authorize("parent"), getDashboard);
router.get("/profile", protect, authorize("parent"), getMyProfile);
router.get("/children", protect, authorize("parent"), getMyChildren);
router.get("/attendance/:childId", protect, authorize("parent"), getChildAttendance);
router.get("/grades/:childId", protect, authorize("parent"), getChildGrades);
router.get("/homework/:childId", protect, authorize("parent"), getChildHomework);
router.get("/messaging/conversations", protect, authorize("parent"), getParentConversations);
router.get("/messaging/contacts", protect, authorize("parent"), getParentMessageContacts);
router.get("/messaging/conversation/:otherUserId", protect, authorize("parent"), getParentConversation);


module.exports = router;