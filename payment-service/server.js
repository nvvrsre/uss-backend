/**
 * Payment Service - In-memory, no DB, SonarQube-compliant
 */
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(cors());

// --- In-memory storage for payments ---
let payments = [];
let paymentID = 1;

/**
 * POST /payment
 * Processes a payment request.
 */
app.post('/payment', (req, res) => {
  const { user_id, order_id, amount, method, address, card } = req.body;

  // Validation: all required fields present
  if (
    user_id === undefined || user_id === null ||
    order_id === undefined || order_id === null ||
    amount === undefined || amount === null ||
    !method || !address || !card
  ) {
    // Validation failed
    return res.status(400).json({ message: 'All fields required', status: 'failure' });
  }

  // Validation: card details
  if (
    !card.number || card.number.length !== 16 ||
    !card.cvv || card.cvv.length !== 3 ||
    !card.month || card.month.length !== 2 ||
    !card.year || card.year.length !== 2
  ) {
    return res.status(400).json({ message: 'Invalid card details', status: 'failure' });
  }

  // Save payment
  const payment = {
    id: paymentID++,
    user_id,
    order_id,
    amount,
    method,
    address,
    status: 'SUCCESS',
    created_at: new Date().toISOString()
  };
  payments.push(payment);

  res.json({ message: 'Payment successful', payment_id: payment.id, status: 'success' });
});

/**
 * GET /payment/:userId
 * Returns all payments for a user.
 */
app.get('/payment/:userId', (req, res) => {
  const userIdNum = Number(req.params.userId);
  // If not a valid number, return empty (prevents strange userId bugs)
  if (Number.isNaN(userIdNum)) {
    return res.json({ payments: [] });
  }
  const userPayments = payments.filter(p => p.user_id === userIdNum);
  res.json({ payments: userPayments });
});

/**
 * Health check endpoint.
 */
app.get('/healthz', (req, res) => {
  res.status(200).send('Payment Service healthy');
});

const PORT = process.env.PORT || 3005;
if (require.main === module) {
  app.listen(PORT, () => {
    // console.log(`🚀 Payment service running on port ${PORT} (no DB required)`);
  });
}

module.exports = app;
