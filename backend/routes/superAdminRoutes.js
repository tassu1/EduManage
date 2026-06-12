const express = require('express');
const router = express.Router();
const {
  getSuperDashboard,
  getAllSchools,
  createSchool,
  editSchool,
  deleteSchool,
  createSchoolAdmin,
  upgradeUserRole,
  getSchoolAnalytics
} = require('../controllers/superAdminController');

const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect, authorize("superadmin"));

router.get('/dashboard', getSuperDashboard);
router.get('/schools', getAllSchools);
router.post('/school', createSchool);
router.put('/school/:code', editSchool);
router.delete('/school/:code', deleteSchool);
router.post('/create-admin', createSchoolAdmin);
router.post('/upgrade-user', upgradeUserRole);

router.get('/school/:schoolId/analytics', getSchoolAnalytics);

module.exports = router;