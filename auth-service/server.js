const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(cors());

const isTest = process.env.NODE_ENV === 'test';

// DB connection pool — **only for non-test environments**
let db;
if (!isTest) {
  db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: { rejectUnauthorized: false }
  });

  // Ensure users table exists
  /* istanbul ignore next */
  db.query(
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100),
      email VARCHAR(100) UNIQUE,
      password VARCHAR(100)
    )`,
    (err, result) => {
      if (err) {
        console.error('❌ Failed to ensure users table:', err);
        process.exit(1);
      } else {
        console.log('✅ Users table ready');
      }
    }
  );

  console.log('✅ Connected to Auth DB');
}

// --- Signup ---
app.post('/signup', (req, res) => {
  if (isTest) return res.status(501).json({ message: 'Not implemented in test' });
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields required' });
  }

  db.query(
    'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
    [name, email, password],
    (err, result) => {
      if (err) {
        console.error('Signup DB error:', err);
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ message: 'Email already registered' });
        }
        return res.status(500).json({ message: 'DB error', error: err.message });
      }
      res.json({ message: 'User registered successfully' });

      // Send signup notification email (non-blocking)
      axios
        .post('http://notification-service:3006/notify', {
          email,
          subject: "Welcome to UshaSree Stores!",
          message: `
Thank you for registering at UshaSree Stores!
We're excited to have you with us.
          `.trim(),
          name,
        })
        .then(() => {
          console.log(`Signup notification sent to ${email}`);
        })
        .catch((err) => {
          console.error("Error sending signup notification:", err.message);
        });
    }
  );
});

// --- Login ---
app.post('/login', (req, res) => {
  if (isTest) return res.status(501).json({ message: 'Not implemented in test' });
  const { email, password } = req.body;
  db.query(
    'SELECT * FROM users WHERE email = ? AND password = ?',
    [email, password],
    (err, results) => {
      if (err) {
        console.error('Login DB error:', err);
        return res.status(500).json({ message: 'DB error', error: err.message });
      }
      if (results.length === 0) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Provide all required fields (including email)
      const token = "dummy-token"; // For now, static. Use JWT in prod!
      res.json({
        token,
        username: results[0].name,
        user_id: results[0].id,
        email: results[0].email
      });
    }
  );
});

// --- List Users ---
app.get('/users', (req, res) => {
  if (isTest) return res.status(501).json({ message: 'Not implemented in test' });
  db.query('SELECT id, name, email FROM users', (err, results) => {
    if (err) {
      console.error('Users list DB error:', err);
      return res.status(500).json({ message: 'DB error', error: err.message });
    }
    res.json({ users: results });
  });
});

// --- Health Check ---
app.get('/healthz', (req, res) => {
  res.status(200).send('Auth Service healthy');
});

module.exports = app;

// Start the server if run directly (not when required for test)
/* istanbul ignore next */
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Auth Service running on 0.0.0.0:${PORT}`);
  });
}
