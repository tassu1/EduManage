const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");

const {
  createUser,
  getUsersByRole,
  getSchoolDashboard,
  updateUser,
  deleteUser
} = require("../controllers/schoolAdminController");

const {
  createClassroom,
  addStudentToClass,
  getAllClassrooms,
  getClassAttendance,
  deleteClassroom,
  assignTeacherToClass,
  getUnassignedStudents,       
  addMultipleStudentsByIds      
} = require("../controllers/classController");

const {
  getSchoolAnalytics
} = require("../controllers/schoolAnalyticsController");

const {
  uploadTimetable,
  getClassTimetable,
  getAllTimetables
} = require("../controllers/timetableController");

const {
  createExamSchedule,
  getExamSchedules,
  updateExamSchedule,
  deleteExamSchedule
} = require("../controllers/examController");

router.post("/user", protect, authorize("schooladmin"), createUser);
router.get("/users/:role", protect, authorize("schooladmin"), getUsersByRole);
router.put("/user/:userId", protect, authorize("schooladmin"), updateUser);
router.delete("/user/:userId", protect, authorize("schooladmin"), deleteUser);

router.post("/classroom", protect, authorize("schooladmin"), createClassroom);
router.post("/classroom/add-student", protect, authorize("schooladmin"), addStudentToClass);
router.post("/classroom/add-students-by-ids", protect, authorize("schooladmin"), addMultipleStudentsByIds); 
router.get("/classrooms", protect, authorize("schooladmin"), getAllClassrooms);
router.get("/classroom/attendance/:classroomId", protect, authorize("schooladmin"), getClassAttendance);
router.get("/classroom/:classroomId/unassigned-students", protect, authorize("schooladmin"), getUnassignedStudents);
router.delete('/classroom/:classroomId', protect, authorize("schooladmin"), deleteClassroom);
router.put('/classroom/:classroomId/assign-teacher', protect, authorize("schooladmin"), assignTeacherToClass); 

router.get("/dashboard", protect, authorize("schooladmin"), getSchoolDashboard);
router.get("/analytics", protect, authorize("schooladmin"), getSchoolAnalytics);

router.post("/timetable", protect, authorize("schooladmin"), uploadTimetable);
router.get("/timetable/classroom/:classroomId", protect, authorize("schooladmin"), getClassTimetable);
router.get("/timetables", protect, authorize("schooladmin"), getAllTimetables);

router.post("/exam-schedule", protect, authorize("schooladmin"), createExamSchedule);
router.get("/exam-schedules", protect, authorize("schooladmin"), getExamSchedules);
router.put("/exam-schedule/:examId", protect, authorize("schooladmin"), updateExamSchedule);
router.delete("/exam-schedule/:examId", protect, authorize("schooladmin"), deleteExamSchedule);

module.exports = router;