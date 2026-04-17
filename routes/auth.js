const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  register,
  registerValidation,
  login,
  loginValidation,
  getMe,
  getDistrictHeads,
  getFieldWorkers,
} = require('../controllers/authController');

// POST /api/auth/register
router.post('/register', registerValidation, register);

// POST /api/auth/login
router.post('/login', loginValidation, login);

// GET /api/auth/me
router.get('/me', auth, getMe);

// GET /api/auth/district-heads
router.get('/district-heads', auth, getDistrictHeads);

// GET /api/auth/users
router.get('/users', auth, getFieldWorkers);

module.exports = router;
