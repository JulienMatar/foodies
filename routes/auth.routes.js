const express = require('express');

const authController = require('../controller/auth.controller');
const { requireUser } = require('../middlewares/auth');
const { validateRegister, validateLogin } = require('../middlewares/validateAuth');
const { authLimit } = require('../middlewares/rateLimit');

const router = express.Router();

// authLimit: 10 tries per 15 minutes per visitor, so passwords can't be guessed by trying thousands of them
router.post('/register', authLimit, validateRegister, authController.register);
router.post('/login', authLimit, validateLogin, authController.login);
router.post('/logout', requireUser, authController.logout);
router.get('/me', requireUser, authController.me);
router.get('/google/status', authController.googleStatus);
router.get('/google', authController.googleStart);
router.get('/google/callback', authController.googleCallback);

module.exports = router;
