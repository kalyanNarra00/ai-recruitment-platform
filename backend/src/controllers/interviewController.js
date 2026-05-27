const Interview = require('../models/Interview');
const { completeInterview } = require('../services/recruitmentAutomationService');

exports.getInterviews = async (req, res) => {
  try {
    const filter = req.user.role === 'candidate' ? { candidate: req.user.id } : {};

    const interviews = await Interview.find(filter)
      .sort({ scheduledTime: 1 })
      .populate('candidate', 'firstName lastName email')
      .populate('job', 'title')
      .populate('applicationId', 'status screeningDecision matchScore');

    res.json(interviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateInterviewOutcome = async (req, res) => {
  try {
    const { decision, feedback } = req.body;

    if (!['hr_managerial_round', 'rejected'].includes(decision)) {
      return res.status(400).json({ error: 'Invalid interview decision' });
    }

    const interview = await completeInterview({
      interviewId: req.params.id,
      decision,
      feedback,
    });

    res.json(interview);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};
