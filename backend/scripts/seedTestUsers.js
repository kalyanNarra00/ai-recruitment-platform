require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const dns = require('node:dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');
const User = require('../src/models/User');
const Job = require('../src/models/Job');
const Application = require('../src/models/Application');
const Interview = require('../src/models/Interview');
const Email = require('../src/models/Email');

async function seed() {
  const uri = process.env.MONGODB_URI;
  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('Connected.\n');

  await Promise.all([
    User.deleteMany({}),
    Job.deleteMany({}),
    Application.deleteMany({}),
    Interview.deleteMany({}),
    Email.deleteMany({}),
  ]);
  console.log('Cleared existing data.');

  const admin = await User.create({
    email: 'nkalyan77888@gmail.com',
    passwordHash: 'admin123',
    firstName: 'Kalyan',
    lastName: 'Admin',
    role: 'admin',
    company: 'AI Recruitment Corp',
    status: 'active',
  });
  console.log('Created admin:', admin.email);

  const candidate = await User.create({
    email: 'kalyanreddynarra@gmail.com',
    passwordHash: 'candidate123',
    firstName: 'Kalyan',
    lastName: 'Reddy',
    role: 'candidate',
    status: 'active',
  });
  console.log('Created candidate:', candidate.email);

  const job = await Job.create({
    title: 'Full Stack Developer',
    description:
      'We are looking for an experienced Full Stack Developer proficient in React, Node.js, and MongoDB. You will build and maintain web applications, collaborate with cross-functional teams, and contribute to architecture decisions.',
    requiredSkills: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'REST APIs', 'Git'],
    experience: 3,
    salary: '12-18 LPA',
    location: 'Hyderabad, India',
    hrEmail: admin.email,
    interviewerName: 'Kalyan Admin',
    interviewerEmail: admin.email,
    shortlistThreshold: 50,
    interviewLeadHours: 48,
    meetingDurationMinutes: 45,
    interviewLocation: 'Remote - Zoom',
    createdBy: admin._id,
  });
  console.log('Created job:', job.title);

  console.log('\n========== Seed Complete ==========');
  console.log('Admin:     nkalyan77888@gmail.com / admin123');
  console.log('Candidate: kalyanreddynarra@gmail.com / candidate123');
  console.log('Job:       Full Stack Developer (threshold: 50%)');
  console.log('===================================\n');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
