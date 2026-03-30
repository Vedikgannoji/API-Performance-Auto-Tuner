/**
 * Performance service
 * Manages storage and retrieval of performance metrics
 */

// In-memory storage for performance logs
let performanceLogs = [];

const performanceService = {
  /**
   * Add a new performance log entry
   * @param {Object} log - Performance log object
   */
  addLog: (log) => {
    performanceLogs.push(log);
  },

  /**
   * Get performance comparison between cached and non-cached requests
   * @returns {Object} Performance comparison statistics
   */
  getComparison: () => {
    if (performanceLogs.length === 0) {
      return {
        totalRequests: 0,
        cachedRequests: 0,
        nonCachedRequests: 0,
        avgResponseTimeWithCache: 0,
        avgResponseTimeWithoutCache: 0,
        improvementPercentage: 0,
        improvementMs: 0
      };
    }

    // Separate cached and non-cached requests
    const cachedLogs = performanceLogs.filter(log => log.fromCache === true);
    const nonCachedLogs = performanceLogs.filter(log => log.fromCache === false);

    // Calculate averages
    const avgCached = cachedLogs.length > 0
      ? cachedLogs.reduce((sum, log) => sum + log.responseTime, 0) / cachedLogs.length
      : 0;

    const avgNonCached = nonCachedLogs.length > 0
      ? nonCachedLogs.reduce((sum, log) => sum + log.responseTime, 0) / nonCachedLogs.length
      : 0;

    // Calculate improvement
    const improvementMs = avgNonCached - avgCached;
    const improvementPercentage = avgNonCached > 0
      ? ((improvementMs / avgNonCached) * 100)
      : 0;

    return {
      totalRequests: performanceLogs.length,
      cachedRequests: cachedLogs.length,
      nonCachedRequests: nonCachedLogs.length,
      avgResponseTimeWithCache: parseFloat(avgCached.toFixed(2)),
      avgResponseTimeWithoutCache: parseFloat(avgNonCached.toFixed(2)),
      improvementPercentage: parseFloat(improvementPercentage.toFixed(2)),
      improvementMs: parseFloat(improvementMs.toFixed(2))
    };
  },

  /**
   * Get all performance logs
   * @returns {Array} All performance logs
   */
  getAllLogs: () => {
    return performanceLogs;
  },

  /**
   * Get slow API requests (response time > threshold)
   * @param {number} threshold - Response time threshold in ms (default: 500ms)
   * @returns {Array} Filtered logs of slow requests
   */
  getSlowLogs: (threshold = 500) => {
    return performanceLogs.filter(log => log.responseTime > threshold);
  },

  /**
   * Get performance statistics
   * @returns {Object} Aggregated performance statistics
   */
  getStats: () => {
    if (performanceLogs.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        slowRequestCount: 0,
        fastestRequest: null,
        slowestRequest: null,
        endpointStats: {}
      };
    }

    // Calculate total requests
    const totalRequests = performanceLogs.length;

    // Calculate average response time
    const totalResponseTime = performanceLogs.reduce((sum, log) => sum + log.responseTime, 0);
    const averageResponseTime = parseFloat((totalResponseTime / totalRequests).toFixed(2));

    // Count slow requests (> 500ms)
    const slowRequestCount = performanceLogs.filter(log => log.responseTime > 500).length;

    // Find fastest and slowest requests
    const sortedByTime = [...performanceLogs].sort((a, b) => a.responseTime - b.responseTime);
    const fastestRequest = sortedByTime[0];
    const slowestRequest = sortedByTime[sortedByTime.length - 1];

    // Calculate per-endpoint statistics
    const endpointStats = {};
    performanceLogs.forEach(log => {
      const key = `${log.method} ${log.endpoint}`;
      if (!endpointStats[key]) {
        endpointStats[key] = {
          count: 0,
          totalTime: 0,
          avgTime: 0,
          minTime: Infinity,
          maxTime: 0
        };
      }
      
      endpointStats[key].count++;
      endpointStats[key].totalTime += log.responseTime;
      endpointStats[key].minTime = Math.min(endpointStats[key].minTime, log.responseTime);
      endpointStats[key].maxTime = Math.max(endpointStats[key].maxTime, log.responseTime);
    });

    // Calculate average for each endpoint
    Object.keys(endpointStats).forEach(key => {
      endpointStats[key].avgTime = parseFloat(
        (endpointStats[key].totalTime / endpointStats[key].count).toFixed(2)
      );
      delete endpointStats[key].totalTime; // Remove intermediate calculation
    });

    return {
      totalRequests,
      averageResponseTime,
      slowRequestCount,
      fastestRequest,
      slowestRequest,
      endpointStats
    };
  },

  /**
   * Clear all performance logs (useful for testing)
   * @returns {Object} Confirmation message
   */
  clearLogs: () => {
    const count = performanceLogs.length;
    performanceLogs = [];
    return {
      message: 'Performance logs cleared',
      clearedCount: count
    };
  }
};

module.exports = performanceService;
