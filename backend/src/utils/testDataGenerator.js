const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');

const generateTestData = async () => {
  try {
    console.log('Generating test data...');

    // Create HR Manager
    const hrManager = await User.create({
      email: 'hr@company.com',
      passwordHash: 'password123',
      firstName: 'Alice',
      lastName: 'Manager',
      role: 'hr_manager',
      company: 'Tech Corp',
      status: 'active',
    });

    console.log('✓ HR Manager created:', hrManager.email);

    // Create Sample Jobs
    const job1 = await Job.create({
      title: 'Full Stack Developer',
      description: 'Looking for an experienced full stack developer with expertise in React, Node.js, and MongoDB. Must have 2+ years of experience building scalable web applications.',
      requiredSkills: ['React', 'Node.js', 'MongoDB', 'JavaScript', 'REST APIs'],
      experience: 2,
      salary: '100K-120K',
      location: 'Remote',
      createdBy: hrManager._id,
      status: 'open',
    });

    const job2 = await Job.create({
      title: 'Backend Engineer',
      description: 'Seeking a backend engineer experienced with Node.js, PostgreSQL, and AWS. Strong understanding of microservices and cloud deployment required.',
      requiredSkills: ['Node.js', 'PostgreSQL', 'AWS', 'Docker', 'Kubernetes'],
      experience: 3,
      salary: '120K-150K',
      location: 'San Francisco, CA',
      createdBy: hrManager._id,
      status: 'open',
    });

    console.log('✓ Jobs created:');
    console.log('  -', job1.title);
    console.log('  -', job2.title);

    // Create Candidates
    const candidate1 = await User.create({
      email: 'john@example.com',
      passwordHash: 'password123',
      firstName: 'John',
      lastName: 'Developer',
      role: 'candidate',
      company: null,
      status: 'active',
    });

    const candidate2 = await User.create({
      email: 'jane@example.com',
      passwordHash: 'password123',
      firstName: 'Jane',
      lastName: 'Engineer',
      role: 'candidate',
      company: null,
      status: 'active',
    });

    console.log('✓ Candidates created:');
    console.log('  -', candidate1.email);
    console.log('  -', candidate2.email);

    // Create Sample Applications
    const app1 = await Application.create({
      jobId: job1._id,
      candidateId: candidate1._id,
      resumeUrl: '/uploads/john-resume.pdf',
      matchScore: 85,
      extractedSkills: ['React', 'Node.js', 'MongoDB', 'JavaScript', 'Express.js', 'Docker', 'AWS'],
      status: 'shortlisted',
      emailSent: true,
    });

    const app2 = await Application.create({
      jobId: job2._id,
      candidateId: candidate2._id,
      resumeUrl: '/uploads/jane-resume.pdf',
      matchScore: 72,
      extractedSkills: ['Node.js', 'PostgreSQL', 'Python', 'AWS'],
      status: 'received',
      emailSent: false,
    });

    console.log('✓ Applications created:');
    console.log('  - John\'s application: Score 85% (Shortlisted)');
    console.log('  - Jane\'s application: Score 72% (Pending)');

    console.log('\n✅ Test data generation completed!');
    console.log('\nTest Credentials:');
    console.log('HR Manager:  hr@company.com / password123');
    console.log('Candidate 1: john@example.com / password123');
    console.log('Candidate 2: jane@example.com / password123');

    return { hrManager, job1, job2, candidate1, candidate2, app1, app2 };
  } catch (error) {
    console.error('Error generating test data:', error.message);
    throw error;
  }
};

module.exports = { generateTestData };
