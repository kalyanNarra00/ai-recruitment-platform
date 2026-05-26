const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');

exports.getDashboardStats = async (req, res) => {
  try {
    const totalApplications = await Application.countDocuments();
    const shortlistedCount = await Application.countDocuments({ status: 'shortlisted' });
    const rejectedCount = await Application.countDocuments({ status: 'rejected' });
    const totalJobs = await Job.countDocuments({ status: 'open' });

    const avgMatchScore = await Application.aggregate([
      { $group: { _id: null, avgScore: { $avg: '$matchScore' } } },
    ]);

    res.json({
      totalApplications,
      shortlistedCount,
      rejectedCount,
      totalJobs,
      avgMatchScore: avgMatchScore[0]?.avgScore || 0,
      shortlistRate: totalApplications > 0 ? ((shortlistedCount / totalApplications) * 100).toFixed(2) : 0,
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

    const applications = await Application.find({ jobId });
    const shortlisted = applications.filter(a => a.status === 'shortlisted').length;
    const rejected = applications.filter(a => a.status === 'rejected').length;

    const matchScores = applications.map(a => a.matchScore);
    const avgScore = matchScores.length > 0 ? (matchScores.reduce((a, b) => a + b) / matchScores.length).toFixed(2) : 0;

    res.json({
      jobId,
      jobTitle: job.title,
      totalApplications: applications.length,
      shortlisted,
      rejected,
      avgMatchScore: avgScore,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getCandidateFunnel = async (req, res) => {
  try {
    const applicationsByStatus = await Application.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const funnel = {
      received: 0,
      shortlisted: 0,
      rejected: 0,
    };

    applicationsByStatus.forEach(item => {
      funnel[item._id] = item.count;
    });

    res.json(funnel);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
