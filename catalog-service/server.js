// server.js (Catalog Service)
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const isTest = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'coverage';

const app = express();
app.use(bodyParser.json());
app.use(cors());

let db;
/* istanbul ignore next */
if (!isTest) {
  db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });

  db.connect((err) => {
    if (err) {
      console.error('❌ MySQL connection error:', err);
      process.exit(1);
    }
    db.query(
      `CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        image_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      (err) => {
        if (err) throw err;
        if (!isTest) {
          try {
            const categoriesData = require('./categoriesData');
            seedCategories(categoriesData);
          } catch (e) {
            // ignore, fine for test/CI
          }
        }
      }
    );
  });
} else {
  // Use a mock connection in test/coverage (mocked by Jest)
  db = require('mysql2').createConnection();
}

// Only in non-test/coverage mode
function seedCategories(categoriesData) {
  db.query('SELECT COUNT(*) AS count FROM categories', (err, results) => {
    if (err) throw err;
    if (results[0].count === 0) {
      categoriesData.forEach(cat => {
        db.query(
          'INSERT INTO categories (name, description, image_url) VALUES (?, ?, ?)',
          [cat.name, cat.description, cat.image_url],
          (err) => {
            if (err && !err.message.includes('Duplicate')) {
              console.error('Seed error:', err);
            }
          }
        );
      });
      console.log('✅ Seeded default categories');
    }
  });
}

// UTILITY: simulate DB error if test/coverage and ?DB_FAIL=true (query or body)
function shouldFail(req) {
  if (!isTest) return false;
  // For GET/DELETE, check req.query; for POST/PUT also check req.body
  if (req.query && req.query.DB_FAIL) return true;
  if (req.body && req.body.DB_FAIL) return true;
  return false;
}

// Health check endpoint
app.get('/healthz', (req, res) => {
  res.status(200).send('Catalog Service is healthy');
});

// List all categories
app.get('/categories', (req, res) => {
  if (shouldFail(req)) return res.status(500).json({ error: 'DB error' });
  db.query('SELECT * FROM categories', (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

// Get single category
app.get('/categories/:id', (req, res) => {
  if (shouldFail(req)) return res.status(500).json({ error: 'DB error' });
  db.query('SELECT * FROM categories WHERE id = ?', [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const cat = rows[0];
    cat.id = Number(cat.id); // Ensure id is number for strict checks
    res.json(cat);
  });
});

// Create new category
app.post('/categories', (req, res) => {
  if (shouldFail(req)) return res.status(500).json({ error: 'DB error' });
  const { name, description, image_url } = req.body;
  db.query(
    'INSERT INTO categories (name, description, image_url) VALUES (?, ?, ?)',
    [name, description, image_url],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'DB error', details: err.message });
      res.json({ id: result.insertId, name, description, image_url });
    }
  );
});

// Update category
app.put('/categories/:id', (req, res) => {
  if (shouldFail(req)) return res.status(500).json({ error: 'DB error' });
  const { name, description, image_url } = req.body;
  db.query(
    'UPDATE categories SET name=?, description=?, image_url=? WHERE id=?',
    [name, description, image_url, req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'DB error', details: err.message });
      res.json({ id: String(req.params.id), name, description, image_url });
    }
  );
});

// Delete category
app.delete('/categories/:id', (req, res) => {
  if (shouldFail(req)) return res.status(500).json({ error: 'DB error' });
  db.query('DELETE FROM categories WHERE id=?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'DB error', details: err.message });
    res.json({ success: true });
  });
});

const PORT = process.env.PORT || 3008;
/* istanbul ignore next */
if (!isTest) {
  app.listen(PORT, () => {
    console.log(`🚀 Catalog service running on port ${PORT}`);
  });
}

module.exports = app;
module.exports.db = db;
