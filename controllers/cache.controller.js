/**
 * Cache controller
 * Handles cache management requests
 */

const cacheService = require('../services/cache.service');

const cacheController = {
  /**
   * Enable caching globally
   * @route POST /cache/enable
   */
  enableCache: (req, res) => {
    try {
      const result = cacheService.enable();
      
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error enabling cache:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to enable cache'
      });
    }
  },

  /**
   * Disable caching globally
   * @route POST /cache/disable
   */
  disableCache: (req, res) => {
    try {
      const result = cacheService.disable();
      
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error disabling cache:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to disable cache'
      });
    }
  },

  /**
   * Clear all cache
   * @route DELETE /cache/clear
   */
  clearCache: (req, res) => {
    try {
      const result = cacheService.clear();
      
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error clearing cache:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to clear cache'
      });
    }
  },

  /**
   * Get cache statistics
   * @route GET /cache/stats
   */
  getCacheStats: (req, res) => {
    try {
      const stats = cacheService.getStats();
      
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting cache stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve cache statistics'
      });
    }
  },

  /**
   * Get all cache keys
   * @route GET /cache/keys
   */
  getCacheKeys: (req, res) => {
    try {
      const keys = cacheService.getKeys();
      
      res.status(200).json({
        success: true,
        count: keys.length,
        data: keys
      });
    } catch (error) {
      console.error('Error getting cache keys:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve cache keys'
      });
    }
  },

  /**
   * Delete specific cache entry
   * @route DELETE /cache/:key
   */
  deleteCacheEntry: (req, res) => {
    try {
      const key = decodeURIComponent(req.params.key);
      const deleted = cacheService.delete(key);
      
      if (deleted) {
        res.status(200).json({
          success: true,
          message: 'Cache entry deleted',
          key: key
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Cache entry not found',
          key: key
        });
      }
    } catch (error) {
      console.error('Error deleting cache entry:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete cache entry'
      });
    }
  }
};

module.exports = cacheController;
