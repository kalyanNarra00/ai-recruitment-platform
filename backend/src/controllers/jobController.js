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

