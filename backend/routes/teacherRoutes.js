const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  getMyClassrooms,
  markClassAttendance,
  getClassAttendanceReport,
  uploadGrade,
  uploadClassGrades,
  getStudentGrades,
  getClassPerformance,
  createHomework,
  getMyHomework,
  getClassHomework,
  updateHomework,
  deleteHomework,
  uploadHomeworkFiles,
  deleteHomeworkAttachment,
  getHomeworkFile,
  getHomeworkSubmissions,
  gradeSubmission,
  bulkGradeSubmissions,
  downloadSubmissions,
  TeacherDashboard, 
  getStudentDetailedReport,
  getStudentAttendanceTimeline, 
  getTeacherConversations,
  getTeacherConversation,
 getTeacherMessageContacts,
 getStudentParent,
 getMyTimetable

} = require("../controllers/teacherController");

const upload = require("../config/multer");
router.use(protect, authorize("teacher"));
router.get("/classrooms", getMyClassrooms);
router.post("/attendance/class", markClassAttendance);
router.get("/attendance/class/:classroomId", getClassAttendanceReport);
router.post("/grade", uploadGrade);
router.post("/grades/class", uploadClassGrades);
router.get("/grades/student", getStudentGrades);
router.get("/grades/class-performance", getClassPerformance);
router.post("/homework", upload.array('attachments', 5), createHomework);
router.get("/homework", getMyHomework);
router.get("/homework/class/:classroomId", getClassHomework);
router.put("/homework/:homeworkId", updateHomework);
router.delete("/homework/:homeworkId", deleteHomework);
router.post("/homework/:homeworkId/files", upload.array('attachments', 5), uploadHomeworkFiles);
router.delete("/homework/:homeworkId/attachments/:attachmentId", deleteHomeworkAttachment);
router.get("/homework/:homeworkId/submissions", getHomeworkSubmissions);
router.put("/submissions/:submissionId/grade", gradeSubmission);
router.post("/homework/:homeworkId/bulk-grade", bulkGradeSubmissions);
router.get("/homework/:homeworkId/download", downloadSubmissions);
router.get("/dashboard", TeacherDashboard); 
 router.get("/timetable", getMyTimetable);
router.get("/student/:studentId/report/:classroomId", getStudentDetailedReport); 
router.get("/student/:studentId/attendance/:classroomId", getStudentAttendanceTimeline); 
router.get('/messaging/conversations',getTeacherConversations);
router.get('/messaging/conversation/:otherUserId', getTeacherConversation);
router.get('/messaging/contacts',getTeacherMessageContacts);
router.get('/student/:studentId/parent', getStudentParent);
router.get("/homework/:homeworkId/files/:filename", getHomeworkFile);

module.exports = router; 