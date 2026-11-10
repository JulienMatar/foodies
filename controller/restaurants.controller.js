const restaurantsModule = require('../modules/restaurants.module');
const menuModule = require('../modules/menu.module');
const dishesModule = require('../modules/dishes.module');

// GET /api/restaurants?dish=&region=&style=&sort=  (req.filters comes from validateRestaurantFilters)
async function getAll(req, res) {
  const restaurants = await restaurantsModule.findAll(req.filters);
  res.json(restaurants);
}

// GET /api/restaurants/:id -- the restaurant + its scores + its menu with prices
async function getById(req, res) {
  const restaurant = await restaurantsModule.findById(req.validatedId);
  if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

  const menu = await menuModule.findByRestaurant(restaurant.id);
  res.json({ ...restaurant, menu });
}

async function createRestaurant(req, res) {
  const restaurant = await restaurantsModule.create(req.body);
  res.status(201).json(restaurant); // 201 Created
}

async function replaceRestaurant(req, res) {
  const restaurant = await restaurantsModule.replace(req.validatedId, req.body);
  if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
  res.json(restaurant);
}

async function deleteRestaurant(req, res) {
  const deleted = await restaurantsModule.remove(req.validatedId);
  if (!deleted) return res.status(404).json({ error: 'Restaurant not found' });
  res.status(204).end(); // 204 No Content
}

// ---------- availability: which restaurant serves which dish ----------

// POST /api/restaurants/:id/dishes { dish_id, price_usd, available }
async function addDish(req, res) {
  const restaurantId = req.validatedId;
  if (!(await restaurantsModule.findById(restaurantId))) return res.status(404).json({ error: 'Restaurant not found' });
  if (!(await dishesModule.findById(req.body.dish_id))) return res.status(404).json({ error: 'Dish not found' });

  const item = await menuModule.add(restaurantId, req.body);
  if (!item) return res.status(409).json({ error: 'This dish is already on the menu, use PUT to change it' });
  res.status(201).json(item);
}

// PUT /api/restaurants/:id/dishes/:dishId { price_usd?, available? }
async function updateDish(req, res) {
  const item = await menuModule.update(req.validatedId, req.validatedDishId, req.body);
  if (!item) return res.status(404).json({ error: 'This dish is not on the menu of this restaurant' });
  res.json(item);
}

// DELETE /api/restaurants/:id/dishes/:dishId
async function removeDish(req, res) {
  const deleted = await menuModule.remove(req.validatedId, req.validatedDishId);
  if (!deleted) return res.status(404).json({ error: 'This dish is not on the menu of this restaurant' });
  res.status(204).end();
}

module.exports = {
  getAll, getById, createRestaurant, replaceRestaurant, deleteRestaurant,
  addDish, updateDish, removeDish,
};
