/**
 * User controller
 * Handles user-related request logic
 */

const userService = require('../services/user.service');

const userController = {
  /**
   * Get all users
   * @route GET /users
   */
  getAllUsers: async (req, res, next) => {
    try {
      const users = await userService.fetchAllUsers();
      
      res.status(200).json({
        success: true,
        count: users.length,
        data: users
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = userController;
