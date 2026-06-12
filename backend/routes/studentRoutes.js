const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  getDashboard,
  getMyAttendance,
  getMyGrades,
  getGradeReports,
  getMyHomework,
  submitHomework,
  getMySubmissions,
  getMyExamSchedule,
  getStudentConversations,
  getStudentConversation,
  getStudentMessageContacts,
  getAIConversations,
  getAIConversationHistory,
  clearAIConversations
} = require("../controllers/studentController");

router.get("/dashboard", protect, authorize("student"), getDashboard);
router.get("/attendance", protect, authorize("student"), getMyAttendance);
router.get("/grades", protect, authorize("student"), getMyGrades);
router.get("/grades/reports", protect, authorize("student"), getGradeReports);

router.get("/homework", protect, authorize("student"), getMyHomework);
router.post("/homework/submit", protect, authorize("student"), submitHomework);
router.get("/homework/submissions", protect, authorize("student"), getMySubmissions);

router.get("/exam-schedule", protect, authorize("student"), getMyExamSchedule);

router.get("/messaging/conversations", protect, authorize("student"), getStudentConversations);
router.get("/messaging/contacts", protect, authorize("student"), getStudentMessageContacts);
router.get("/messaging/conversation/:otherUserId", protect, authorize("student"), getStudentConversation);

router.get("/ai/conversations", protect, authorize("student"), getAIConversations);
router.get("/ai/history", protect, authorize("student"), getAIConversationHistory);
router.delete("/ai/clear", protect, authorize("student"), clearAIConversations);

module.exports = router;