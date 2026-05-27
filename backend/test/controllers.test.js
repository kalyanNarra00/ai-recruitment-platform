const { afterEach, describe, it } = require('node:test');
const assert = require('node:assert/strict');

const User = require('../src/models/User');
const Job = require('../src/models/Job');
const Application = require('../src/models/Application');
const Interview = require('../src/models/Interview');
const authController = require('../src/controllers/authController');
const jobController = require('../src/controllers/jobController');
const applicationController = require('../src/controllers/applicationController');
const analyticsController = require('../src/controllers/analyticsController');
const interviewController = require('../src/controllers/interviewController');
const recruitmentAutomationService = require('../src/services/recruitmentAutomationService');
const { createReq, createRes, resolvedQuery, createCleanupRegistry, freshRequire } = require('./helpers');

const registry = createCleanupRegistry();

afterEach(() => {
  registry.cleanup();
});

describe('authController', () => {
  it('signs up users and normalizes non-candidate roles to admin', async () => {
    process.env.JWT_SECRET = 'test-secret';
    registry.stub(User, 'findOne', async () => null);
    registry.stub(User.prototype, 'save', async function save() {
      this._id = 'user-1';
      return this;
    });

    const req = createReq({
      body: {
        email: 'admin@example.com',
        password: 'secret',
        firstName: 'Alex',
        lastName: 'Admin',
        role: 'hr_manager',
        company: 'Acme',
      },
    });
    const res = createRes();

    await authController.signup(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.user.role, 'admin');
    assert.ok(res.body.token);
  });

  it('rejects invalid logins', async () => {
    registry.stub(User, 'findOne', async () => null);
    const res = createRes();

    await authController.login(createReq({ body: { email: 'user@example.com', password: 'nope' } }), res);

    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, { error: 'Invalid credentials' });
  });
});

describe('jobController', () => {
  it('creates jobs with the authenticated creator id', async () => {
    registry.stub(Job.prototype, 'save', async function save() {
      this._id = 'job-1';
      return this;
    });

    const req = createReq({
      body: {
        title: 'Platform Engineer',
        description: 'Own the platform',
        requiredSkills: ['Node.js'],
        hrEmail: 'hr@example.com',
        interviewerEmail: 'panel@example.com',
      },
      user: { id: 'admin-1' },
    });
    const res = createRes();

    await jobController.createJob(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.title, 'Platform Engineer');
    assert.equal(res.body.hrEmail, 'hr@example.com');
  });

  it('returns all jobs', async () => {
    registry.stub(Job, 'find', () => resolvedQuery([{ title: 'Engineer' }]));
    const res = createRes();

    await jobController.getJobs(createReq(), res);

    assert.deepEqual(res.body, [{ title: 'Engineer' }]);
  });

  it('blocks updates from unrelated admins', async () => {
    registry.stub(Job, 'findById', async () => ({
      createdBy: { toString: () => 'owner-1' },
      save: async () => {},
    }));
    const res = createRes();

    await jobController.updateJob(
      createReq({ params: { id: 'job-1' }, user: { id: 'other-user', role: 'candidate' }, body: {} }),
      res
    );

    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, { error: 'Unauthorized' });
  });
});

describe('applicationController', () => {
  it('blocks non-candidates from applying', async () => {
    const res = createRes();

    await applicationController.submitApplication(
      createReq({ user: { role: 'admin' }, body: { jobId: 'job-1' } }),
      res
    );

    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, { error: 'Only candidates can submit applications' });
  });

  it('submits shortlisted applications and includes interview data', async () => {
    const applicationRecord = {
      _id: 'application-1',
      resumeUrl: './uploads/resume.pdf',
      save: async function save() {
        return this;
      },
    };

    registry.stub(Job, 'findById', async () => ({
      _id: 'job-1',
      title: 'Platform Engineer',
      description: 'Build systems',
      requiredSkills: ['React', 'Node.js'],
      shortlistThreshold: 75,
      createdBy: 'admin-1',
      hrEmail: 'hr@example.com',
      interviewerName: 'Pat',
      interviewerEmail: 'pat@example.com',
      meetingDurationMinutes: 45,
      interviewLeadHours: 48,
    }));
    registry.stub(Application, 'findOne', async () => null);
    registry.stub(User, 'findById', async () => ({
      _id: 'candidate-1',
      firstName: 'Jamie',
      lastName: 'Lee',
      email: 'jamie@example.com',
    }));
    process.env.AI_SERVICE_URL = 'http://ai-service';
    const axios = require('axios');
    registry.stub(axios, 'post', async () => ({
      data: {
        matchScore: 88,
        extractedSkills: ['React', 'Node.js'],
      },
    }));
    registry.stub(Application, 'create', async (payload) => Object.assign(applicationRecord, payload));
    registry.stub(recruitmentAutomationService, 'notifyHrOnApplication', async () => {});
    registry.stub(recruitmentAutomationService, 'scheduleInterviewForShortlistedCandidate', async () => ({
      toObject: () => ({ _id: 'interview-1', status: 'scheduled' }),
    }));
    registry.stub(Application, 'findById', () => resolvedQuery({
      toObject: () => ({ _id: 'application-1', status: 'applied' }),
    }));
    const applicationControllerFresh = freshRequire('../src/controllers/applicationController');

    const req = createReq({
      user: { id: 'candidate-1', role: 'candidate' },
      body: { jobId: 'job-1' },
      file: { path: './uploads/resume.pdf' },
    });
    const res = createRes();

    await applicationControllerFresh.submitApplication(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.decision, 'shortlisted');
    assert.equal(res.body.matchScore, 88);
    assert.deepEqual(res.body.application.interview, { _id: 'interview-1', status: 'scheduled' });
    delete process.env.AI_SERVICE_URL;
  });

  it('rejects invalid application status updates', async () => {
    const res = createRes();

    await applicationController.updateApplicationStatus(
      createReq({ body: { status: 'pending_review' }, params: { id: 'application-1' } }),
      res
    );

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { error: 'Invalid status' });
  });
});

describe('analyticsController', () => {
  it('aggregates dashboard stats', async () => {
    registry.stub(Application, 'countDocuments', async (filter = {}) => {
      if (filter.screeningDecision === 'shortlisted') return 7;
      if (filter.status === 'rejected') return 3;
      if (filter.status && filter.status.$in) return 2;
      return 10;
    });
    registry.stub(Job, 'countDocuments', async () => 4);
    registry.stub(Interview, 'countDocuments', async (filter = {}) => filter.status === 'scheduled' ? 5 : 2);
    registry.stub(Application, 'aggregate', async () => [{ avgScore: 84.5 }]);
    const res = createRes();

    await analyticsController.getDashboardStats(createReq(), res);

    assert.equal(res.body.totalApplications, 10);
    assert.equal(res.body.shortlistRate, '70.00');
    assert.equal(res.body.avgMatchScore, 84.5);
  });

  it('returns 404 for missing jobs in job analytics', async () => {
    registry.stub(Job, 'findById', async () => null);
    const res = createRes();

    await analyticsController.getJobAnalytics(createReq({ params: { jobId: 'missing' } }), res);

    assert.equal(res.statusCode, 404);
    assert.deepEqual(res.body, { error: 'Job not found' });
  });
});

describe('interviewController', () => {
  it('loads interviews for candidates only', async () => {
    registry.stub(Interview, 'find', (filter) => {
      assert.deepEqual(filter, { candidate: 'candidate-1' });
      return resolvedQuery([{ _id: 'interview-1' }]);
    });
    const res = createRes();

    await interviewController.getInterviews(createReq({ user: { role: 'candidate', id: 'candidate-1' } }), res);

    assert.deepEqual(res.body, [{ _id: 'interview-1' }]);
  });

  it('rejects invalid interview outcomes', async () => {
    const res = createRes();

    await interviewController.updateInterviewOutcome(
      createReq({ body: { decision: 'selected' }, params: { id: 'interview-1' } }),
      res
    );

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { error: 'Invalid interview decision' });
  });
});
