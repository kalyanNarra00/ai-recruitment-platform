const express = require('express');
const { authMiddleware, authorize } = require('../middleware/auth');
const {
  getDashboardStats,
  getCandidateFunnel,
} = require('../controllers/analyticsController');

const router = express.Router();

router.get('/dashboard', authMiddleware, authorize('admin'), getDashboardStats);
router.get('/candidates/funnel', authMiddleware, authorize('admin'), getCandidateFunnel);

module.exports = router;
