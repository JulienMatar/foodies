const express = require('express');

const restaurantsController = require('../controller/restaurants.controller');
const validateId = require('../middlewares/validateId');
const validateRestaurant = require('../middlewares/validateRestaurant');

const router = express.Router();

router.get('/', restaurantsController.getAll);
router.get('/:id', validateId, restaurantsController.getById);
router.post('/', validateRestaurant, restaurantsController.createRestaurant);
router.put('/:id', validateId, validateRestaurant, restaurantsController.replaceRestaurant);
router.delete('/:id', validateId, restaurantsController.deleteRestaurant);

module.exports = router;
