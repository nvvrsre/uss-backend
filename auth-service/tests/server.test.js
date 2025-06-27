// Set NODE_ENV before imports!
process.env.NODE_ENV = 'coverage';

const request = require('supertest');
const app = require('../server');

// Mocks
jest.mock('mysql2', () => {
  const mPool = { query: jest.fn() };
  return { createPool: () => mPool };
});
jest.mock('axios', () => ({
  post: jest.fn(() => Promise.resolve({}))
}));
const mysql = require('mysql2');

beforeEach(() => {
  jest.clearAllMocks();
});

// --- Health check
describe('GET /healthz', () => {
  it('should confirm health', async () => {
    const res = await request(app).get('/healthz');
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('Auth Service healthy');
  });
});

// --- Signup Success
it('should register user successfully', async () => {
  mysql.createPool().query.mockImplementationOnce((q, params, cb) => cb(null, { insertId: 1 }));
  const res = await request(app).post('/signup').send({ name: 'Vishnu', email: 'v@a.com', password: 'pw' });
  expect(res.statusCode).toBe(200);
  expect(res.body.message).toBe('User registered successfully');
});

// --- Signup: Missing fields (400)
it('should return 400 if signup fields missing', async () => {
  const res = await request(app).post('/signup').send({ email: 'x@a.com' });
  expect(res.statusCode).toBe(400);
  expect(res.body.message).toMatch(/All fields/);
});

// --- Signup: Duplicate email (409)
it('should return 409 if email exists', async () => {
  mysql.createPool().query.mockImplementationOnce((q, params, cb) =>
    cb({ code: 'ER_DUP_ENTRY' }, null)
  );
  const res = await request(app).post('/signup').send({ name: 'V', email: 'dup@a.com', password: 'pw' });
  expect(res.statusCode).toBe(409);
});

// --- Signup: Other DB error (500)
it('should return 500 on DB error', async () => {
  mysql.createPool().query.mockImplementationOnce((q, params, cb) =>
    cb({ code: 'OTHER_ERROR', message: 'Some DB error' }, null)
  );
  const res = await request(app).post('/signup').send({ name: 'V', email: 'err@a.com', password: 'pw' });
  expect(res.statusCode).toBe(500);
});

// --- Signup: Notification .catch error
it('should log error if notification sending fails after signup', async () => {
  mysql.createPool().query.mockImplementationOnce((q, params, cb) => cb(null, { insertId: 1 }));
  const axios = require('axios');
  axios.post.mockImplementationOnce(() => Promise.reject(new Error('Notify fail')));
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  const res = await request(app).post('/signup').send({ name: 'FailTest', email: 'fail@test.com', password: 'pw' });
  expect(res.statusCode).toBe(200);
  expect(spy).toHaveBeenCalledWith("Error sending signup notification:", "Notify fail");
  spy.mockRestore();
});

// --- Login: Success
it('should login successfully', async () => {
  mysql.createPool().query.mockImplementationOnce((q, params, cb) =>
    cb(null, [{ id: 1, name: 'Vishnu', email: 'v@a.com' }])
  );
  const res = await request(app).post('/login').send({ email: 'v@a.com', password: 'pw' });
  expect(res.statusCode).toBe(200);
  expect(res.body.token).toBeDefined();
});

// --- Login: Invalid credentials (401)
it('should 401 if credentials invalid', async () => {
  mysql.createPool().query.mockImplementationOnce((q, params, cb) =>
    cb(null, [])
  );
  const res = await request(app).post('/login').send({ email: 'no@a.com', password: 'wrong' });
  expect(res.statusCode).toBe(401);
});

// --- Login: DB error (500)
it('should 500 if DB error on login', async () => {
  mysql.createPool().query.mockImplementationOnce((q, params, cb) =>
    cb({ message: 'db err' }, null)
  );
  const res = await request(app).post('/login').send({ email: 'err@a.com', password: 'pw' });
  expect(res.statusCode).toBe(500);
});

// --- Users list: Success
it('should list users', async () => {
  mysql.createPool().query.mockImplementationOnce((q, cb) =>
    cb(null, [{ id: 1, name: 'V', email: 'v@a.com' }])
  );
  const res = await request(app).get('/users');
  expect(res.statusCode).toBe(200);
  expect(res.body.users).toBeDefined();
});

// --- Users list: DB error (500)
it('should return 500 if DB error on users', async () => {
  mysql.createPool().query.mockImplementationOnce((q, cb) =>
    cb({ message: 'db err' }, null)
  );
  const res = await request(app).get('/users');
  expect(res.statusCode).toBe(500);
});

// // --- 501 Not implemented branch for test env
// it('should return 501 for /signup in test env', async () => {
//   process.env.NODE_ENV = 'test';
//   const appTest = require('../server'); // re-import with test env
//   const res = await request(appTest).post('/signup').send({ name: 'X', email: 'x@a.com', password: 'pw' });
//   expect(res.statusCode).toBe(501);
//   process.env.NODE_ENV = 'coverage'; // restore
// });
