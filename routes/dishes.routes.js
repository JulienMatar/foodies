const express = require('express');

const dishesController = require('../controller/dishes.controller');
const validateId = require('../middlewares/validateId');
const validateDish = require('../middlewares/validateDish');

const router = express.Router();

router.get('/', dishesController.getAll);
router.get('/:id', validateId, dishesController.getById);
router.post('/', validateDish, dishesController.createDish);
router.put('/:id', validateId, validateDish, dishesController.replaceDish);
router.delete('/:id', validateId, dishesController.deleteDish);

module.exports = router;
