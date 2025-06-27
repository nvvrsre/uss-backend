/**
 * Product Service - In-memory, no DB, SonarQube-compliant, with debug logs
 */
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const productsData = require('./productsData'); // Array of products

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// --- In-memory products table ---
let products = Array.isArray(productsData) ? [...productsData] : [];

/**
 * Health Check Endpoint
 */
app.get('/health', (req, res) => {
  res.json({ status: 'UP' });
});

/**
 * Get all products
 */
app.get('/products', (req, res) => {
  res.json(products);
});

/**
 * Get a single product by ID
 */
app.get('/products/:id', (req, res) => {
  const product = products.find(p => String(p.id) === String(req.params.id));
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }
  res.json(product);
});

/**
 * Helper: Validate Product Fields (does not reject 0 or empty string)
 */
function validateProductFields(obj) {
  const requiredFields = ['id', 'title', 'description', 'price', 'image', 'category'];
  return requiredFields.every(
    field => obj[field] !== undefined && obj[field] !== null
  );
}

/**
 * Create Product
 */
app.post('/products', (req, res) => {
  const prod = req.body;
  console.log("Received for creation:", prod); // Debug log
  console.log("Current products:", products);  // Debug log

  if (!validateProductFields(prod)) {
    return res.status(400).json({ message: "All fields required" });
  }
  if (products.find(p => String(p.id) === String(prod.id))) {
    return res.status(400).json({ message: "Product ID already exists" });
  }
  products.push(prod);
  res.status(201).json(prod);
});

/**
 * Update Product
 */
app.put('/products/:id', (req, res) => {
  const idx = products.findIndex(p => String(p.id) === String(req.params.id));
  if (idx === -1) {
    return res.status(404).json({ message: "Product not found" });
  }
  const updated = { ...products[idx], ...req.body, id: products[idx].id }; // Prevent ID change
  products[idx] = updated;
  res.json(updated);
});

/**
 * Delete Product
 */
app.delete('/products/:id', (req, res) => {
  const idx = products.findIndex(p => String(p.id) === String(req.params.id));
  if (idx === -1) {
    return res.status(404).json({ message: "Product not found" });
  }
  products.splice(idx, 1);
  res.json({ message: "Deleted" });
});

/**
 * Reset Products (for tests/dev only)
 */
app.post('/products/reset', (req, res) => {
  products = Array.isArray(productsData) ? [...productsData] : [];
  console.log("Products after reset:", products); // Debug log
  res.json({ message: "Products reset to initial state" });
});

if (require.main === module) {
  app.listen(PORT, () => {
    // console.log(`🚀 Product service running on port ${PORT} (in-memory, no DB)`);
  });
}
module.exports = app;
