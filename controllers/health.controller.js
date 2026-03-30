/**
 * Health controller
 * Handles health check logic
 */

const healthService = require('../services/health.service');

const healthController = {
  /**
   * Check server health status
   * @route GET /health
   */
  checkHealth: (req, res) => {
    try {
      const healthStatus = healthService.getHealthStatus();
      res.status(200).json(healthStatus);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Health check failed'
      });
    }
  }
};

module.exports = healthController;
