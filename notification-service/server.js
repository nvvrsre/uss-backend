// server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(cors());

const USE_REAL_DB = process.env.USE_REAL_DB === 'true';
const USE_REAL_AUTH = process.env.USE_REAL_AUTH === 'true';
const isTest = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'coverage';

let notifyRequests = [];
let notifyId = 1;

let db = null;
// The DB code will not affect your dev/test workflow, only runs if env is set
if (USE_REAL_DB) {
  const mysql = require('mysql2');
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
      `CREATE TABLE IF NOT EXISTS notify_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(100) NOT NULL,
        search_term VARCHAR(100) NOT NULL,
        notified TINYINT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      (err) => {
        if (err) console.error('❌ Table creation error:', err);
        else console.log('✅ notify_requests table ready');
      }
    );
  });
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

function sendEmail(to, subject, message, customerName = "") {
  const mailOptions = {
    from: `"UshaSree Stores" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text: message,
    html: `<div style="font-family:sans-serif;max-width:500px">
      <h2 style="color:#0e67ae;margin-bottom:6px;">${subject}</h2>
      <p>Hi${customerName ? " " + customerName : ""},</p>
      <div style="background:#f6f8fa;padding:16px;border-radius:8px;margin:18px 0 12px 0;">
        <pre style="font-family:inherit;white-space:pre-line;margin:0">${message}</pre>
      </div>
      <br/>
      <div style="font-size:14px;color:#444;">-- Team UshaSree<br/><span style="color:#bbb;">This is an automated confirmation from UshaSree Stores.</span></div>
    </div>`
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.error('❌ Error sending email:', error);
    }
    console.log('📧 Email sent:', info.response);
  });
}

function sendSMS(phone, message) {
  console.log(`📱 SMS to ${phone} | Message: ${message}`);
}

// --- HEALTH CHECK ---
app.get('/healthz', (req, res) => {
  res.status(200).send('Notification Service healthy');
});

// --- NOTIFY endpoint (send emails by user_id or email) ---
app.post('/notify', async (req, res) => {
  const { email, phone, subject, message, name, user_id } = req.body;
  if (!email && !phone && !user_id) {
    return res.status(400).json({ message: 'Email, phone, or user_id required' });
  }
  if (!message) {
    return res.status(400).json({ message: 'Message required' });
  }

  let userEmail = email;
  // --- User email lookup ---
  if (!userEmail && user_id) {
    if (USE_REAL_AUTH) {
      try {
        const response = await axios.get(`http://auth-service:3001/users`);
        const users = response.data.users;
        const user = users.find(u => u.id == user_id);
        if (user) {
          userEmail = user.email;
        } else {
          return res.status(404).json({ message: "User not found" });
        }
      } catch (err) {
        return res.status(500).json({ message: 'Could not fetch user email' });
      }
    } else {
      userEmail = `user${user_id}@example.com`;
    }
  }

  const realSubject = subject || "UshaSree Stores Notification";
  if (userEmail) sendEmail(userEmail, realSubject, message, name || "");
  if (phone) sendSMS(phone, message);

  res.json({ message: 'Notification sent' + (USE_REAL_DB ? '' : ' (dev mode, no DB)') });
});

// --- "Notify Me" endpoint: Save request to in-memory array or real DB ---
app.post('/notify-me', (req, res) => {
  const { email, term } = req.body;
  if (!email || !term) {
    return res.status(400).json({ message: 'Email and search term required' });
  }
  if (USE_REAL_DB) {
    const sql = 'INSERT INTO notify_requests (email, search_term) VALUES (?, ?)';
    db.query(sql, [email, term], (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Error saving request' });
      }
      res.json({ message: 'Request saved! You’ll be notified when available.' });
    });
  } else {
    const reqObj = {
      id: notifyId++,
      email,
      search_term: term,
      notified: 0,
      created_at: new Date().toISOString()
    };
    notifyRequests.push(reqObj);
    res.json({ message: 'Request saved! (dev mode, no DB)', request: reqObj });
  }
});

// --- (DEV ONLY) List all notify-me requests ---
app.get('/notify-me/all', (req, res) => {
  if (USE_REAL_DB) {
    return res.status(400).json({ message: 'Not available with real DB' });
  }
  res.json({ count: notifyRequests.length, requests: notifyRequests });
});

// --- (DEV ONLY) Clear all notify-me requests ---
app.delete('/notify-me/all', (req, res) => {
  if (USE_REAL_DB) {
    return res.status(400).json({ message: 'Not available with real DB' });
  }
  notifyRequests = [];
  res.json({ message: 'All notify-me requests cleared.' });
});

// For Jest tests: Allow resetting in-memory state for full test isolation
app.resetInMemory = function() {
  notifyRequests = [];
  notifyId = 1;
};

const PORT = process.env.PORT || 3006;
/* istanbul ignore next */
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(
      `🚀 Notification service running on port ${PORT} [DB: ${USE_REAL_DB ? 'REAL' : 'MEM'}][AUTH: ${USE_REAL_AUTH ? 'REAL' : 'MOCK'}]`
    );
  });
}

module.exports = app;
