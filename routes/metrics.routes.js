/**
 * Metrics routes
 * Defines all performance metrics endpoints
 */

const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metrics.controller');

// GET /metrics - Get all performance logs
router.get('/', metricsController.getAllMetrics);

// GET /metrics/slow - Get slow API requests (> 500ms)
router.get('/slow', metricsController.getSlowMetrics);

// GET /metrics/stats - Get performance statistics
router.get('/stats', metricsController.getStats);

// GET /metrics/comparison - Get cache performance comparison
router.get('/comparison', metricsController.getComparison);

// DELETE /metrics - Clear all performance logs
router.delete('/', metricsController.clearMetrics);

module.exports = router;
