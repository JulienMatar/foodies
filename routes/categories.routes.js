const express = require('express');

const categoriesController = require('../controller/categories.controller');

const router = express.Router();

router.get('/', categoriesController.getAll);

module.exports = router;
