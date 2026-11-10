const express = require('express');

const favoritesController = require('../controller/favorites.controller');
const validateDishId = require('../middlewares/validateDishId');
const { requireUser } = require('../middlewares/auth');

const router = express.Router();

// every favorites route needs a logged-in user
router.use(requireUser);

router.get('/', favoritesController.getMine);
router.post('/:dishId', validateDishId, favoritesController.addFavorite);
router.delete('/:dishId', validateDishId, favoritesController.removeFavorite);

module.exports = router;
