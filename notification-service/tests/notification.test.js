// tests/notification.test.js

jest.mock('nodemailer', () => {
  const sendMailMock = jest.fn((opts, cb) => setImmediate(() => cb(null, { response: 'MOCK: email sent' })));
  return { createTransport: jest.fn(() => ({ sendMail: sendMailMock })) };
});

// --- MOCK MYSQL2 FOR DB-BRANCH COVERAGE ---
jest.mock('mysql2', () => {
  // Simulate DB connection for coverage (never hits real DB)
  const fakeConn = {
    query: jest.fn((sql, params, cb) => {
      if (typeof params === 'function') { cb = params; params = []; }
      if (params && params[0] === 'fail@fail.com') return cb(new Error('fail'));
      if (/insert/i.test(sql)) return cb(null, { insertId: 1 });
      cb(null, []);
    }),
    connect: jest.fn(cb => cb && cb(null)),
  };
  return { createConnection: jest.fn(() => fakeConn) };
});

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => {
  console.log.mockRestore();
  console.error.mockRestore();
});

const request = require('supertest');

describe('Notification Service - FULL Coverage', () => {
  let app;
  beforeEach(() => {
    jest.resetModules();
    app = require('../server');
    if (app.resetInMemory) app.resetInMemory();
    process.env.USE_REAL_DB = 'false';
  });

  it('should respond to /healthz', async () => {
    const res = await request(app).get('/healthz');
    expect(res.statusCode).toBe(200);
    expect(res.text).toMatch(/healthy/i);
  });

  it('should accept /notify-me and return a success message', async () => {
    const res = await request(app)
      .post('/notify-me')
      .send({ email: 'vishnu@example.com', term: 'Mobile' });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/saved/i);
    expect(res.body.request).toHaveProperty('email', 'vishnu@example.com');
    expect(res.body.request).toHaveProperty('search_term', 'Mobile');
  });

  it('should 400 if missing email or term for notify-me', async () => {
    const res = await request(app).post('/notify-me').send({ email: 'a@b.c' });
    expect(res.statusCode).toBe(400);
    const res2 = await request(app).post('/notify-me').send({ term: 'x' });
    expect(res2.statusCode).toBe(400);
  });

  it('should list all notify-me requests', async () => {
    await request(app).post('/notify-me').send({ email: 'a@b.c', term: 'Mobile' });
    const res = await request(app).get('/notify-me/all');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.requests)).toBe(true);
    expect(typeof res.body.count).toBe('number');
  });

  it('should clear all notify-me requests', async () => {
    await request(app).post('/notify-me').send({ email: 'a@b.c', term: 'Mobile' });
    const res = await request(app).delete('/notify-me/all');
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/cleared/i);
    const getRes = await request(app).get('/notify-me/all');
    expect(getRes.body.count).toBe(0);
  });

  // DB-ONLY branches: GET/DELETE /notify-me/all should 400 if USE_REAL_DB
  it('should 400 if notify-me/all used with USE_REAL_DB', async () => {
    process.env.USE_REAL_DB = 'true';
    jest.resetModules();
    const realApp = require('../server');
    const res = await request(realApp).get('/notify-me/all');
    expect(res.statusCode).toBe(400);
    process.env.USE_REAL_DB = 'false';
  });

  it('should 400 for DELETE /notify-me/all with USE_REAL_DB', async () => {
    process.env.USE_REAL_DB = 'true';
    jest.resetModules();
    const realApp = require('../server');
    const res = await request(realApp).delete('/notify-me/all');
    expect(res.statusCode).toBe(400);
    process.env.USE_REAL_DB = 'false';
  });

  // --- DB error branch for POST /notify-me ---
  it('should 500 if real DB errors on /notify-me', async () => {
    process.env.USE_REAL_DB = 'true';
    jest.resetModules();
    const realApp = require('../server');
    const res = await request(realApp).post('/notify-me').send({ email: 'fail@fail.com', term: 'Mobile' });
    expect(res.statusCode).toBe(500);
    process.env.USE_REAL_DB = 'false';
  });

  // Notification sending
  it('should send notification (email)', async () => {
    const res = await request(app)
      .post('/notify')
      .send({ email: 'vishnu@example.com', subject: 'Test Notif', message: 'Hi from Jest!' });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/Notification sent/i);
  });

  it('should reject /notify if message is missing', async () => {
    const res = await request(app)
      .post('/notify')
      .send({ email: 'vishnu@example.com' });
    expect(res.statusCode).toBe(400);
  });

  it('should reject /notify if email/phone/user_id missing', async () => {
    const res = await request(app).post('/notify').send({ message: 'hi' });
    expect(res.statusCode).toBe(400);
  });

  it('should allow /notify by user_id (uses dev-mode email)', async () => {
    const res = await request(app)
      .post('/notify')
      .send({ user_id: 123, message: 'Test for user_id' });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/Notification sent/i);
  });

  it('should 400 if missing all inputs for notify-me', async () => {
    const res = await request(app).post('/notify-me').send({});
    expect(res.statusCode).toBe(400);
  });
});
