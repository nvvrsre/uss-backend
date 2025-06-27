const request = require('supertest');
const app = require('../server');

describe('Order Service (in-memory, no DB)', () => {
  let testOrderId;

  it('should respond to /healthz', async () => {
    const res = await request(app).get('/healthz');
    expect(res.statusCode).toBe(200);
    expect(res.text).toMatch(/healthy/i);
  });

  it('should place a new order', async () => {
    const res = await request(app)
      .post('/orders')
      .send({
        user_id: 1,
        items: [
          { product_id: 101, quantity: 2, price: 250.0 },
          { product_id: 102, quantity: 1, price: 500.0 }
        ],
        total: 1000.0,
        address: '123 Main St',
        name: 'Vishnu',
        email: 'vishnu@example.com'
      });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('order_id');
    expect(res.body.message).toMatch(/Order placed/i);
    testOrderId = res.body.order_id;
  });

  it('should get all orders for user', async () => {
    const res = await request(app).get('/orders?user_id=1');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('items');
  });

  it('should get orders by userId (raw, no items)', async () => {
    const res = await request(app).get('/orders/1');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.orders)).toBe(true);
    expect(res.body.orders.length).toBeGreaterThan(0);
  });

  it('should get order items for an order', async () => {
    // testOrderId is set by first test
    const res = await request(app).get(`/order-items/${testOrderId}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items[0]).toHaveProperty('order_id', testOrderId);
  });

  it('should reject placing order with missing fields', async () => {
    const res = await request(app)
      .post('/orders')
      .send({ user_id: 2, total: 500 });
    expect(res.statusCode).toBe(400);
  });
});
