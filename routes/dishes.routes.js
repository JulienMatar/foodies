const express = require('express');

const dishesController = require('../controller/dishes.controller');
const validateId = require('../middlewares/validateId');
const validateDish = require('../middlewares/validateDish');
const { validateDishFilters } = require('../middlewares/validateFilters');
const { requireUser, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

// public
router.get('/', validateDishFilters, dishesController.getAll);
router.get('/:id', validateId, dishesController.getById);

// admin only: requireUser checks the login (401), requireAdmin the role (403)
router.post('/', requireUser, requireAdmin, validateDish, dishesController.createDish);
router.put('/:id', requireUser, requireAdmin, validateId, validateDish, dishesController.replaceDish);
router.delete('/:id', requireUser, requireAdmin, validateId, dishesController.deleteDish);

module.exports = router;
