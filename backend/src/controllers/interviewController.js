const { completeInterview } = require('../services/recruitmentAutomationService');

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
