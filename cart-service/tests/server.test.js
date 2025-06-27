// Set NODE_ENV before imports!
process.env.NODE_ENV = 'coverage';

const request = require('supertest');
const app = require('../server');

jest.mock('mysql2', () => {
  const mConn = { query: jest.fn() };
  return { createConnection: () => mConn };
});
jest.mock('axios', () => ({
  get: jest.fn(() => Promise.resolve({ data: [{ promo: '10OFF' }] }))
}));
const mysql = require('mysql2');
const axios = require('axios');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Cart Service Health', () => {
  it('should respond on /healthz', async () => {
    const res = await request(app).get('/healthz');
    expect(res.statusCode).toBe(200);
    expect(res.text).toMatch(/healthy/i);
  });
});

// --- GET cart for user: Success (with promotion)
it('should get cart for user with promotions', async () => {
  mysql.createConnection().query.mockImplementationOnce((q, params, cb) =>
    cb(null, [{ product_id: 1, quantity: 2 }])
  );
  axios.get.mockImplementationOnce(() =>
    Promise.resolve({ data: [{ promo: '10OFF' }] })
  );
  const res = await request(app).get('/cart/1');
  expect(res.statusCode).toBe(200);
  expect(res.body.cart).toBeDefined();
  expect(res.body.promotions.length).toBeGreaterThanOrEqual(1);
});

// --- GET cart: DB error
it('should 500 if DB error on get cart', async () => {
  mysql.createConnection().query.mockImplementationOnce((q, params, cb) =>
    cb({ message: 'db err' }, null)
  );
  const res = await request(app).get('/cart/1');
  expect(res.statusCode).toBe(500);
});

// --- GET cart: promotions error branch
it('should return cart with empty promotions if promo API fails', async () => {
  mysql.createConnection().query.mockImplementationOnce((q, params, cb) =>
    cb(null, [{ product_id: 1, quantity: 2 }])
  );
  axios.get.mockImplementationOnce(() =>
    Promise.reject(new Error('API down'))
  );
  const res = await request(app).get('/cart/1');
  expect(res.statusCode).toBe(200);
  expect(res.body.cart).toBeDefined();
  expect(res.body.promotions).toEqual([]);
});

// --- Add product to cart: Success
it('should add product to cart', async () => {
  mysql.createConnection().query.mockImplementationOnce((q, params, cb) =>
    cb(null, { affectedRows: 1 })
  );
  const res = await request(app).post('/cart/add').send({ user_id: 1, product_id: 99, quantity: 2 });
  expect(res.statusCode).toBe(200);
  expect(res.body.message).toMatch(/added/i);
});

// --- Add product: DB error
it('should 500 if DB error on add product', async () => {
  mysql.createConnection().query.mockImplementationOnce((q, params, cb) =>
    cb({ message: 'db err' }, null)
  );
  const res = await request(app).post('/cart/add').send({ user_id: 42, product_id: 11, quantity: 1 });
  expect(res.statusCode).toBe(500);
  expect(res.body.message).toMatch(/DB error/i);
});

// --- Remove product from cart: Success
it('should remove product from cart', async () => {
  mysql.createConnection().query.mockImplementationOnce((q, params, cb) =>
    cb(null, { affectedRows: 1 })
  );
  const res = await request(app).post('/cart/remove').send({ user_id: 1, product_id: 2 });
  expect(res.statusCode).toBe(200);
  expect(res.body.message).toMatch(/removed/i);
});

// --- Remove product: DB error
it('should 500 if DB error on remove product', async () => {
  mysql.createConnection().query.mockImplementationOnce((q, params, cb) =>
    cb({ message: 'db err' }, null)
  );
  const res = await request(app).post('/cart/remove').send({ user_id: 1, product_id: 2 });
  expect(res.statusCode).toBe(500);
  expect(res.body.message).toMatch(/DB error/i);
});

// --- Clear cart: Success
it('should clear cart', async () => {
  mysql.createConnection().query.mockImplementationOnce((q, params, cb) =>
    cb(null, { affectedRows: 2 })
  );
  const res = await request(app).post('/cart/clear').send({ user_id: 1 });
  expect(res.statusCode).toBe(200);
  expect(res.body.message).toMatch(/cleared/i);
});

// --- Clear cart: DB error
it('should 500 if DB error on clear cart', async () => {
  mysql.createConnection().query.mockImplementationOnce((q, params, cb) =>
    cb({ message: 'db err' }, null)
  );
  const res = await request(app).post('/cart/clear').send({ user_id: 42 });
  expect(res.statusCode).toBe(500);
  expect(res.body.message).toMatch(/DB error/i);
});
