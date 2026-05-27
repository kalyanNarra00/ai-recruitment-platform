const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authMiddleware, authorize } = require('../middleware/auth');
const {
  submitApplication,
  getApplications,
  getApplicationById,
  updateApplicationStatus,
} = require('../controllers/applicationController');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.resolve(__dirname, '..', '..', '..', 'ai-service', 'uploads');
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
    } catch (err) {
      console.error('Failed to create upload directory:', uploadDir, err.message);
      return cb(err);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

router.post('/', authMiddleware, upload.single('resume'), submitApplication);
router.get('/', authMiddleware, getApplications);
router.get('/:id', authMiddleware, getApplicationById);
router.put('/:id/status', authMiddleware, authorize('admin'), updateApplicationStatus);

module.exports = router;
