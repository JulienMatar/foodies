const express = require('express');

const restaurantsController = require('../controller/restaurants.controller');
const reviewsController = require('../controller/reviews.controller');
const validateId = require('../middlewares/validateId');
const validateDishId = require('../middlewares/validateDishId');
const validateRestaurant = require('../middlewares/validateRestaurant');
const validateReview = require('../middlewares/validateReview');
const { validateRestaurantFilters } = require('../middlewares/validateFilters');
const { validateAddDish, validateUpdateDish } = require('../middlewares/validateAvailability');
const { requireUser, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

// public
router.get('/', validateRestaurantFilters, restaurantsController.getAll);
router.get('/:id', validateId, restaurantsController.getById);

// admin only
router.post('/', requireUser, requireAdmin, validateRestaurant, restaurantsController.createRestaurant);
router.put('/:id', requireUser, requireAdmin, validateId, validateRestaurant, restaurantsController.replaceRestaurant);
router.delete('/:id', requireUser, requireAdmin, validateId, restaurantsController.deleteRestaurant);

// availability: which dishes this restaurant serves (admin only)
router.post('/:id/dishes', requireUser, requireAdmin, validateId, validateAddDish, restaurantsController.addDish);
router.put('/:id/dishes/:dishId', requireUser, requireAdmin, validateId, validateDishId, validateUpdateDish, restaurantsController.updateDish);
router.delete('/:id/dishes/:dishId', requireUser, requireAdmin, validateId, validateDishId, restaurantsController.removeDish);

// reviews of this restaurant: anyone can read, logged-in users can write
router.get('/:id/reviews', validateId, reviewsController.getForRestaurant);
router.post('/:id/reviews', requireUser, validateId, validateReview, reviewsController.createReview);

module.exports = router;
