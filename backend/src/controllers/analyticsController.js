const Application = require('../models/Application');
const Job = require('../models/Job');
const Interview = require('../models/Interview');

exports.getDashboardStats = async (req, res) => {
  try {
    const [
      totalApplications,
      shortlistedCount,
      rejectedCount,
      totalJobs,
      interviewsScheduled,
      interviewsCompleted,
      selectedCount,
      avgMatchScore,
    ] = await Promise.all([
      Application.countDocuments(),
      Application.countDocuments({ screeningDecision: 'shortlisted' }),
      Application.countDocuments({ status: 'rejected' }),
      Job.countDocuments({ status: 'open' }),
      Interview.countDocuments({ status: 'scheduled' }),
      Interview.countDocuments({ status: 'completed' }),
      Application.countDocuments({ status: { $in: ['hr_managerial_round', 'selected'] } }),
      Application.aggregate([
        { $group: { _id: null, avgScore: { $avg: '$matchScore' } } },
      ]),
    ]);

    res.json({
      totalApplications,
      shortlistedCount,
      rejectedCount,
      totalJobs,
      interviewsScheduled,
      interviewsCompleted,
      selectedCount,
      avgMatchScore: avgMatchScore[0]?.avgScore || 0,
      shortlistRate: totalApplications > 0 ? ((shortlistedCount / totalApplications) * 100).toFixed(2) : '0.00',
      rejectionRate: totalApplications > 0 ? ((rejectedCount / totalApplications) * 100).toFixed(2) : '0.00',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getCandidateFunnel = async (req, res) => {
  try {
    const statusOrder = ['interview_scheduled', 'interview_completed', 'hr_managerial_round', 'selected'];

    const [applied, shortlisted, interviewsScheduled, interviewsCompleted, hrRound, selected, rejected] = await Promise.all([
      Application.countDocuments(),
      Application.countDocuments({ screeningDecision: 'shortlisted' }),
      Application.countDocuments({ status: { $in: statusOrder } }),
      Application.countDocuments({ status: { $in: statusOrder.slice(1) } }),
      Application.countDocuments({ status: { $in: statusOrder.slice(2) } }),
      Application.countDocuments({ status: 'selected' }),
      Application.countDocuments({ status: 'rejected' }),
    ]);

    res.json({
      applied,
      shortlisted,
      interviewsScheduled,
      interviewsCompleted,
      hrRound,
      selected,
      rejected,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
