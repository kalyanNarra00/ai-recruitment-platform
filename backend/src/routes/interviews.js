const express = require('express');
const { authMiddleware, authorize } = require('../middleware/auth');
const {
  updateInterviewOutcome,
} = require('../controllers/interviewController');

const router = express.Router();

router.put('/:id/outcome', authMiddleware, authorize('admin'), updateInterviewOutcome);

module.exports = router;
