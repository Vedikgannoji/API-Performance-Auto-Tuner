/**
 * Cache routes
 * Defines all cache management endpoints
 */

const express = require('express');
const router = express.Router();
const cacheController = require('../controllers/cache.controller');

// POST /cache/enable - Enable caching
router.post('/enable', cacheController.enableCache);

// POST /cache/disable - Disable caching
router.post('/disable', cacheController.disableCache);

// DELETE /cache/clear - Clear all cache
router.delete('/clear', cacheController.clearCache);

// GET /cache/stats - Get cache statistics
router.get('/stats', cacheController.getCacheStats);

// GET /cache/keys - Get all cache keys
router.get('/keys', cacheController.getCacheKeys);

// DELETE /cache/:key - Delete specific cache entry
router.delete('/:key', cacheController.deleteCacheEntry);

module.exports = router;
