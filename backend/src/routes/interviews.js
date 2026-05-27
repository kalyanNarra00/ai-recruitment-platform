const express = require('express');
const { authMiddleware, authorize } = require('../middleware/auth');
const {
  getInterviews,
  updateInterviewOutcome,
} = require('../controllers/interviewController');

const router = express.Router();

router.get('/', authMiddleware, getInterviews);
router.put('/:id/outcome', authMiddleware, authorize('admin'), updateInterviewOutcome);

module.exports = router;
