/**
 * Order routes
 * Defines all order-related endpoints
 */

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');

// GET /orders - Get all orders
router.get('/', orderController.getAllOrders);

module.exports = router;
