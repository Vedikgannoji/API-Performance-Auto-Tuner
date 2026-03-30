/**
 * Health service
 * Business logic for health checks
 */

const healthService = {
  /**
   * Get current health status of the server
   * @returns {Object} Health status object
   */
  getHealthStatus: () => {
    return {
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    };
  }
};

module.exports = healthService;
