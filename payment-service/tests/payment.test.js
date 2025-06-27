const request = require('supertest');
const app = require('../server');

describe('Payment Service (in-memory, no DB)', () => {
  let payment_id;

  it('should respond to /healthz', async () => {
    const res = await request(app).get('/healthz');
    expect(res.statusCode).toBe(200);
    expect(res.text).toMatch(/healthy/i);
  });

  it('should fail if fields are missing', async () => {
    const res = await request(app).post('/payment').send({});
    expect(res.statusCode).toBe(400);
  });

  it('should fail with invalid card details', async () => {
    const res = await request(app).post('/payment').send({
      user_id: 1,
      order_id: 2,
      amount: 100,
      method: "CARD",
      address: "test",
      card: { number: "123", cvv: "12", month: "1", year: "25" }
    });
    expect(res.statusCode).toBe(400);
  });

  it('should process a valid payment', async () => {
    const res = await request(app).post('/payment').send({
      user_id: 1,
      order_id: 2,
      amount: 100,
      method: "CARD",
      address: "test",
      card: { number: "1234567812345678", cvv: "123", month: "12", year: "25" }
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/Payment successful/i);
    payment_id = res.body.payment_id;
  });

  it('should fetch payments by user id', async () => {
    const res = await request(app).get('/payment/1');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.payments)).toBe(true);
    expect(res.body.payments.length).toBeGreaterThan(0);
    expect(res.body.payments[0]).toHaveProperty('user_id', 1);
  });
});
