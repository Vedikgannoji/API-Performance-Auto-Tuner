/**
 * Express app configuration
 * Sets up middleware and routes
 */

const express = require('express');
const cors = require('cors');
const config = require('./config');

// Import middleware
const loggingMiddleware = require('../middleware/logging.middleware');
const performanceMiddleware = require('../middleware/performance.middleware');
const { smartCacheMiddleware } = require('../middleware/cache.middleware');
const errorHandler = require('../middleware/error.middleware');

// Import routes
const userRoutes = require('../routes/user.routes');
const productRoutes = require('../routes/product.routes');
const orderRoutes = require('../routes/order.routes');
const healthRoutes = require('../routes/health.routes');
const metricsRoutes = require('../routes/metrics.routes');
const analysisRoutes = require('../routes/analysis.routes');
const cacheRoutes = require('../routes/cache.routes');

const app = express();

// Middleware setup
app.use(cors({ origin: config.corsOrigin })); // Enable CORS
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Serve static files from public directory
app.use(express.static('public'));

app.use(loggingMiddleware); // Custom logging middleware
app.use(smartCacheMiddleware); // Smart caching middleware (before performance tracking)
app.use(performanceMiddleware); // Performance tracking middleware

// Routes
app.use('/health', healthRoutes);
app.use('/users', userRoutes);
app.use('/products', productRoutes);
app.use('/orders', orderRoutes);
app.use('/metrics', metricsRoutes);
app.use('/analysis', analysisRoutes);
app.use('/cache', cacheRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;
