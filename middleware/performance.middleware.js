/**
 * Performance tracking middleware
 * Automatically tracks response time and metrics for all API requests
 * Filters out system/internal endpoints to focus on business APIs
 */

const performanceService = require('../services/performance.service');

// System endpoints to exclude from performance tracking
const IGNORED_ROUTES = [
  '/favicon.ico',
  '/metrics',
  '/metrics/stats',
  '/metrics/slow',
  '/metrics/comparison',
  '/analysis',
  '/analysis/critical',
  '/analysis/summary',
  '/health',
  '/cache/stats',
  '/cache/keys',
  '/cache/enable',
  '/cache/disable',
  '/cache/clear'
];

const performanceMiddleware = (req, res, next) => {
  // Skip tracking for system/internal endpoints
  const shouldIgnore = IGNORED_ROUTES.some(route => req.originalUrl.startsWith(route));
  
  if (shouldIgnore) {
    console.log(`⏭️  [Performance] Skipping tracking for system endpoint: ${req.method} ${req.originalUrl}`);
    return next();
  }

  // Capture request start time with high precision
  const startTime = process.hrtime();

  // Store original end function
  const originalEnd = res.end;

  // Override res.end to capture response completion
  res.end = function(...args) {
    // Calculate response time in milliseconds
    const hrTime = process.hrtime(startTime);
    const responseTime = parseFloat((hrTime[0] * 1000 + hrTime[1] / 1000000).toFixed(2));

    // Create performance log object
    const performanceLog = {
      endpoint: req.originalUrl,
      method: req.method,
      responseTime: responseTime,
      statusCode: res.statusCode,
      timestamp: new Date().toISOString(),
      fromCache: req.fromCache || false // Track if response was from cache
    };

    // Store the log synchronously to avoid race conditions
    performanceService.addLog(performanceLog);

    // Log to console for visibility
    const cacheIndicator = req.fromCache ? '💾 CACHED' : '🔄 DB';
    const statusEmoji = res.statusCode >= 500 ? '❌' : res.statusCode >= 400 ? '⚠️' : '✅';
    console.log(`⚡ [Performance] ${statusEmoji} ${req.method} ${req.originalUrl} - ${responseTime}ms - ${res.statusCode} ${cacheIndicator}`);

    // Call original end function
    originalEnd.apply(res, args);
  };

  next();
};

module.exports = performanceMiddleware;
