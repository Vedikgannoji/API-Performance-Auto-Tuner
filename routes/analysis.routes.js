/**
 * Analysis routes
 * Defines all performance analysis endpoints
 */

const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysis.controller');

// GET /analysis - Get all performance insights
router.get('/', analysisController.getAllInsights);

// GET /analysis/critical - Get only high severity insights
router.get('/critical', analysisController.getCriticalInsights);

// GET /analysis/summary - Get analysis summary
router.get('/summary', analysisController.getSummary);

module.exports = router;
