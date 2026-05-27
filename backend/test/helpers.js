const createReq = (overrides = {}) => ({
  body: {},
  params: {},
  headers: {},
  user: null,
  file: null,
  ...overrides,
});

const createRes = () => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };

  return res;
};

const resolvedQuery = (value) => ({
  populate() {
    return this;
  },
  sort() {
    return this;
  },
  then(resolve, reject) {
    return Promise.resolve(value).then(resolve, reject);
  },
});

const createCleanupRegistry = () => {
  const cleanups = [];

  return {
    stub(target, key, value) {
      const original = target[key];
      target[key] = value;
      cleanups.push(() => {
        target[key] = original;
      });
    },
    cleanup() {
      while (cleanups.length > 0) {
        cleanups.pop()();
      }
    },
  };
};

const freshRequire = (modulePath) => {
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
};

module.exports = {
  createReq,
  createRes,
  resolvedQuery,
  createCleanupRegistry,
  freshRequire,
};
