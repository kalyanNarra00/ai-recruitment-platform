require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const User = require('../src/models/User');
const Job = require('../src/models/Job');
const Application = require('../src/models/Application');
const Interview = require('../src/models/Interview');
const Email = require('../src/models/Email');

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-recruitment';
  console.log(`Connecting to MongoDB at ${uri} ...`);
  await mongoose.connect(uri);
  console.log('Connected.\n');

  // ---------- Clear existing data ----------
  await Promise.all([
    User.deleteMany({}),
    Job.deleteMany({}),
    Application.deleteMany({}),
    Interview.deleteMany({}),
    Email.deleteMany({}),
  ]);
  console.log('Cleared existing data.');

  // ---------- Users ----------
  const admin = await User.create({
    email: 'admin@company.com',
    passwordHash: 'password123',
    firstName: 'Priya',
    lastName: 'Sharma',
    role: 'admin',
    company: 'TechCorp India',
    status: 'active',
  });

  const candidate1 = await User.create({
    email: 'rahul@gmail.com',
    passwordHash: 'password123',
    firstName: 'Rahul',
    lastName: 'Kumar',
    role: 'candidate',
    status: 'active',
  });

  const candidate2 = await User.create({
    email: 'anita@gmail.com',
    passwordHash: 'password123',
    firstName: 'Anita',
    lastName: 'Patel',
    role: 'candidate',
    status: 'active',
  });

  console.log(`Created ${3} users (1 admin, 2 candidates).`);

  // ---------- Jobs ----------
  const job1 = await Job.create({
    title: 'Full Stack Developer',
    description:
      'We are looking for an experienced Full Stack Developer proficient in React, Node.js, and MongoDB. You will build and maintain web applications, collaborate with cross-functional teams, and contribute to architecture decisions.',
    requiredSkills: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'REST APIs', 'Git'],
    experience: 3,
    salary: '12-18 LPA',
    location: 'Bangalore, India',
    hrEmail: admin.email,
    interviewerName: 'Priya Sharma',
    interviewerEmail: admin.email,
    shortlistThreshold: 70,
    interviewLeadHours: 48,
    meetingDurationMinutes: 45,
    interviewLocation: 'Google Meet',
    createdBy: admin._id,
  });

  const job2 = await Job.create({
    title: 'Data Scientist',
    description:
      'Join our data science team to build predictive models, analyze large datasets, and drive data-informed product decisions. Experience with Python, machine learning frameworks, and SQL is required.',
    requiredSkills: ['Python', 'Machine Learning', 'TensorFlow', 'SQL', 'Pandas', 'Statistics'],
    experience: 2,
    salary: '15-22 LPA',
    location: 'Hyderabad, India',
    hrEmail: admin.email,
    interviewerName: 'Priya Sharma',
    interviewerEmail: admin.email,
    shortlistThreshold: 75,
    interviewLeadHours: 72,
    meetingDurationMinutes: 60,
    interviewLocation: 'Zoom',
    createdBy: admin._id,
  });

  const job3 = await Job.create({
    title: 'DevOps Engineer',
    description:
      'Seeking a DevOps Engineer to manage CI/CD pipelines, cloud infrastructure on AWS, and container orchestration with Kubernetes. You will ensure high availability and streamline deployment processes.',
    requiredSkills: ['AWS', 'Docker', 'Kubernetes', 'CI/CD', 'Terraform', 'Linux'],
    experience: 4,
    salary: '18-25 LPA',
    location: 'Pune, India',
    hrEmail: admin.email,
    interviewerName: 'Priya Sharma',
    interviewerEmail: admin.email,
    shortlistThreshold: 80,
    interviewLeadHours: 48,
    meetingDurationMinutes: 45,
    interviewLocation: 'Microsoft Teams',
    createdBy: admin._id,
  });

  console.log(`Created ${3} jobs.`);

  // ---------- Applications ----------
  const app1 = await Application.create({
    jobId: job1._id,
    candidateId: candidate1._id,
    resumeText: 'Rahul Sharma - Full Stack Developer. Skills: JavaScript, React, Node.js, MongoDB, Git, REST APIs, Python, SQL.',
    matchScore: 85,
    extractedSkills: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'Git'],
    screeningDecision: 'shortlisted',
    status: 'interview_scheduled',
    emailSent: true,
    lastEmailType: 'interview_scheduled',
  });

  const app2 = await Application.create({
    jobId: job2._id,
    candidateId: candidate1._id,
    resumeText: 'Rahul Sharma - Full Stack Developer. Skills: JavaScript, React, Node.js, MongoDB, Git, REST APIs, Python, SQL.',
    matchScore: 45,
    extractedSkills: ['Python', 'SQL'],
    screeningDecision: 'rejected',
    status: 'rejected',
    emailSent: true,
    lastEmailType: 'rejection',
  });

  const app3 = await Application.create({
    jobId: job1._id,
    candidateId: candidate2._id,
    resumeText: 'Anita Desai - DevOps Engineer. Skills: JavaScript, React, REST APIs, Git, Docker, Linux, CI/CD, Kubernetes, AWS.',
    matchScore: 78,
    extractedSkills: ['JavaScript', 'React', 'REST APIs', 'Git'],
    screeningDecision: 'shortlisted',
    status: 'interview_scheduled',
    emailSent: true,
    lastEmailType: 'interview_scheduled',
  });

  const app4 = await Application.create({
    jobId: job3._id,
    candidateId: candidate2._id,
    resumeText: 'Anita Desai - DevOps Engineer. Skills: JavaScript, React, REST APIs, Git, Docker, Linux, CI/CD, Kubernetes, AWS.',
    matchScore: 60,
    extractedSkills: ['Docker', 'Linux', 'CI/CD'],
    screeningDecision: 'pending',
    status: 'applied',
    emailSent: true,
    lastEmailType: 'application_received',
  });

  console.log(`Created ${4} applications.`);

  // ---------- Interviews (for the 2 shortlisted applications) ----------
  const now = new Date();

  const interview1 = await Interview.create({
    applicationId: app1._id,
    candidate: candidate1._id,
    job: job1._id,
    interviewerName: 'Priya Sharma',
    interviewerEmail: admin.email,
    interviewLocation: 'Google Meet',
    zoomLink: 'https://meet.google.com/abc-defg-hij',
    meetingDurationMinutes: 45,
    scheduledBy: admin._id,
    scheduledTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    status: 'scheduled',
    decision: 'pending',
  });

  const interview2 = await Interview.create({
    applicationId: app3._id,
    candidate: candidate2._id,
    job: job1._id,
    interviewerName: 'Priya Sharma',
    interviewerEmail: admin.email,
    interviewLocation: 'Google Meet',
    zoomLink: 'https://meet.google.com/klm-nopq-rst',
    meetingDurationMinutes: 45,
    scheduledBy: admin._id,
    scheduledTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    status: 'scheduled',
    decision: 'pending',
  });

  console.log(`Created ${2} interviews.`);

  // ---------- Email records ----------
  await Email.create({
    applicationId: app1._id,
    recipientEmail: candidate1.email,
    subject: 'Interview Scheduled - Full Stack Developer at TechCorp India',
    body: 'Dear Rahul, Your interview for the Full Stack Developer position has been scheduled. Please check the details in your dashboard.',
    type: 'interview_scheduled',
  });

  await Email.create({
    applicationId: app2._id,
    recipientEmail: candidate1.email,
    subject: 'Application Update - Data Scientist at TechCorp India',
    body: 'Dear Rahul, Thank you for your interest in the Data Scientist position. After careful review, we have decided to move forward with other candidates.',
    type: 'rejection',
  });

  await Email.create({
    applicationId: app3._id,
    recipientEmail: candidate2.email,
    subject: 'Interview Scheduled - Full Stack Developer at TechCorp India',
    body: 'Dear Anita, Your interview for the Full Stack Developer position has been scheduled. Please check the details in your dashboard.',
    type: 'interview_scheduled',
  });

  await Email.create({
    applicationId: app4._id,
    recipientEmail: candidate2.email,
    subject: 'Application Received - DevOps Engineer at TechCorp India',
    body: 'Dear Anita, We have received your application for the DevOps Engineer position. We will review your resume and get back to you shortly.',
    type: 'application_received',
  });

  console.log(`Created ${4} email records.`);

  // ---------- Summary ----------
  console.log('\n========== Seed Summary ==========');
  console.log(`Users:        ${await User.countDocuments()}`);
  console.log(`Jobs:         ${await Job.countDocuments()}`);
  console.log(`Applications: ${await Application.countDocuments()}`);
  console.log(`Interviews:   ${await Interview.countDocuments()}`);
  console.log(`Emails:       ${await Email.countDocuments()}`);
  console.log('==================================');
  console.log('\nDemo credentials:');
  console.log('  Admin:      admin@company.com / password123');
  console.log('  Candidate:  rahul@gmail.com   / password123');
  console.log('  Candidate:  anita@gmail.com   / password123');
  console.log('\nDone!');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
