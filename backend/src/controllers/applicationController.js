const fs = require('fs');
const axios = require('axios');
const Application = require('../models/Application');
const Email = require('../models/Email');
const User = require('../models/User');
const Job = require('../models/Job');
const { sendEmail } = require('../services/emailService');

exports.submitApplication = async (req, res) => {
  try {
    const { jobId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Resume file required' });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const candidate = await User.findById(req.user.id);
    const resumePath = file.path;

    try {
      const aiResponse = await axios.post(`${process.env.AI_SERVICE_URL}/api/analyze-resume`, {
        resumePath,
        jobDescription: job.description,
        requiredSkills: job.requiredSkills,
      });

      const { matchScore, extractedSkills } = aiResponse.data;

      const application = new Application({
        jobId,
        candidateId: req.user.id,
        resumeUrl: resumePath,
        matchScore,
        extractedSkills,
        status: matchScore > 75 ? 'shortlisted' : 'rejected',
      });

      await application.save();

      await triggerAutomaticEmail(application, job, candidate, matchScore);

      res.status(201).json({
        application: application.toObject(),
        matchScore,
        decision: matchScore > 75 ? 'shortlisted' : 'rejected',
      });
    } catch (aiError) {
      console.error('AI Service error:', aiError.message);
      res.status(500).json({ error: 'Resume analysis failed' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const triggerAutomaticEmail = async (application, job, candidate, matchScore) => {
  try {
    const emailTemplate = matchScore > 75 ? 'shortlist' : 'rejection';
    const subject = matchScore > 75
      ? `Congratulations! You're shortlisted for ${job.title}`
      : `Application Status: ${job.title}`;

    const body = matchScore > 75
      ? `
Dear ${candidate.firstName},

Thank you for applying for the ${job.title} position.

After reviewing your resume against the job requirements, we are pleased to inform you that you have been shortlisted for the next round of the recruitment process.

Our recruitment team will contact you shortly with further details.

Best regards,
HR Team
      `
      : `
Dear ${candidate.firstName},

Thank you for applying for the ${job.title} position.

After reviewing your profile, we regret to inform you that your application was not shortlisted for the next stage at this time.

We appreciate your interest in our company and encourage you to apply for future opportunities that match your skills and experience.

Best regards,
HR Team
      `;

    await sendEmail(candidate.email, subject, body);

    const emailRecord = new Email({
      applicationId: application._id,
      recipientEmail: candidate.email,
      subject,
      body,
      type: emailTemplate,
    });

    await emailRecord.save();

    application.emailSent = true;
    await application.save();
  } catch (error) {
    console.error('Email sending error:', error.message);
  }
};

exports.getApplications = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'candidate') {
      filter.candidateId = req.user.id;
    } else if (req.user.role === 'recruiter') {
      // Recruiters see all applications
    }

    const applications = await Application.find(filter)
      .populate('jobId', 'title')
      .populate('candidateId', 'firstName lastName email');

    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getApplicationById = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('jobId')
      .populate('candidateId', 'firstName lastName email');

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (req.user.role === 'candidate' && application.candidateId._id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json(application);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['received', 'shortlisted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json(application);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
