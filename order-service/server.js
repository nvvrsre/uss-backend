/**
 * Order Service - Handles order placement, retrieval, and notifications.
 * Uses in-memory storage (no DB required).
 */

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(cors());

// --- In-memory storage ---
let orders = [];
let orderItems = [];
let orderId = 1;
let orderItemId = 1;

const USE_PROMO_SERVICE = process.env.USE_PROMO_SERVICE === 'true';

/**
 * Place an order.
 */
app.post('/orders', async (req, res) => {
  try {
    const { user_id, items, total, address, name, email, coupon_code } = req.body;

    // Input validation
    if (!user_id || !items || !Array.isArray(items) || items.length === 0 || !total || !address || !name || !email) {
      return res.status(400).json({ message: 'All fields required (user_id, items, total, address, name, email)' });
    }

    // --- Promotions Integration (optional) ---
    let discount = 0, final_amount, applied_promos = [];
    if (USE_PROMO_SERVICE) {
      try {
        const product_count = items.length;
        const promoRes = await axios.post(
          'http://api-gateway:3000/promotions/apply',
          {
            user_id,
            cart_total: total,
            product_count,
            code: coupon_code || null
          },
          { timeout: 2000 }
        );
        discount = promoRes.data.total_discount || 0;
        final_amount = promoRes.data.final_amount || (total - discount);
        applied_promos = promoRes.data.applied_promos || [];
      } catch (e) {
        // Log but don't fail the order
        // console.error("Promotion service error:", e.code || e.message || e);
        final_amount = total;
        applied_promos = [];
      }
    } else {
      discount = 0;
      final_amount = total;
      applied_promos = [];
    }

    // --- Store Order ---
    const newOrder = {
      id: orderId++,
      user_id,
      total,
      address,
      status: 'PLACED',
      discount,
      final_amount,
      applied_promos,
      created_at: new Date().toISOString()
    };
    orders.push(newOrder);

    // --- Store Order Items ---
    items.forEach(item => {
      orderItems.push({
        id: orderItemId++,
        order_id: newOrder.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price
      });
    });

    // --- Send Order Notification ---
    try {
      // Do not fail main flow if notification fails
      await axios.post('http://notification-service:3006/notify', {
        email,
        subject: 'Order Placed Successfully - UshaSree Stores',
        message: `Hi ${name},\n\nThank you for your order!\nOrder ID: ${newOrder.id}\nTotal: ₹${final_amount}\n\nWe will notify you when your order is shipped.`,
        name
      });
    } catch (notifyErr) {
      // Logging for debugging (replace console.log with a logger in production)
      // console.error('Failed to send order notification:', notifyErr.message);
    }

    return res.json({
      message: 'Order placed',
      order_id: newOrder.id,
      total,
      discount,
      final_amount,
      applied_promos
    });
  } catch (err) {
    // console.error("Global error in /orders:", err);
    if (!res.headersSent) res.status(500).json({ message: 'Unknown server error' });
  }
});

/**
 * Get all orders for a user (with items).
 */
app.get('/orders', (req, res) => {
  const user_id = req.query.user_id;
  if (!user_id) return res.status(400).json({ message: "user_id required" });

  const userOrders = orders.filter(o => o.user_id === Number(user_id));
  const enrichedOrders = userOrders.map(order => ({
    ...order,
    items: orderItems.filter(item => item.order_id === order.id)
  }));
  res.json(enrichedOrders);
});

/**
 * Get orders by userId (no items).
 */
app.get('/orders/:userId', (req, res) => {
  const results = orders.filter(o => o.user_id === Number(req.params.userId));
  res.json({ orders: results });
});

/**
 * Get order-items for an order.
 */
app.get('/order-items/:orderId', (req, res) => {
  const results = orderItems.filter(i => i.order_id === Number(req.params.orderId));
  res.json({ items: results });
});

/**
 * Health check.
 */
app.get('/healthz', (req, res) => {
  res.status(200).send('Order Service healthy');
});

/**
 * Global error handler.
 */
/* eslint-disable no-unused-vars */
app.use((err, req, res, next) => {
  // console.error('Unhandled error:', err);
  if (!res.headersSent) {
    res.status(500).json({ message: 'Unhandled server error' });
  }
});
/* eslint-enable no-unused-vars */

const PORT = process.env.PORT || 3004;
if (require.main === module) {
  app.listen(PORT, () => {
    // console.log(
    //   `🚀 Order service running on port ${PORT} (no DB required) [Promo:${USE_PROMO_SERVICE ? 'on' : 'off'}]`
    // );
  });
}
module.exports = app;
