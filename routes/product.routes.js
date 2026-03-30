/**
 * Product routes
 * Defines all product-related endpoints
 */

const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');

// GET /products - Get all products
router.get('/', productController.getAllProducts);

module.exports = router;
