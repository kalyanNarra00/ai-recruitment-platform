const mongoose = require('mongoose');

const emailSchema = new mongoose.Schema({
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: true,
  },
  recipientEmail: {
    type: String,
    required: true,
  },
  subject: String,
  body: String,
  type: {
    type: String,
    enum: ['shortlist', 'rejection'],
    required: true,
  },
  sentAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Email', emailSchema);
