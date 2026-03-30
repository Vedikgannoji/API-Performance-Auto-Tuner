/**
 * Analysis controller
 * Handles analysis and insights request logic
 */

const analysisService = require('../services/analysis.service');

const analysisController = {
  /**
   * Get all performance insights
   * @route GET /analysis
   */
  getAllInsights: (req, res) => {
    try {
      const insights = analysisService.analyzePerformance();
      const summary = analysisService.getAnalysisSummary();
      
      res.status(200).json({
        success: true,
        summary: summary,
        count: insights.length,
        data: insights
      });
    } catch (error) {
      console.error('Error generating insights:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate insights'
      });
    }
  },

  /**
   * Get only critical (high severity) insights
   * @route GET /analysis/critical
   */
  getCriticalInsights: (req, res) => {
    try {
      const criticalInsights = analysisService.getCriticalInsights();
      
      res.status(200).json({
        success: true,
        severity: 'high',
        count: criticalInsights.length,
        data: criticalInsights,
        message: criticalInsights.length > 0 
          ? 'Critical issues require immediate attention' 
          : 'No critical issues detected'
      });
    } catch (error) {
      console.error('Error getting critical insights:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve critical insights'
      });
    }
  },

  /**
   * Get analysis summary only
   * @route GET /analysis/summary
   */
  getSummary: (req, res) => {
    try {
      const summary = analysisService.getAnalysisSummary();
      
      res.status(200).json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error generating summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate summary'
      });
    }
  }
};

module.exports = analysisController;
