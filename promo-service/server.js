const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(cors());

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false }
});

// --- Helper: check if user is new (no previous coupons) ---
function isNewUser(user_id) {
  return new Promise((resolve) => {
    db.query('SELECT COUNT(*) AS cnt FROM user_coupons WHERE user_id = ?', [user_id], (err, result) => {
      if (err) return resolve(false);
      resolve(result[0].cnt === 0);
    });
  });
}

// --- Helper: Validate promotion for a user/cart ---
function validatePromotion(promo, user_id, cart_total, product_count, is_new, user_coupons_used) {
  if (promo.user_restriction === 'NEW_USER' && !is_new) return 'Coupon for new users only';
  if (promo.min_cart_value > 0 && cart_total < promo.min_cart_value) return 'Minimum cart value not met';
  if (promo.min_product_count > 0 && product_count < promo.min_product_count) return 'Minimum product count not met';
  if (user_coupons_used !== undefined && user_coupons_used >= promo.max_usage_per_user) return 'Usage limit reached';
  return null;
}

// --- Create tables and inject default promos ---
db.connect((err) => {
  if (err) process.exit(1);
  db.query(
    `CREATE TABLE IF NOT EXISTS promotions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type VARCHAR(30),
      code VARCHAR(50),
      description VARCHAR(255),
      discount_type VARCHAR(20),
      discount_value DECIMAL(5,2),
      min_cart_value DECIMAL(10,2) DEFAULT 0,
      min_product_count INT DEFAULT 0,
      user_restriction VARCHAR(30) DEFAULT 'ALL',
      start_date DATETIME,
      end_date DATETIME,
      max_usage_per_user INT DEFAULT 1,
      active TINYINT DEFAULT 1
    )`
  );
  db.query(
    `CREATE TABLE IF NOT EXISTS user_coupons (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      promotion_id INT NOT NULL,
      used_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  );

  // Default promos (add as needed)
  const defaultPromos = [
    {
      type: 'CART_VALUE',
      code: null,
      description: 'Flat 20% off on orders above 1L',
      discount_type: 'PERCENTAGE',
      discount_value: 20,
      min_cart_value: 100000,
      min_product_count: 0,
      user_restriction: 'ALL',
      start_date: null,
      end_date: null,
      max_usage_per_user: 1,
      active: 1
    },
    {
      type: 'COUPON',
      code: 'WELCOME10',
      description: '10% off for new users',
      discount_type: 'PERCENTAGE',
      discount_value: 10,
      min_cart_value: 0,
      min_product_count: 0,
      user_restriction: 'NEW_USER',
      start_date: null,
      end_date: null,
      max_usage_per_user: 1,
      active: 1
    },
    {
      type: 'COUPON',
      code: 'PRODUCTMIN',
      description: 'Needs 3 products',
      discount_type: 'PERCENTAGE',
      discount_value: 10,
      min_cart_value: 0,
      min_product_count: 3,
      user_restriction: 'ALL',
      start_date: null,
      end_date: null,
      max_usage_per_user: 1,
      active: 1
    },
    {
      type: 'PRODUCT_QUANTITY',
      code: 'QTY3',
      description: 'Needs 3 products for discount',
      discount_type: 'PERCENTAGE',
      discount_value: 10,
      min_cart_value: 0,
      min_product_count: 3,
      user_restriction: 'ALL',
      start_date: null,
      end_date: null,
      max_usage_per_user: 1,
      active: 1
    },
    {
      type: 'COUPON',
      code: 'MINCART50',
      description: 'Min cart value 50000',
      discount_type: 'PERCENTAGE',
      discount_value: 10,
      min_cart_value: 50000,
      min_product_count: 0,
      user_restriction: 'ALL',
      start_date: null,
      end_date: null,
      max_usage_per_user: 1,
      active: 1
    }
  ];
  defaultPromos.forEach((promo) => {
    db.query(
      `SELECT id FROM promotions WHERE description = ? AND type = ? AND discount_value = ? AND min_cart_value = ? AND min_product_count = ?`,
      [promo.description, promo.type, promo.discount_value, promo.min_cart_value, promo.min_product_count],
      (err, rows) => {
        if (!err && rows.length === 0) {
          db.query(
            `INSERT INTO promotions (type, code, description, discount_type, discount_value, min_cart_value, min_product_count, user_restriction, start_date, end_date, max_usage_per_user, active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              promo.type, promo.code, promo.description, promo.discount_type, promo.discount_value,
              promo.min_cart_value, promo.min_product_count, promo.user_restriction, promo.start_date,
              promo.end_date, promo.max_usage_per_user, promo.active
            ]
          );
        }
      }
    );
  });
});

// --- 1. Create promotion (admin) ---
app.post('/promotions', (req, res) => {
  const promo = req.body;
  db.query(
    `INSERT INTO promotions 
      (type, code, description, discount_type, discount_value, min_cart_value, min_product_count, user_restriction, start_date, end_date, max_usage_per_user, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      promo.type, promo.code, promo.description, promo.discount_type, promo.discount_value, promo.min_cart_value || 0,
      promo.min_product_count || 0, promo.user_restriction || 'ALL', promo.start_date, promo.end_date, promo.max_usage_per_user || 1, promo.active ? 1 : 0
    ],
    (err, result) => {
      if (err) return res.status(500).json({ message: 'DB error', error: err });
      res.json({ id: result.insertId });
    }
  );
});

// --- 2. Get available promotions for a user/cart ---
app.get('/promotions/available', async (req, res) => {
  const user_id = parseInt(req.query.user_id, 10);
  const cart_total = parseFloat(req.query.cart_total);
  const product_count = parseInt(req.query.product_count, 10);
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  db.query(
    `SELECT * FROM promotions WHERE active=1 AND (start_date IS NULL OR start_date <= ?) AND (end_date IS NULL OR end_date >= ?)`,
    [now, now],
    async (err, rows) => {
      if (err) return res.status(500).json({ message: 'DB error', error: err });

      const is_new = await isNewUser(user_id);
      let available = [];
      for (const promo of rows) {
        let user_coupons_used = 0;
        await new Promise(resolve =>
          db.query(
            `SELECT COUNT(*) AS cnt FROM user_coupons WHERE user_id=? AND promotion_id=?`,
            [user_id, promo.id],
            (e, result) => {
              user_coupons_used = !e && result.length ? result[0].cnt : 0;
              resolve();
            }
          )
        );
        if (!validatePromotion(promo, user_id, cart_total, product_count, is_new, user_coupons_used)) {
          available.push(promo);
        }
      }
      res.json(available);
    }
  );
});

// --- 3. Validate coupon code for user/cart ---
app.post('/promotions/validate', (req, res) => {
  const { user_id, code, cart_total, product_count } = req.body;
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  db.query(
    `SELECT * FROM promotions WHERE code = ? AND active=1 AND (start_date IS NULL OR start_date <= ?) AND (end_date IS NULL OR end_date >= ?)`,
    [code, now, now],
    async (err, rows) => {
      if (err) return res.status(500).json({ message: 'DB error', error: err });
      if (!rows || !rows.length) return res.status(404).json({ message: 'Invalid or expired coupon' });
      const promo = rows[0];

      const is_new = await isNewUser(user_id);

      db.query(
        `SELECT COUNT(*) AS cnt FROM user_coupons WHERE user_id=? AND promotion_id=?`,
        [user_id, promo.id],
        (err2, result2) => {
          const user_coupons_used = !err2 && result2.length ? result2[0].cnt : 0;
          const msg = validatePromotion(promo, user_id, cart_total, product_count, is_new, user_coupons_used);
          if (msg) return res.status(400).json({ message: msg });
          res.json({ valid: true, promotion: promo });
        }
      );
    }
  );
});

// --- 4. Apply all eligible promotions (auto + coupon), mark coupon as used ---
app.post('/promotions/apply', async (req, res) => {
  const { user_id, cart_total, product_count, code } = req.body;
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  let total_discount = 0;
  let applied_promos = [];

  // FINAL FIX: If code is present, do *not* allow fallback to automatic promos
  if (code) {
    db.query(
      `SELECT * FROM promotions WHERE code=? AND active=1 AND (start_date IS NULL OR start_date <= ?) AND (end_date IS NULL OR end_date >= ?)`,
      [code, now, now],
      async (err2, codeRows) => {
        if (err2) { res.status(500).json({ message: 'DB error', error: err2 }); return; }
        if (!codeRows || !codeRows.length) {
          res.status(400).json({ message: 'Invalid coupon code' }); return;
        }
        const promo = codeRows[0];
        const is_new = await isNewUser(user_id);

        db.query(
          `SELECT COUNT(*) AS cnt FROM user_coupons WHERE user_id=? AND promotion_id=?`,
          [user_id, promo.id],
          (err3, usedRows) => {
            const user_coupons_used = !err3 && usedRows.length ? usedRows[0].cnt : 0;
            const msg = validatePromotion(promo, user_id, cart_total, product_count, is_new, user_coupons_used);
            if (msg) { res.status(400).json({ message: msg }); return; }

            if (promo.discount_type === 'PERCENTAGE' || promo.discount_type === 'CASHBACK') {
              total_discount += (cart_total * promo.discount_value) / 100;
            }
            db.query(
              `INSERT INTO user_coupons (user_id, promotion_id) VALUES (?, ?)`,
              [user_id, promo.id]
            );
            applied_promos.push(promo);

            res.json({
              total: cart_total,
              total_discount,
              final_amount: Math.round((cart_total - total_discount) * 100) / 100,
              applied_promos,
            });
            return;
          }
        );
      }
    );
    // CRUCIAL: Do not allow auto-promo fallback if code is present (even if invalid or fails validation)
    return;
  }

  db.query(
    `SELECT * FROM promotions WHERE active=1 AND (type='CART_VALUE' OR type='PRODUCT_QUANTITY')
      AND (start_date IS NULL OR start_date <= ?) AND (end_date IS NULL OR end_date >= ?)`,
    [now, now],
    async (err, rows) => {
      if (err) { res.status(500).json({ message: 'DB error', error: err }); return; }

      for (let promo of rows) {
        const is_new = await isNewUser(user_id);
        let user_coupons_used = 0;
        await new Promise(resolve =>
          db.query(
            `SELECT COUNT(*) AS cnt FROM user_coupons WHERE user_id=? AND promotion_id=?`,
            [user_id, promo.id],
            (e, result) => {
              user_coupons_used = !e && result.length ? result[0].cnt : 0;
              resolve();
            }
          )
        );
        const msg = validatePromotion(promo, user_id, cart_total, product_count, is_new, user_coupons_used);
        if (!msg) {
          if (promo.discount_type === 'PERCENTAGE' || promo.discount_type === 'CASHBACK') {
            total_discount += (cart_total * promo.discount_value) / 100;
            applied_promos.push(promo);
          }
        }
      }
      res.json({
        total: cart_total,
        total_discount,
        final_amount: Math.round((cart_total - total_discount) * 100) / 100,
        applied_promos,
      });
      return;
    }
  );
});

app.get('/', (req, res) => {
  res.send('🚀 Promotional Service running!');
});

const PORT = process.env.PORT || 3007;
if (require.main === module) {
  app.listen(PORT, () => {
    // console.log(`🚀 Promo Service running on port ${PORT}`);
  });
}

module.exports = app;
