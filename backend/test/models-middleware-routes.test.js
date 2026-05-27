const { afterEach, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');

const { authMiddleware, authorize } = require('../src/middleware/auth');
const errorHandler = require('../src/middleware/errorHandler');
const User = require('../src/models/User');
const Job = require('../src/models/Job');
const Application = require('../src/models/Application');
const Interview = require('../src/models/Interview');
const Email = require('../src/models/Email');
const authRoutes = require('../src/routes/auth');
const jobRoutes = require('../src/routes/jobs');
const applicationRoutes = require('../src/routes/applications');
const analyticsRoutes = require('../src/routes/analytics');
const interviewRoutes = require('../src/routes/interviews');
const { createReq, createRes, createCleanupRegistry } = require('./helpers');

const registry = createCleanupRegistry();

afterEach(() => {
  registry.cleanup();
});

describe('middleware', () => {
  it('rejects requests without an auth token', () => {
    const req = createReq();
    const res = createRes();

    authMiddleware(req, res, () => {});

    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, { error: 'No token provided' });
  });

  it('accepts valid tokens and decorates req.user', () => {
    process.env.JWT_SECRET = 'test-secret';
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: 'user-1', role: 'admin' }, process.env.JWT_SECRET);
    const req = createReq({ headers: { authorization: `Bearer ${token}` } });
    const res = createRes();
    let nextCalled = false;

    authMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(req.user.id, 'user-1');
  });

  it('blocks unauthorized roles', () => {
    const req = createReq({ user: { role: 'candidate' } });
    const res = createRes();

    authorize('admin')(req, res, () => {});

    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, { error: 'Insufficient permissions' });
  });

  it('maps validation and generic errors through the error handler', () => {
    const validationRes = createRes();
    errorHandler({ name: 'ValidationError', message: 'Bad payload' }, {}, validationRes, () => {});
    assert.equal(validationRes.statusCode, 400);
    assert.equal(validationRes.body.error, 'Validation error');

    const genericRes = createRes();
    errorHandler({ message: 'Broken' }, {}, genericRes, () => {});
    assert.equal(genericRes.statusCode, 500);
    assert.deepEqual(genericRes.body, { error: 'Broken' });
  });
});

describe('models', () => {
  it('applies user defaults and compares hashed passwords', async () => {
    const passwordHash = await bcrypt.hash('secret', 10);
    const user = new User({
      email: 'user@example.com',
      passwordHash,
      firstName: 'Taylor',
    });

    assert.equal(user.role, 'candidate');
    assert.equal(user.status, 'active');
    assert.equal(await user.comparePassword('secret'), true);
  });

  it('validates job schema requirements and defaults', () => {
    const job = new Job({
      title: 'Engineer',
      description: 'Build things',
      hrEmail: 'hr@example.com',
      interviewerEmail: 'panel@example.com',
      createdBy: '507f1f77bcf86cd799439011',
    });

    assert.equal(job.status, 'open');
    assert.equal(job.shortlistThreshold, 75);
    assert.equal(job.validateSync(), undefined);
  });

  it('enforces application and interview enums', () => {
    const application = new Application({
      jobId: '507f1f77bcf86cd799439011',
      candidateId: '507f1f77bcf86cd799439012',
      status: 'selected',
    });
    assert.equal(application.validateSync(), undefined);

    const interview = new Interview({
      applicationId: '507f1f77bcf86cd799439013',
      candidate: '507f1f77bcf86cd799439012',
      job: '507f1f77bcf86cd799439011',
      interviewerName: 'Pat',
      interviewerEmail: 'pat@example.com',
      zoomLink: 'https://zoom.us/j/1234567890',
      scheduledBy: '507f1f77bcf86cd799439014',
      scheduledTime: new Date(),
    });
    assert.equal(interview.status, 'scheduled');
    assert.equal(interview.decision, 'pending');
    assert.equal(interview.validateSync(), undefined);
  });

  it('requires valid email records', () => {
    const email = new Email({
      applicationId: '507f1f77bcf86cd799439015',
      recipientEmail: 'candidate@example.com',
      subject: 'Update',
      body: 'Body',
      type: 'rejection',
    });

    assert.equal(email.validateSync(), undefined);
  });
});

describe('routes', () => {
  const listRoutes = (router) => router.stack
    .filter((layer) => layer.route)
    .map((layer) => ({
      path: layer.route.path,
      methods: Object.keys(layer.route.methods).sort(),
    }));

  it('registers auth routes', () => {
    assert.deepEqual(listRoutes(authRoutes), [
      { path: '/signup', methods: ['post'] },
      { path: '/login', methods: ['post'] },
      { path: '/logout', methods: ['post'] },
    ]);
  });

  it('registers job, application, analytics, and interview routes', () => {
    assert.deepEqual(listRoutes(jobRoutes), [
      { path: '/', methods: ['post'] },
      { path: '/', methods: ['get'] },
    ]);

    assert.deepEqual(listRoutes(applicationRoutes), [
      { path: '/', methods: ['post'] },
      { path: '/', methods: ['get'] },
      { path: '/:id/status', methods: ['put'] },
    ]);

    assert.deepEqual(listRoutes(analyticsRoutes), [
      { path: '/dashboard', methods: ['get'] },
      { path: '/candidates/funnel', methods: ['get'] },
    ]);

    assert.deepEqual(listRoutes(interviewRoutes), [
      { path: '/:id/outcome', methods: ['put'] },
    ]);
  });
});
