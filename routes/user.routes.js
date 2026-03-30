/**
 * User routes
 * Defines all user-related endpoints
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');

// GET /users - Get all users
router.get('/', userController.getAllUsers);

module.exports = router;
