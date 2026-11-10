const reviewsModule = require('../modules/reviews.module');
const restaurantsModule = require('../modules/restaurants.module');

// GET /api/restaurants/:id/reviews -- newest first
async function getForRestaurant(req, res) {
  if (!(await restaurantsModule.findById(req.validatedId))) return res.status(404).json({ error: 'Restaurant not found' });

  const reviews = await reviewsModule.findByRestaurant(req.validatedId);
  res.json(reviews);
}

// POST /api/restaurants/:id/reviews { rating, tradition_rating, comment }
// the author is the logged-in user (req.user), never a user_id sent in the body
async function createReview(req, res) {
  if (!(await restaurantsModule.findById(req.validatedId))) return res.status(404).json({ error: 'Restaurant not found' });

  const review = await reviewsModule.create(req.user.id, req.validatedId, req.body);
  if (!review) return res.status(409).json({ error: 'You already reviewed this restaurant, edit your review instead' });
  res.status(201).json(review);
}

// PUT /api/reviews/:id -- only the author can edit it
async function replaceReview(req, res) {
  const review = await reviewsModule.findById(req.validatedId);
  if (!review) return res.status(404).json({ error: 'Review not found' });
  if (review.user_id !== req.user.id) return res.status(403).json({ error: 'You can only edit your own reviews' });

  const updated = await reviewsModule.replace(review.id, req.body);
  res.json(updated);
}

// DELETE /api/reviews/:id -- the author or an admin
async function deleteReview(req, res) {
  const review = await reviewsModule.findById(req.validatedId);
  if (!review) return res.status(404).json({ error: 'Review not found' });
  if (review.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'You can only delete your own reviews' });
  }

  await reviewsModule.remove(review.id);
  res.status(204).end();
}

module.exports = { getForRestaurant, createReview, replaceReview, deleteReview };
