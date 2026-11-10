const express = require('express');

const reviewsController = require('../controller/reviews.controller');
const validateId = require('../middlewares/validateId');
const validateReview = require('../middlewares/validateReview');
const { requireUser } = require('../middlewares/auth');

const router = express.Router();

// the controller checks that the user is the author (or an admin, for DELETE)
router.put('/:id', requireUser, validateId, validateReview, reviewsController.replaceReview);
router.delete('/:id', requireUser, validateId, reviewsController.deleteReview);

module.exports = router;
