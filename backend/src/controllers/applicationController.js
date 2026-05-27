const fs = require('fs');
const Application = require('../models/Application');
const Interview = require('../models/Interview');
const User = require('../models/User');
const Job = require('../models/Job');
const { analyzeResume } = require('../services/resumeAnalysisService');
const {
  sendApplicationAcknowledgement,
  notifyHrOnApplication,
  scheduleInterviewForShortlistedCandidate,
  sendRejectionEmail,
  sendHrRoundRejectionEmail,
  sendSelectionEmail,
} = require('../services/recruitmentAutomationService');

const attachInterviews = async (applications) => {
  const applicationIds = applications.map((application) => application._id);
  const interviews = await Interview.find({ applicationId: { $in: applicationIds } });
  const interviewMap = new Map(
    interviews.map((interview) => [interview.applicationId.toString(), interview.toObject()])
  );

  return applications.map((application) => {
    const applicationObject = application.toObject();
    applicationObject.interview = interviewMap.get(application._id.toString()) || null;
    return applicationObject;
  });
};

exports.submitApplication = async (req, res) => {
  try {
    if (req.user.role !== 'candidate') {
      return res.status(403).json({ error: 'Only candidates can submit applications' });
    }

    const { jobId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Resume file required' });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const existingApplication = await Application.findOne({
      jobId,
      candidateId: req.user.id,
    });

    if (existingApplication) {
      return res.status(400).json({ error: 'You have already applied for this job' });
    }

    const candidate = await User.findById(req.user.id);
    const resumePath = file.path;

    const aiResponse = await analyzeResume({
      resumePath,
      jobDescription: job.description,
      requiredSkills: job.requiredSkills,
    });

    const { matchScore, extractedSkills, resumeText } = aiResponse;
    const shortlistThreshold = job.shortlistThreshold ?? 75;
    const isShortlisted = matchScore >= shortlistThreshold;

    const application = await Application.create({
      jobId,
      candidateId: req.user.id,
      resumeText,
      matchScore,
      extractedSkills,
      screeningDecision: isShortlisted ? 'shortlisted' : 'rejected',
      status: isShortlisted ? 'applied' : 'rejected',
    });

    fs.unlink(resumePath, (err) => {
      if (err) console.warn('Failed to delete resume file:', err.message);
    });

    try {
      await sendApplicationAcknowledgement({ application, job, candidate });
    } catch (emailErr) {
      console.warn('Acknowledgement email failed (non-blocking):', emailErr.message);
    }

    try {
      await notifyHrOnApplication({
        application,
        job,
        candidate,
        matchScore,
        extractedSkills,
      });
    } catch (emailErr) {
      console.warn('HR notification email failed (non-blocking):', emailErr.message);
    }

    let interview = null;
    if (isShortlisted) {
      interview = await scheduleInterviewForShortlistedCandidate({
        application,
        job,
        candidate,
      });
    } else {
      await sendRejectionEmail({
        application,
        job,
        candidate,
      });
    }

    const savedApplication = await Application.findById(application._id)
      .populate('jobId', 'title')
      .populate('candidateId', 'firstName lastName email');

    res.status(201).json({
      application: {
        ...savedApplication.toObject(),
        interview: interview ? interview.toObject() : null,
      },
      matchScore,
      shortlistThreshold,
      decision: isShortlisted ? 'shortlisted' : 'rejected',
    });
  } catch (error) {
    console.error('Application submission error:', error.message);
    res.status(500).json({ error: error.message || 'Resume analysis failed' });
  }
};

exports.getApplications = async (req, res) => {
  try {
    const filter = req.user.role === 'candidate' ? { candidateId: req.user.id } : {};

    const applications = await Application.find(filter)
      .sort({ createdAt: -1 })
      .populate('jobId', 'title location interviewerName interviewerEmail hrEmail')
      .populate('candidateId', 'firstName lastName email');

    const applicationsWithInterviews = await attachInterviews(applications);

    res.json(applicationsWithInterviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = [
      'applied',
      'interview_scheduled',
      'interview_completed',
      'hr_managerial_round',
      'selected',
      'rejected',
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const application = await Application.findById(req.params.id)
      .populate('jobId')
      .populate('candidateId', 'firstName lastName email');

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (status === 'selected') {
      await sendSelectionEmail({
        application,
        job: application.jobId,
        candidate: application.candidateId,
      });
    } else if (status === 'rejected' && application.status === 'hr_managerial_round') {
      await sendHrRoundRejectionEmail({
        application,
        job: application.jobId,
        candidate: application.candidateId,
      });
    } else {
      application.status = status;
      await application.save();
    }

    const [applicationWithInterview] = await attachInterviews([application]);

    res.json(applicationWithInterview);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
