const express = require('express');

const chatController = require('../controller/chat.controller');
const validateChat = require('../middlewares/validateChat');
const { chatLimit } = require('../middlewares/rateLimit');
const { optionalUser } = require('../middlewares/auth');

const router = express.Router();

// public, but rate-limited: 6 questions per minute per visitor.
// optionalUser: if someone is logged in, chat_logs saves who asked
router.post('/', chatLimit, optionalUser, validateChat, chatController.ask);
router.get('/status', chatController.status);

module.exports = router;
