/**
 * Cache middleware
 * Automatically caches API responses to improve performance
 */

const cacheService = require('../services/cache.service');

/**
 * Create cache middleware with configurable TTL
 * @param {number} ttl - Time to live in seconds (default: 60)
 * @returns {Function} Express middleware function
 */
const cacheMiddleware = (ttl = 60) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip caching for certain endpoints
    const skipPaths = ['/metrics', '/analysis', '/cache'];
    if (skipPaths.some(path => req.originalUrl.startsWith(path))) {
      return next();
    }

    // Generate cache key from request URL
    const cacheKey = req.originalUrl;

    // Check if response is cached
    const cachedResponse = cacheService.get(cacheKey);

    if (cachedResponse) {
      // Mark as cached in response
      res.set('X-Cache', 'HIT');
      res.set('X-Cache-Key', cacheKey);
      
      // Add fromCache flag for performance tracking
      req.fromCache = true;
      
      console.log(`💾 [Cache HIT] ${req.method} ${req.originalUrl}`);
      
      return res.status(200).json(cachedResponse);
    }

    // Cache miss - mark for tracking
    res.set('X-Cache', 'MISS');
    req.fromCache = false;

    // Store original res.json function
    const originalJson = res.json.bind(res);

    // Override res.json to cache the response
    res.json = function(data) {
      // Only cache successful responses
      if (res.statusCode === 200) {
        cacheService.set(cacheKey, data, ttl);
        console.log(`💾 [Cache MISS - Stored] ${req.method} ${req.originalUrl} (TTL: ${ttl}s)`);
      }

      // Call original json function
      return originalJson(data);
    };

    next();
  };
};

/**
 * Smart cache middleware that uses analysis insights
 * Automatically caches high-traffic endpoints
 */
const smartCacheMiddleware = (req, res, next) => {
  // Only cache GET requests
  if (req.method !== 'GET') {
    return next();
  }

  // Skip caching for certain endpoints
  const skipPaths = ['/metrics', '/analysis', '/cache'];
  if (skipPaths.some(path => req.originalUrl.startsWith(path))) {
    return next();
  }

  // Generate cache key
  const cacheKey = req.originalUrl;

  // Check cache
  const cachedResponse = cacheService.get(cacheKey);

  if (cachedResponse) {
    res.set('X-Cache', 'HIT');
    res.set('X-Cache-Key', cacheKey);
    req.fromCache = true;
    
    console.log(`💾 [Smart Cache HIT] ${req.method} ${req.originalUrl}`);
    
    return res.status(200).json(cachedResponse);
  }

  // Cache miss
  res.set('X-Cache', 'MISS');
  req.fromCache = false;

  // Store original res.json
  const originalJson = res.json.bind(res);

  // Override res.json
  res.json = function(data) {
    if (res.statusCode === 200) {
      // Smart TTL based on endpoint
      let ttl = 60; // default 60 seconds
      
      // Longer TTL for data endpoints
      if (req.originalUrl.includes('/users')) ttl = 120;
      if (req.originalUrl.includes('/products')) ttl = 180;
      if (req.originalUrl.includes('/orders')) ttl = 90;
      
      cacheService.set(cacheKey, data, ttl);
      console.log(`💾 [Smart Cache MISS - Stored] ${req.method} ${req.originalUrl} (TTL: ${ttl}s)`);
    }

    return originalJson(data);
  };

  next();
};

module.exports = {
  cacheMiddleware,
  smartCacheMiddleware
};
