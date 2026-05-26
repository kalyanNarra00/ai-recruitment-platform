const express = require('express');
const multer = require('multer');
const { authMiddleware, authorize } = require('../middleware/auth');
const {
  submitApplication,
  getApplications,
  getApplicationById,
  updateApplicationStatus,
} = require('../controllers/applicationController');

const router = express.Router();

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

router.post('/', authMiddleware, upload.single('resume'), submitApplication);
router.get('/', authMiddleware, getApplications);
router.get('/:id', authMiddleware, getApplicationById);
router.put('/:id/status', authMiddleware, authorize('recruiter', 'hr_manager', 'admin'), updateApplicationStatus);

module.exports = router;
