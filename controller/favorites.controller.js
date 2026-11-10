const favoritesModule = require('../modules/favorites.module');
const dishesModule = require('../modules/dishes.module');

// GET /api/favorites -- the dishes saved by the logged-in user
async function getMine(req, res) {
  const favorites = await favoritesModule.findByUser(req.user.id);
  res.json(favorites);
}

// POST /api/favorites/:dishId
async function addFavorite(req, res) {
  if (!(await dishesModule.findById(req.validatedDishId))) return res.status(404).json({ error: 'Dish not found' });

  const favorite = await favoritesModule.add(req.user.id, req.validatedDishId);
  if (!favorite) return res.status(409).json({ error: 'This dish is already in your favorites' });
  res.status(201).json(favorite);
}

// DELETE /api/favorites/:dishId
async function removeFavorite(req, res) {
  const deleted = await favoritesModule.remove(req.user.id, req.validatedDishId);
  if (!deleted) return res.status(404).json({ error: 'This dish is not in your favorites' });
  res.status(204).end();
}

module.exports = { getMine, addFavorite, removeFavorite };
