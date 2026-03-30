/**
 * Main server entry point
 * Initializes Express app and starts the server
 */

const express = require('express');
const app = require('./config/app');
const config = require('./config/config');

const PORT = config.port;

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 Environment: ${config.nodeEnv}`);
  console.log(`🎨 Dashboard: http://localhost:${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Metrics: http://localhost:${PORT}/metrics`);
  console.log(`🔗 Users: http://localhost:${PORT}/users`);
  console.log(`🔗 Products: http://localhost:${PORT}/products`);
  console.log(`🔗 Orders: http://localhost:${PORT}/orders`);
  console.log(`🔗 Analysis: http://localhost:${PORT}/analysis`);
  console.log(`🔗 Slow Metrics: http://localhost:${PORT}/metrics/slow`); 
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  process.exit(1);
});
