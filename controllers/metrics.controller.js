/**
 * Metrics controller
 * Handles performance metrics request logic
 */

const performanceService = require('../services/performance.service');

const metricsController = {
  /**
   * Get all performance logs
   * @route GET /metrics
   */
  getAllMetrics: (req, res) => {
    try {
      const logs = performanceService.getAllLogs();
      
      res.status(200).json({
        success: true,
        count: logs.length,
        data: logs
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve metrics'
      });
    }
  },

  /**
   * Get slow API requests (response time > 500ms)
   * @route GET /metrics/slow
   */
  getSlowMetrics: (req, res) => {
    try {
      // Allow custom threshold via query parameter
      const threshold = parseInt(req.query.threshold) || 500;
      const slowLogs = performanceService.getSlowLogs(threshold);
      
      res.status(200).json({
        success: true,
        threshold: `${threshold}ms`,
        count: slowLogs.length,
        data: slowLogs
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve slow metrics'
      });
    }
  },

  /**
   * Get performance statistics
   * @route GET /metrics/stats
   */
  getStats: (req, res) => {
    try {
      const stats = performanceService.getStats();
      
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve statistics'
      });
    }
  },

  /**
   * Clear all performance logs
   * @route DELETE /metrics
   */
  clearMetrics: (req, res) => {
    try {
      const result = performanceService.clearLogs();
      
      // Send response first
      res.status(200).json({
        success: true,
        ...result
      });
      
      // Note: This DELETE request itself won't be tracked because
      // the performance middleware filters out /metrics endpoints
      console.log('🗑️  [Metrics] All performance logs cleared');
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to clear metrics'
      });
    }
  },

  /**
   * Get performance comparison between cached and non-cached requests
   * @route GET /metrics/comparison
   */
  getComparison: (req, res) => {
    try {
      const comparison = performanceService.getComparison();
      
      res.status(200).json({
        success: true,
        data: comparison
      });
    } catch (error) {
      console.error('Error getting comparison:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve performance comparison'
      });
    }
  }
};

module.exports = metricsController;
