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
  screeningDecision: {
    type: String,
    enum: ['pending', 'shortlisted', 'rejected'],
    default: 'pending',
  },
  status: {
    type: String,
    enum: [
      'applied',
      'interview_scheduled',
      'interview_completed',
      'hr_managerial_round',
      'selected',
      'rejected',
    ],
    default: 'applied',
  },
  emailSent: {
    type: Boolean,
    default: false,
  },
  lastEmailType: {
    type: String,
    default: 'none',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Application', applicationSchema);
