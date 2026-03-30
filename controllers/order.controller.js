/**
 * Order controller
 * Handles order-related request logic
 */

const orderService = require('../services/order.service');

const orderController = {
  /**
   * Get all orders
   * @route GET /orders
   */
  getAllOrders: async (req, res, next) => {
    try {
      const orders = await orderService.fetchAllOrders();
      
      res.status(200).json({
        success: true,
        count: orders.length,
        data: orders
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = orderController;
