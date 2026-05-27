const express = require('express');
const { authMiddleware, authorize } = require('../middleware/auth');
const {
  createJob,
  getJobs,
} = require('../controllers/jobController');

const router = express.Router();

router.post('/', authMiddleware, authorize('admin'), createJob);
router.get('/', getJobs);

module.exports = router;
