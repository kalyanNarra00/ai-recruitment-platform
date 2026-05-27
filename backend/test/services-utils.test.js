const { afterEach, describe, it } = require('node:test');
const assert = require('node:assert/strict');

const Email = require('../src/models/Email');
const Interview = require('../src/models/Interview');
const Application = require('../src/models/Application');
const User = require('../src/models/User');
const Job = require('../src/models/Job');
const emailService = require('../src/services/emailService');
const recruitmentAutomationService = require('../src/services/recruitmentAutomationService');
const { createCleanupRegistry, freshRequire } = require('./helpers');

const registry = createCleanupRegistry();

afterEach(() => {
  registry.cleanup();
});

describe('emailService', () => {
  it('returns a test-mode message id', async () => {
    const result = await emailService.sendEmail('candidate@example.com', 'Subject', 'Body');

    assert.deepEqual(result, { messageId: 'test-mode' });
  });
});

describe('resumeAnalysisService', () => {
  it('uses the remote AI service when available', async () => {
    process.env.AI_SERVICE_URL = 'http://ai-service';
    const axios = require('axios');
    registry.stub(axios, 'post', async (url, payload) => {
      assert.equal(url, 'http://ai-service/api/analyze-resume');
      return { data: { matchScore: 90, payload } };
    });

    const service = freshRequire('../src/services/resumeAnalysisService');
    const result = await service.analyzeResume({ resumePath: 'resume.pdf', jobDescription: 'desc' });

    assert.equal(result.matchScore, 90);
  });

  it('falls back to local python when the remote call fails', async () => {
    process.env.AI_SERVICE_URL = 'http://ai-service';
    const axios = require('axios');
    registry.stub(axios, 'post', async () => {
      throw new Error('offline');
    });

    const childProcess = require('child_process');
    registry.stub(childProcess, 'execFile', (executable, args, options, callback) => {
      callback(null, JSON.stringify({ matchScore: 81, extractedSkills: ['Node.js'], resumeText: 'ok' }), '');
      return {
        stdin: {
          write() {},
          end() {},
        },
      };
    });

    const service = freshRequire('../src/services/resumeAnalysisService');
    const result = await service.analyzeResume({ resumePath: 'resume.pdf', jobDescription: 'desc' });

    assert.equal(result.matchScore, 81);
    delete process.env.AI_SERVICE_URL;
  });
});

describe('recruitmentAutomationService', () => {
  it('schedules shortlisted interviews and persists outbound emails', async () => {
    registry.stub(emailService, 'sendEmail', async () => ({ messageId: 'sent' }));
    registry.stub(Email, 'create', async (payload) => payload);
    registry.stub(Interview, 'create', async (payload) => payload);

    const application = {
      _id: 'application-1',
      status: 'applied',
      save: async function save() {
        return this;
      },
    };

    const interview = await recruitmentAutomationService.scheduleInterviewForShortlistedCandidate({
      application,
      job: {
        _id: 'job-1',
        title: 'Platform Engineer',
        interviewerName: 'Pat',
        interviewerEmail: 'pat@example.com',
        meetingDurationMinutes: 45,
        createdBy: 'admin-1',
        interviewLeadHours: 24,
      },
      candidate: {
        _id: 'candidate-1',
        firstName: 'Jamie',
        lastName: 'Lee',
        email: 'jamie@example.com',
      },
    });

    assert.equal(interview.applicationId, 'application-1');
    assert.equal(application.status, 'interview_scheduled');
    assert.equal(application.lastEmailType, 'interview_scheduled');
  });

  it('completes interviews and routes rejected candidates to rejection emails', async () => {
    const interview = {
      _id: 'interview-1',
      applicationId: 'application-1',
      candidate: { firstName: 'Jamie', lastName: 'Lee', email: 'jamie@example.com' },
      job: { title: 'Platform Engineer' },
      save: async function save() {
        return this;
      },
    };
    const query = {
      populate() {
        return this;
      },
      then(resolve, reject) {
        return Promise.resolve(interview).then(resolve, reject);
      },
    };
    const application = {
      _id: 'application-1',
      save: async function save() {
        return this;
      },
    };

    registry.stub(Interview, 'findById', () => query);
    registry.stub(Application, 'findById', async () => application);
    registry.stub(emailService, 'sendEmail', async () => ({ messageId: 'sent' }));
    registry.stub(Email, 'create', async (payload) => payload);

    const result = await recruitmentAutomationService.completeInterview({
      interviewId: 'interview-1',
      decision: 'rejected',
      feedback: 'No fit',
    });

    assert.equal(result.status, 'completed');
    assert.equal(application.status, 'rejected');
    assert.equal(application.lastEmailType, 'rejection');
  });
});

describe('testDataGenerator', () => {
  it('creates the expected fixture entities', async () => {
    const createdUsers = [];
    const createdJobs = [];
    const createdApplications = [];

    registry.stub(User, 'create', async (payload) => {
      const record = { _id: `user-${createdUsers.length + 1}`, ...payload };
      createdUsers.push(record);
      return record;
    });
    registry.stub(Job, 'create', async (payload) => {
      const record = { _id: `job-${createdJobs.length + 1}`, ...payload };
      createdJobs.push(record);
      return record;
    });
    registry.stub(Application, 'create', async (payload) => {
      const record = { _id: `application-${createdApplications.length + 1}`, ...payload };
      createdApplications.push(record);
      return record;
    });

    const { generateTestData } = require('../src/utils/testDataGenerator');
    const result = await generateTestData();

    assert.equal(createdUsers.length, 3);
    assert.equal(createdJobs.length, 2);
    assert.equal(createdApplications.length, 2);
    assert.equal(result.job1.title, 'Full Stack Developer');
  });
});
