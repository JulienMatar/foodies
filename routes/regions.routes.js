const express = require('express');

const regionsController = require('../controller/regions.controller');

const router = express.Router();

router.get('/', regionsController.getAll);

module.exports = router;
