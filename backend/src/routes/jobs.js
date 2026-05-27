const express = require('express');
const { authMiddleware, authorize } = require('../middleware/auth');
const {
  createJob,
  getJobs,
  getJobById,
  updateJob,
  deleteJob,
} = require('../controllers/jobController');

const router = express.Router();

router.post('/', authMiddleware, authorize('admin'), createJob);
router.get('/', getJobs);
router.get('/:id', getJobById);
router.put('/:id', authMiddleware, authorize('admin'), updateJob);
router.delete('/:id', authMiddleware, authorize('admin'), deleteJob);

module.exports = router;
