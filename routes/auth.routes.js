const express = require('express');

const authController = require('../controller/auth.controller');
const { requireUser } = require('../middlewares/auth');
const { validateRegister, validateLogin } = require('../middlewares/validateAuth');

const router = express.Router();

router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);
router.post('/logout', requireUser, authController.logout);
router.get('/me', requireUser, authController.me);
router.get('/google', authController.googleStart);
router.get('/google/callback', authController.googleCallback);

module.exports = router;
