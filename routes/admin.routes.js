const express = require('express');

const adminController = require('../controller/admin.controller');
const validatePage = require('../middlewares/validatePage');
const { requireUser, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

// every admin route: logged in (401) and admin (403)
router.use(requireUser, requireAdmin);

router.get('/stats', adminController.getStats);
router.get('/chat-logs', validatePage, adminController.getChatLogs);

module.exports = router;
