const express = require('express');
const { authMiddleware, authorize } = require('../middleware/auth');
const {
  getDashboardStats,
  getJobAnalytics,
  getCandidateFunnel,
} = require('../controllers/analyticsController');

const router = express.Router();

router.get('/dashboard', authMiddleware, authorize('hr_manager', 'recruiter', 'admin'), getDashboardStats);
router.get('/jobs/:jobId', authMiddleware, authorize('hr_manager', 'recruiter', 'admin'), getJobAnalytics);
router.get('/candidates/funnel', authMiddleware, authorize('hr_manager', 'recruiter', 'admin'), getCandidateFunnel);

module.exports = router;
