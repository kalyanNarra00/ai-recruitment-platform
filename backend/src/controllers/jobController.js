const Job = require('../models/Job');

exports.createJob = async (req, res) => {
  try {
    const {
      title,
      description,
      requiredSkills,
      experience,
      salary,
      location,
      hrEmail,
      interviewerName,
      interviewerEmail,
      shortlistThreshold,
      interviewLeadHours,
      meetingDurationMinutes,
      interviewLocation,
  } = req.body;

    const job = new Job({
      title,
      description,
      requiredSkills,
      experience,
      salary,
      location,
      hrEmail,
      interviewLocation,
      interviewerName,
      interviewerEmail,
      shortlistThreshold,
      interviewLeadHours,
      meetingDurationMinutes,
      createdBy: req.user.id,
    });

    await job.save();
    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getJobs = async (req, res) => {
  try {
    const jobs = await Job.find().populate('createdBy', 'firstName lastName');
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('createdBy', 'firstName lastName');
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    Object.assign(job, req.body);
    await job.save();
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await Job.findByIdAndDelete(req.params.id);
    res.json({ message: 'Job deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
