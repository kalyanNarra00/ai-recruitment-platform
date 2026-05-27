const Email = require('../models/Email');
const Interview = require('../models/Interview');
const Application = require('../models/Application');
const { sendEmail } = require('./emailService');

const getZoomBaseUrl = () => process.env.ZOOM_MEETING_BASE_URL || 'https://zoom.us/j/';

const buildZoomLink = (applicationId) => {
  const sanitized = applicationId.toString().replace(/[^0-9]/g, '').slice(-10) || Date.now().toString();
  return `${getZoomBaseUrl()}${sanitized}`;
};

const scheduleInterviewTime = (leadHours) => {
  const scheduledTime = new Date(Date.now() + (leadHours || 48) * 60 * 60 * 1000);
  scheduledTime.setMinutes(0, 0, 0);
  return scheduledTime;
};

const isRemoteInterview = (location) => /remote/i.test(location);

const persistEmailRecord = async (applicationId, recipientEmail, subject, body, type) => {
  await sendEmail(recipientEmail, subject, body);

  await Email.create({
    applicationId,
    recipientEmail,
    subject,
    body,
    type,
  });
};

const sendApplicationAcknowledgement = async ({ application, job, candidate }) => {
  const subject = `Thank you for applying - ${job.title}`;
  const body = `
Dear ${candidate.firstName},

Thank you for applying for the position of ${job.title}.

We have successfully received your application and resume. Our team will review your profile and get back to you shortly.

We appreciate your interest in joining our team and wish you all the best!

Best Regards,
HR Team
  `.trim();

  await persistEmailRecord(application._id, candidate.email, subject, body, 'application_acknowledgement');
};

const notifyHrOnApplication = async ({ application, job, candidate, matchScore, extractedSkills }) => {
  const subject = `New application received for ${job.title}`;
  const body = `
Candidate: ${candidate.firstName} ${candidate.lastName}
Candidate Email: ${candidate.email}
Job: ${job.title}
Match Score: ${matchScore}%
Extracted Skills: ${extractedSkills.join(', ') || 'No skills extracted'}
Resume: [extracted text stored in database]

The candidate has successfully applied and is now in the automated screening pipeline.
  `.trim();

  await persistEmailRecord(application._id, job.hrEmail, subject, body, 'application_received');
};

const scheduleInterviewForShortlistedCandidate = async ({ application, job, candidate }) => {
  const scheduledTime = scheduleInterviewTime(job.interviewLeadHours);
  const interviewLocation = job.interviewLocation || job.location || 'Company Office';
  const meetingType = isRemoteInterview(interviewLocation) ? 'Remote' : 'In-person';
  const zoomLink = meetingType === 'Remote' ? buildZoomLink(application._id) : 'N/A';

  const interview = await Interview.create({
    applicationId: application._id,
    candidate: candidate._id,
    job: job._id,
    interviewerName: job.interviewerName,
    interviewerEmail: job.interviewerEmail,
    interviewLocation,
    zoomLink,
    meetingDurationMinutes: job.meetingDurationMinutes,
    scheduledBy: job.createdBy,
    scheduledTime,
  });

  const interviewerSubject = `Interview scheduled for ${candidate.firstName} ${candidate.lastName}`;
  const interviewerBody = `
Candidate ${candidate.firstName} ${candidate.lastName} has been shortlisted for ${job.title}.

Interview Type: ${meetingType}
Interview Location: ${interviewLocation}
Interview Time: ${scheduledTime.toISOString()}
Interview Duration: ${job.meetingDurationMinutes} minutes
Candidate Email: ${candidate.email}
${meetingType === 'Remote' ? `Zoom Link: ${zoomLink}` : ''}
  `.trim();

  const candidateSubject = `Congratulations! You have been shortlisted - ${job.title}`;
  const candidateBody = `
Dear ${candidate.firstName},

Congratulations! We are pleased to inform you that your resume has been shortlisted for the position of ${job.title}. You have been selected to proceed to the next round — the Interview Round.

Here are your interview details:

Interviewer: ${job.interviewerName}
Interview Type: ${meetingType}
Interview Location: ${interviewLocation}
Interview Date & Time: ${scheduledTime.toLocaleString()}
Interview Duration: ${job.meetingDurationMinutes} minutes
${meetingType === 'Remote' ? `Zoom Link: ${zoomLink}\n` : ''}
Please arrive at the interview location a few minutes early and carry a copy of your updated resume.

We wish you all the best!

Best Regards,
HR Team
  `.trim();

  await persistEmailRecord(application._id, job.interviewerEmail, interviewerSubject, interviewerBody, 'interview_scheduled');
  await persistEmailRecord(application._id, candidate.email, candidateSubject, candidateBody, 'interview_scheduled');

  application.status = 'interview_scheduled';
  application.emailSent = true;
  application.lastEmailType = 'interview_scheduled';
  await application.save();

  return interview;
};

const sendRejectionEmail = async ({ application, job, candidate, reason }) => {
  const subject = `Application update for ${job.title}`;
  const body = `
Dear ${candidate.firstName},

Thank you for applying for ${job.title}.

${reason || 'After reviewing your profile, we will not be moving forward with your application at this stage.'}

We appreciate your interest and encourage you to apply again in the future.
  `.trim();

  await persistEmailRecord(application._id, candidate.email, subject, body, 'rejection');

  application.emailSent = true;
  application.lastEmailType = 'rejection';
  application.status = 'rejected';
  await application.save();
};

const sendHrRoundEmail = async ({ application, job, candidate, feedback }) => {
  const officeLocation = job.location || 'our office';
  const subject = `Congratulations! You are selected for the HR Round - ${job.title}`;
  const body = `
Dear ${candidate.firstName},

We are pleased to inform you that you have been SELECTED for the next round (HR & Managerial Round) for the position of ${job.title}.

${feedback ? `Interviewer Feedback: ${feedback}\n` : ''}You are required to attend the office IN PERSON for the process completion.

Office Location: ${officeLocation}

Please carry the following documents:
- Original ID proof
- Updated resume
- Educational certificates

Our HR team will reach out to you shortly with the exact date and time. Please ensure your availability.

We look forward to meeting you!
  `.trim();

  await persistEmailRecord(application._id, candidate.email, subject, body, 'hr_round');

  application.emailSent = true;
  application.lastEmailType = 'hr_round';
  application.status = 'hr_managerial_round';
  await application.save();
};

const sendHrRoundRejectionEmail = async ({ application, job, candidate }) => {
  const subject = `Application update - ${job.title}`;
  const body = `
Dear ${candidate.firstName},

Thank you for your time and effort throughout the interview process for the position of ${job.title}.

After careful consideration during the HR & Managerial round, we regret to inform you that we will not be moving forward with your application at this time.

We truly appreciate your interest in our organization and encourage you to apply for future opportunities that match your skills and experience.

We wish you all the best in your career!

Best Regards,
HR Team
  `.trim();

  await persistEmailRecord(application._id, candidate.email, subject, body, 'rejection');

  application.emailSent = true;
  application.lastEmailType = 'rejection';
  application.status = 'rejected';
  await application.save();
};

const sendSelectionEmail = async ({ application, job, candidate }) => {
  const officeLocation = job.location || 'our office';
  const subject = `Congratulations! You have been selected - ${job.title}`;
  const body = `
Dear ${candidate.firstName},

We are delighted to inform you that you have been SELECTED for the position of ${job.title}.

Please visit our office IN PERSON to complete the joining formalities and documentation process.

Office Location: ${officeLocation}

Please carry the following documents:
- Original ID proof and address proof
- Updated resume
- Educational certificates and mark sheets
- Previous employment relieving letters (if applicable)
- Passport-size photographs

Our HR team will contact you shortly with the joining date and further details.

Congratulations once again, and welcome to the team!
  `.trim();

  await persistEmailRecord(application._id, candidate.email, subject, body, 'selection');

  application.emailSent = true;
  application.lastEmailType = 'selection';
  application.status = 'selected';
  await application.save();
};

const completeInterview = async ({ interviewId, decision, feedback }) => {
  const interview = await Interview.findById(interviewId)
    .populate('candidate', 'firstName lastName email')
    .populate('job');

  if (!interview) {
    const error = new Error('Interview not found');
    error.statusCode = 404;
    throw error;
  }

  const application = await Application.findById(interview.applicationId);
  if (!application) {
    const error = new Error('Application not found');
    error.statusCode = 404;
    throw error;
  }

  interview.status = 'completed';
  interview.decision = decision;
  interview.feedback = feedback || '';
  interview.completedAt = new Date();
  await interview.save();

  application.status = 'interview_completed';
  await application.save();

  if (decision === 'hr_managerial_round') {
    await sendHrRoundEmail({
      application,
      job: interview.job,
      candidate: interview.candidate,
      feedback,
    });
  } else {
    await sendRejectionEmail({
      application,
      job: interview.job,
      candidate: interview.candidate,
      reason: feedback || 'After the interview round, we will not be moving forward with your application.',
    });
  }

  return interview;
};

module.exports = {
  sendApplicationAcknowledgement,
  notifyHrOnApplication,
  scheduleInterviewForShortlistedCandidate,
  sendRejectionEmail,
  sendHrRoundRejectionEmail,
  sendSelectionEmail,
  completeInterview,
};
