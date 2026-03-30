/**
 * Product controller
 * Handles product-related request logic
 */

const productService = require('../services/product.service');

const productController = {
  /**
   * Get all products
   * @route GET /products
   */
  getAllProducts: async (req, res, next) => {
    try {
      const products = await productService.fetchAllProducts();
      
      res.status(200).json({
        success: true,
        count: products.length,
        data: products
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = productController;
