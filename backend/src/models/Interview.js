const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: true,
    unique: true,
  },
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
  },
  interviewerName: {
    type: String,
    required: true,
  },
  interviewerEmail: {
    type: String,
    required: true,
    lowercase: true,
  },
  interviewLocation: {
    type: String,
    required: true,
  },
  zoomLink: {
    type: String,
    required: true,
  },
  meetingDurationMinutes: {
    type: Number,
    default: 45,
  },
  scheduledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  scheduledTime: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled'],
    default: 'scheduled',
  },
  feedback: {
    type: String,
  },
  decision: {
    type: String,
    enum: ['pending', 'hr_managerial_round', 'rejected'],
    default: 'pending',
  },
  completedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('Interview', interviewSchema);
