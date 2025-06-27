const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const isTest = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'coverage';

const app = express();
app.use(bodyParser.json());
app.use(cors());

let db;
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
      `CREATE TABLE IF NOT EXISTS carts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        product_id INT,
        quantity INT DEFAULT 1
      )`,
      (err, result) => {
        if (err) {
          console.error('❌ Failed to ensure carts table:', err);
        } else {
          console.log('✅ Carts table ready');
        }
      }
    );
    console.log('✅ Connected to Cart DB');
  });
} else {
  // Use a mock/fake db object for tests if you want
  db = require('mysql2').createConnection();
}

// --- GET cart for a user, including eligible promotions ---
app.get('/cart/:userId', async (req, res) => {
  db.query('SELECT * FROM carts WHERE user_id = ?', [req.params.userId], async (err, results) => {
    if (err) return res.status(500).json({ message: 'DB error' });
    try {
      const cart = results;
      let cart_total = 0;
      let product_count = cart.length;
      const promoRes = await axios.get(
        `http://api-gateway:3000/promotions/available?user_id=${req.params.userId}&cart_total=${cart_total}&product_count=${product_count}`
      );
      res.json({ cart, promotions: promoRes.data });
    } catch (err2) {
      res.json({ cart: results, promotions: [] });
    }
  });
});

// --- Add product to cart ---
app.post('/cart/add', (req, res) => {
  const { user_id, product_id, quantity } = req.body;
  db.query(
    'INSERT INTO carts (user_id, product_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)',
    [user_id, product_id, quantity || 1],
    (err, result) => {
      if (err) return res.status(500).json({ message: 'DB error' });
      res.json({ message: 'Product added to cart' });
    }
  );
});

// --- Remove product from cart ---
app.post('/cart/remove', (req, res) => {
  const { user_id, product_id } = req.body;
  db.query('DELETE FROM carts WHERE user_id = ? AND product_id = ?', [user_id, product_id], (err, result) => {
    if (err) return res.status(500).json({ message: 'DB error' });
    res.json({ message: 'Product removed from cart' });
  });
});

// --- Clear cart ---
app.post('/cart/clear', (req, res) => {
  const { user_id } = req.body;
  db.query('DELETE FROM carts WHERE user_id = ?', [user_id], (err, result) => {
    if (err) return res.status(500).json({ message: 'DB error' });
    res.json({ message: 'Cart cleared' });
  });
});

// --- Health Check ---
app.get('/healthz', (req, res) => {
  res.status(200).send('Cart Service healthy');
});

if (!isTest) {
  const PORT = process.env.PORT || 3003;
  app.listen(PORT, () => {
    console.log(`🚀 Cart service running on port ${PORT}`);
  });
}

module.exports = app;
