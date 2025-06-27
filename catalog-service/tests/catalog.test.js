const request = require('supertest');

// --- 1. DB mock with DB_FAIL simulation ---
const mockConn = {
  query: jest.fn((sql, params, cb) => {
    if (typeof params === 'function') {
      cb = params;
      params = [];
    }
    // DB_FAIL if present in params (body/query) or as '?DB_FAIL=1' in SQL (for GET /categories)
    let dbFail = false;
    if (Array.isArray(params)) dbFail = params.some(x => x && x.DB_FAIL);
    if (!dbFail && typeof sql === 'string' && sql.includes('DB_FAIL')) dbFail = true;
    if (dbFail) return cb(new Error('DB error simulated'));
    // Happy path responses:
    if (/SELECT \* FROM categories WHERE id = \?/.test(sql)) {
      const id = Number(params[0]);
      if (id === 999) return cb(null, []);
      return cb(null, [{ id, name: 'Mobiles', description: 'All mobile phones', image_url: '/img', created_at: new Date().toISOString() }]);
    }
    if (/SELECT \* FROM categories/.test(sql)) {
      return cb(null, [
        { id: 1, name: 'Mobiles', description: 'All mobile phones', image_url: '/img', created_at: new Date().toISOString() },
        { id: 2, name: 'Laptops', description: 'Laptops', image_url: '/img', created_at: new Date().toISOString() }
      ]);
    }
    if (/INSERT INTO categories/.test(sql)) {
      return cb(null, { insertId: 3 });
    }
    if (/UPDATE categories SET/.test(sql)) {
      return cb(null, { affectedRows: 1 });
    }
    if (/DELETE FROM categories/.test(sql)) {
      return cb(null, { affectedRows: 1 });
    }
    cb(null, []);
  })
};
jest.mock('mysql2', () => ({
  createConnection: () => mockConn
}));

const app = require('../server');

describe('Catalog Service', () => {
  it('should respond on /healthz', async () => {
    const res = await request(app).get('/healthz');
    expect(res.statusCode).toBe(200);
    expect(res.text).toMatch(/healthy/i);
  });

  it('should list all categories', async () => {
    const res = await request(app).get('/categories');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  let categoryId;
  it('should create a new category', async () => {
    const newCat = { name: 'TestCategory', description: 'Test Desc', image_url: 'http://img.com/test.jpg' };
    const res = await request(app).post('/categories').send(newCat);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      name: newCat.name,
      description: newCat.description,
      image_url: newCat.image_url
    });
    expect(res.body.id).toBeDefined();
    categoryId = res.body.id;
  });

  it('should fetch a single category', async () => {
    const res = await request(app).get(`/categories/${categoryId}`);
    expect(res.statusCode).toBe(200);
    // Fix: compare as Number
    expect(res.body.id).toBe(Number(categoryId));
  });

  it('should update a category', async () => {
    const updated = { name: 'UpdatedCat', description: 'Updated Desc', image_url: 'http://img.com/updated.jpg' };
    const res = await request(app).put(`/categories/${categoryId}`).send(updated);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ ...updated, id: String(categoryId) });
  });

  it('should delete a category', async () => {
    const res = await request(app).delete(`/categories/${categoryId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should 404 after deleting a category', async () => {
    const res = await request(app).get(`/categories/999`);
    expect(res.statusCode).toBe(404);
  });

  // --- Error Branch Tests ---

  it('should 500 if DB error on list all categories', async () => {
    const res = await request(app).get('/categories').query({ DB_FAIL: true });
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/DB error/i);
  });

  it('should 500 if DB error on single category fetch', async () => {
    const res = await request(app).get('/categories/123').query({ DB_FAIL: true });
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/DB error/i);
  });

  it('should 500 if DB error on category create', async () => {
    const res = await request(app).post('/categories').send({ name: 'X', description: 'fail', image_url: 'img', DB_FAIL: true });
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/DB error/i);
  });

  it('should 500 if DB error on category update', async () => {
    const res = await request(app).put('/categories/123').send({ name: 'X', description: 'fail', image_url: 'img', DB_FAIL: true });
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/DB error/i);
  });

  it('should 500 if DB error on category delete', async () => {
    const res = await request(app).delete('/categories/123').send({ DB_FAIL: true });
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/DB error/i);
  });
});

afterAll(done => done());
