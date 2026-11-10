const dishesModule = require('../modules/dishes.module');

// GET /api/dishes?search=&category=&vegetarian=  (req.filters comes from validateDishFilters)
async function getAll(req, res) {
  const dishes = await dishesModule.findAll(req.filters);
  res.json(dishes);
}

// GET /api/dishes/:id -- the dish + the restaurants serving it and their prices
async function getById(req, res) {
  const dish = await dishesModule.findById(req.validatedId);
  if (!dish) return res.status(404).json({ error: 'Dish not found' });

  const restaurants = await dishesModule.findRestaurantsServing(dish.id);
  res.json({ ...dish, restaurants });
}

async function createDish(req, res) {
  const dish = await dishesModule.create(req.body);
  res.status(201).json(dish); // 201 Created
}

async function replaceDish(req, res) {
  const dish = await dishesModule.replace(req.validatedId, req.body);
  if (!dish) return res.status(404).json({ error: 'Dish not found' });
  res.json(dish);
}

async function deleteDish(req, res) {
  const deleted = await dishesModule.remove(req.validatedId);
  if (!deleted) return res.status(404).json({ error: 'Dish not found' });
  res.status(204).end(); // 204 No Content -- success, nothing to send back
}

module.exports = { getAll, getById, createDish, replaceDish, deleteDish };
