const request = require('supertest');
const app = require('../server'); // adjust if your test location differs

describe('Product Service (mocked DB or in-memory)', () => {
  beforeEach(async () => {
    // Reset the products before each test (ensure isolation)
    await request(app).post('/products/reset');
  });

  it('should report healthy', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('UP');
  });

  it('should list all products', async () => {
    const res = await request(app).get('/products');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('should fetch a product by id', async () => {
    const res = await request(app).get('/products/1');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('id', 1);
  });

  it('should return 404 for a missing product', async () => {
    const res = await request(app).get('/products/9999');
    expect(res.statusCode).toBe(404);
  });

  it('should create a new product', async () => {
    const prod = {
      id: 1001, // Use an ID that does NOT exist in productsData.js
      title: "Test Product",
      description: "Test Desc",
      price: 1000,
      image: "img.png",
      category: "testcat"
    };
    const res = await request(app).post('/products').send(prod);
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('title', "Test Product");
  });

  it('should fail to create a product with missing fields', async () => {
    const prod = { id: 1010 };
    const res = await request(app).post('/products').send(prod);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/All fields required/i);
  });

  it('should not allow duplicate product id', async () => {
    const prod = {
      id: 1,
      title: "Duplicate",
      description: "Dup Desc",
      price: 100,
      image: "dup.png",
      category: "dup"
    };
    const res = await request(app).post('/products').send(prod);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it('should update a product', async () => {
    const res = await request(app).put('/products/1').send({ price: 2222 });
    expect(res.statusCode).toBe(200);
    expect(res.body.price).toBe(2222);
  });

  it('should return 404 for updating a missing product', async () => {
    const res = await request(app).put('/products/404').send({ price: 10 });
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });

  it('should delete a product', async () => {
    const res = await request(app).delete('/products/1');
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/Deleted/i);
  });

  it('should return 404 for deleting a missing product', async () => {
    const res = await request(app).delete('/products/12345');
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });

  it('should reset products', async () => {
    // Add a product, then reset and check
    await request(app).post('/products').send({
      id: 1050, title: "resetprod", description: "desc", price: 5, image: "r.png", category: "test"
    });
    let allRes = await request(app).get('/products');
    expect(allRes.body.find(p => p.id === 1050)).toBeDefined();

    await request(app).post('/products/reset');
    allRes = await request(app).get('/products');
    expect(allRes.body.find(p => p.id === 1050)).toBeUndefined();
    // Should still have initial products
    expect(allRes.body.length).toBeGreaterThan(0);
  });
});
