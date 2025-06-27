const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());

// All microservice routes with correct rewrites
const routes = [
  // ---- Auth Service ----
  {
    path: '/api/auth',
    target: 'http://auth-service:3001',
    pathRewrite: { '^/api/auth': '' }
  },
  {
    path: '/api/auth/*',
    target: 'http://auth-service:3001',
    pathRewrite: { '^/api/auth': '' }
  },
  // ---- Products Service ----
  {
    path: '/api/products',
    target: 'http://product-service:3002',
    pathRewrite: { '^/api/products': '/products' }
  },
  {
    path: '/api/products/*',
    target: 'http://product-service:3002',
    pathRewrite: { '^/api/products': '/products' }
  },
  // ---- Cart Service ----
  {
    path: '/api/cart',
    target: 'http://cart-service:3003',
    pathRewrite: { '^/api/cart': '/cart' }
  },
  {
    path: '/api/cart/*',
    target: 'http://cart-service:3003',
    pathRewrite: { '^/api/cart': '/cart' }
  },
  // ---- Orders Service ----
  {
    path: '/api/orders',
    target: 'http://order-service:3004',
    pathRewrite: { '^/api/orders': '/orders' }
  },
  {
    path: '/api/orders/*',
    target: 'http://order-service:3004',
    pathRewrite: { '^/api/orders': '/orders' }
  },
  // ---- Order-Items (if you need) ----
  {
    path: '/api/order-items',
    target: 'http://order-service:3004',
    pathRewrite: { '^/api/order-items': '/order-items' }
  },
  {
    path: '/api/order-items/*',
    target: 'http://order-service:3004',
    pathRewrite: { '^/api/order-items': '/order-items' }
  },
  // ---- Payment Service ----
  {
    path: '/api/payment',
    target: 'http://payment-service:3005',
    pathRewrite: { '^/api/payment': '/payment' }
  },
  {
    path: '/api/payment/*',
    target: 'http://payment-service:3005',
    pathRewrite: { '^/api/payment': '/payment' }
  },
  // ---- Notification Service ----
  {
    path: '/api/notify',
    target: 'http://notification-service:3006',
    pathRewrite: { '^/api/notify': '/notify' }
  },
  {
    path: '/api/notify/*',
    target: 'http://notification-service:3006',
    pathRewrite: { '^/api/notify': '/notify' }
  },
  // ---- Catalog/Categories Service ----
  {
    path: '/api/categories',
    target: 'http://catalog-service:3008',
    pathRewrite: { '^/api/categories': '/categories' }
  },
  {
    path: '/api/categories/*',
    target: 'http://catalog-service:3008',
    pathRewrite: { '^/api/categories': '/categories' }
  },
  // ---- Promotions Service ----
  {
    path: '/api/promotions',
    target: 'http://promo-service:3007',
    pathRewrite: { '^/api/promotions': '/promotions' }
  },
  {
    path: '/api/promotions/*',
    target: 'http://promo-service:3007',
    pathRewrite: { '^/api/promotions': '/promotions' }
  }
];

// Proxy registration (must be before express.json())
routes.forEach(({ path, target, pathRewrite }) => {
  app.use(path, createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: pathRewrite ? pathRewrite : (pathReq, req) => pathReq,
    logLevel: 'warn'
  }));
});

app.use(express.json());

// Request logger
app.use((req, res, next) => {
  console.log('Gateway received:', req.method, req.url);
  next();
});

// Health check for ALB/K8s
app.get('/api/healthz', (req, res) => {
  res.status(200).send('✅ UshaSree Industries API Gateway is healthy');
});

// Root health check (optional, for debugging)
app.get('/', (req, res) => {
  res.send('✅ UshaSree Industries API Gateway is running');
});

const PORT = process.env.PORT || 3000;

// For tests, export the app. For prod, listen if run directly.
/* istanbul ignore next */
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 UshaSree API Gateway running on port ${PORT}`);
  });
}

module.exports = app;
