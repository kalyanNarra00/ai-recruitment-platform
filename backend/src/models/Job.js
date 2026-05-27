const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  requiredSkills: [String],
  experience: Number,
  salary: String,
  location: String,
  interviewLocation: {
    type: String,
    default: '',
  },
  hrEmail: {
    type: String,
    required: true,
    lowercase: true,
  },
  interviewerName: {
    type: String,
    default: 'Interview Panel',
  },
  interviewerEmail: {
    type: String,
    required: true,
    lowercase: true,
  },
  shortlistThreshold: {
    type: Number,
    min: 0,
    max: 100,
    default: 75,
  },
  interviewLeadHours: {
    type: Number,
    min: 1,
    default: 48,
  },
  meetingDurationMinutes: {
    type: Number,
    min: 15,
    default: 45,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Job', jobSchema);
