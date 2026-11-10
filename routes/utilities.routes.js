const express = require('express');

const utilitiesController = require('../controller/utilities.controller');

const router = express.Router();

router.get('/dish-of-the-day', utilitiesController.getDishOfTheDay);
router.get('/rates', utilitiesController.getExchangeRates);

module.exports = router;
