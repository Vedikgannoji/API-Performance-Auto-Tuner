/**
 * Analysis service
 * Evaluates performance data and generates intelligent optimization suggestions
 */

const performanceService = require('./performance.service');

const analysisService = {
  /**
   * Analyze all performance logs and generate insights
   * @returns {Array} Array of insight objects
   */
  analyzePerformance: () => {
    const logs = performanceService.getAllLogs();
    
    if (logs.length === 0) {
      return [];
    }

    const insights = [];

    // Run all analysis rules
    insights.push(...analysisService.detectSlowEndpoints(logs));
    insights.push(...analysisService.detectHighTraffic(logs));
    insights.push(...analysisService.detectRepeatedSlowEndpoints(logs));
    insights.push(...analysisService.detectErrorRates(logs));
    insights.push(...analysisService.detectVerySlowEndpoints(logs));

    // Sort by severity (high -> medium -> low)
    const severityOrder = { high: 0, medium: 1, low: 2 };
    insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return insights;
  },

  /**
   * Get only critical (high severity) insights
   * @returns {Array} Array of high severity insights
   */
  getCriticalInsights: () => {
    const allInsights = analysisService.analyzePerformance();
    return allInsights.filter(insight => insight.severity === 'high');
  },

  /**
   * Rule 1: Detect slow endpoints (500ms - 1000ms)
   * @param {Array} logs - Performance logs
   * @returns {Array} Insights for slow endpoints
   */
  detectSlowEndpoints: (logs) => {
    const insights = [];
    const endpointStats = {};

    // Group logs by endpoint
    logs.forEach(log => {
      const key = `${log.method} ${log.endpoint}`;
      if (!endpointStats[key]) {
        endpointStats[key] = {
          endpoint: log.endpoint,
          method: log.method,
          slowCount: 0,
          totalCount: 0,
          avgTime: 0,
          totalTime: 0
        };
      }
      
      endpointStats[key].totalCount++;
      endpointStats[key].totalTime += log.responseTime;
      
      if (log.responseTime > 500 && log.responseTime <= 1000) {
        endpointStats[key].slowCount++;
      }
    });

    // Generate insights for endpoints with slow responses
    Object.keys(endpointStats).forEach(key => {
      const stats = endpointStats[key];
      stats.avgTime = stats.totalTime / stats.totalCount;

      // If more than 30% of requests are slow
      if (stats.slowCount > 0 && (stats.slowCount / stats.totalCount) > 0.3) {
        insights.push({
          endpoint: `${stats.method} ${stats.endpoint}`,
          issue: `Slow response time detected (avg: ${stats.avgTime.toFixed(2)}ms)`,
          severity: 'medium',
          suggestion: 'Optimize database queries or enable caching',
          details: {
            slowRequestCount: stats.slowCount,
            totalRequests: stats.totalCount,
            averageResponseTime: parseFloat(stats.avgTime.toFixed(2))
          }
        });
      }
    });

    return insights;
  },

  /**
   * Rule 2: Detect very slow endpoints (> 1000ms)
   * @param {Array} logs - Performance logs
   * @returns {Array} Insights for very slow endpoints
   */
  detectVerySlowEndpoints: (logs) => {
    const insights = [];
    const endpointStats = {};

    // Group logs by endpoint
    logs.forEach(log => {
      const key = `${log.method} ${log.endpoint}`;
      if (!endpointStats[key]) {
        endpointStats[key] = {
          endpoint: log.endpoint,
          method: log.method,
          verySlowCount: 0,
          totalCount: 0,
          maxTime: 0
        };
      }
      
      endpointStats[key].totalCount++;
      endpointStats[key].maxTime = Math.max(endpointStats[key].maxTime, log.responseTime);
      
      if (log.responseTime > 1000) {
        endpointStats[key].verySlowCount++;
      }
    });

    // Generate insights for endpoints with very slow responses
    Object.keys(endpointStats).forEach(key => {
      const stats = endpointStats[key];

      if (stats.verySlowCount > 0) {
        insights.push({
          endpoint: `${stats.method} ${stats.endpoint}`,
          issue: `Critical performance issue (max: ${stats.maxTime.toFixed(2)}ms)`,
          severity: 'high',
          suggestion: 'Immediate optimization required - check database queries, add indexes, or implement caching',
          details: {
            criticalRequestCount: stats.verySlowCount,
            totalRequests: stats.totalCount,
            maxResponseTime: parseFloat(stats.maxTime.toFixed(2))
          }
        });
      }
    });

    return insights;
  },

  /**
   * Rule 3: Detect high traffic endpoints
   * @param {Array} logs - Performance logs
   * @returns {Array} Insights for high traffic endpoints
   */
  detectHighTraffic: (logs) => {
    const insights = [];
    const endpointCounts = {};

    // Count requests per endpoint
    logs.forEach(log => {
      const key = `${log.method} ${log.endpoint}`;
      endpointCounts[key] = (endpointCounts[key] || 0) + 1;
    });

    // Generate insights for high traffic endpoints
    Object.keys(endpointCounts).forEach(key => {
      const count = endpointCounts[key];
      
      if (count > 50) {
        insights.push({
          endpoint: key,
          issue: `High traffic detected (${count} requests)`,
          severity: 'low',
          suggestion: 'Enable caching (Redis/CDN) to reduce server load',
          details: {
            requestCount: count
          }
        });
      }
    });

    return insights;
  },

  /**
   * Rule 4: Detect repeated slow endpoints
   * @param {Array} logs - Performance logs
   * @returns {Array} Insights for repeatedly slow endpoints
   */
  detectRepeatedSlowEndpoints: (logs) => {
    const insights = [];
    const slowLogs = logs.filter(log => log.responseTime > 500);
    const endpointSlowCounts = {};

    // Count slow requests per endpoint
    slowLogs.forEach(log => {
      const key = `${log.method} ${log.endpoint}`;
      if (!endpointSlowCounts[key]) {
        endpointSlowCounts[key] = {
          count: 0,
          totalTime: 0
        };
      }
      endpointSlowCounts[key].count++;
      endpointSlowCounts[key].totalTime += log.responseTime;
    });

    // Generate insights for endpoints that are frequently slow
    Object.keys(endpointSlowCounts).forEach(key => {
      const stats = endpointSlowCounts[key];
      
      // If endpoint appears in slow logs more than 5 times
      if (stats.count >= 5) {
        const avgSlowTime = stats.totalTime / stats.count;
        
        insights.push({
          endpoint: key,
          issue: `Consistently slow performance (${stats.count} slow requests)`,
          severity: 'medium',
          suggestion: 'Consider database indexing, query optimization, or adding read replicas',
          details: {
            slowRequestCount: stats.count,
            averageSlowTime: parseFloat(avgSlowTime.toFixed(2))
          }
        });
      }
    });

    return insights;
  },

  /**
   * Rule 5: Detect high error rates
   * @param {Array} logs - Performance logs
   * @returns {Array} Insights for high error rates
   */
  detectErrorRates: (logs) => {
    const insights = [];
    const endpointStats = {};

    // Group logs by endpoint and count errors
    logs.forEach(log => {
      const key = `${log.method} ${log.endpoint}`;
      if (!endpointStats[key]) {
        endpointStats[key] = {
          totalCount: 0,
          errorCount: 0,
          errors: []
        };
      }
      
      endpointStats[key].totalCount++;
      
      if (log.statusCode >= 500) {
        endpointStats[key].errorCount++;
        endpointStats[key].errors.push({
          statusCode: log.statusCode,
          timestamp: log.timestamp
        });
      }
    });

    // Generate insights for endpoints with high error rates
    Object.keys(endpointStats).forEach(key => {
      const stats = endpointStats[key];
      const errorRate = (stats.errorCount / stats.totalCount) * 100;

      // If error rate > 10% or more than 3 errors
      if (stats.errorCount > 0 && (errorRate > 10 || stats.errorCount >= 3)) {
        insights.push({
          endpoint: key,
          issue: `High error rate detected (${errorRate.toFixed(1)}%)`,
          severity: 'high',
          suggestion: 'Investigate server errors immediately - check logs, database connections, and external dependencies',
          details: {
            errorCount: stats.errorCount,
            totalRequests: stats.totalCount,
            errorRate: parseFloat(errorRate.toFixed(1)),
            recentErrors: stats.errors.slice(-3) // Last 3 errors
          }
        });
      }
    });

    return insights;
  },

  /**
   * Get summary of analysis
   * @returns {Object} Summary statistics
   */
  getAnalysisSummary: () => {
    const insights = analysisService.analyzePerformance();
    
    const summary = {
      totalInsights: insights.length,
      bySeverity: {
        high: insights.filter(i => i.severity === 'high').length,
        medium: insights.filter(i => i.severity === 'medium').length,
        low: insights.filter(i => i.severity === 'low').length
      },
      byIssueType: {
        slowEndpoints: insights.filter(i => i.issue.includes('Slow')).length,
        criticalPerformance: insights.filter(i => i.issue.includes('Critical')).length,
        highTraffic: insights.filter(i => i.issue.includes('High traffic')).length,
        consistentlySlow: insights.filter(i => i.issue.includes('Consistently')).length,
        errors: insights.filter(i => i.issue.includes('error')).length
      },
      recommendations: {
        cachingNeeded: insights.filter(i => i.suggestion.includes('caching')).length,
        databaseOptimization: insights.filter(i => i.suggestion.includes('database') || i.suggestion.includes('indexing')).length,
        immediateAction: insights.filter(i => i.severity === 'high').length
      }
    };

    return summary;
  }
};

module.exports = analysisService;
