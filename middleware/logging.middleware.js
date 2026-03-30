/**
 * Logging middleware
 * Logs all incoming requests with method, URL, and timestamp
 */

const loggingMiddleware = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl;
  
  console.log(`[${timestamp}] ${method} ${url}`);
  
  next();
};

module.exports = loggingMiddleware;
