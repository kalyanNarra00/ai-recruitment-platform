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

exports.getJobAnalytics = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const [applications, interviewsScheduled, interviewsCompleted] = await Promise.all([
      Application.find({ jobId }),
      Interview.countDocuments({ job: jobId, status: 'scheduled' }),
      Interview.countDocuments({ job: jobId, status: 'completed' }),
    ]);

    const shortlisted = applications.filter((application) => application.screeningDecision === 'shortlisted').length;
    const rejected = applications.filter((application) => application.status === 'rejected').length;
    const selected = applications.filter((application) => ['hr_managerial_round', 'selected'].includes(application.status)).length;
    const matchScores = applications.map((application) => application.matchScore);
    const avgScore = matchScores.length > 0
      ? (matchScores.reduce((total, score) => total + score, 0) / matchScores.length).toFixed(2)
      : '0.00';

    res.json({
      jobId,
      jobTitle: job.title,
      totalApplications: applications.length,
      shortlisted,
      rejected,
      selected,
      interviewsScheduled,
      interviewsCompleted,
      avgMatchScore: avgScore,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getCandidateFunnel = async (req, res) => {
  try {
    const [applied, shortlisted, interviewsScheduled, interviewsCompleted, hrRound, rejected] = await Promise.all([
      Application.countDocuments(),
      Application.countDocuments({ screeningDecision: 'shortlisted' }),
      Application.countDocuments({ status: 'interview_scheduled' }),
      Application.countDocuments({ status: 'interview_completed' }),
      Application.countDocuments({ status: 'hr_managerial_round' }),
      Application.countDocuments({ status: 'rejected' }),
    ]);

    res.json({
      applied,
      shortlisted,
      interviewsScheduled,
      interviewsCompleted,
      hrRound,
      rejected,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
