const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
  },
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  resumeUrl: String,
  matchScore: {
    type: Number,
    min: 0,
    max: 100,
  },
  extractedSkills: [String],
  status: {
    type: String,
    enum: ['received', 'shortlisted', 'rejected'],
    default: 'received',
  },
  emailSent: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Application', applicationSchema);
