const restaurantsModule = require('../modules/restaurants.module');

async function getAll(req, res) {
  const restaurants = await restaurantsModule.findAll();
  res.json(restaurants);
}

async function getById(req, res) {
  const restaurant = await restaurantsModule.findById(req.validatedId);
  if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
  res.json(restaurant);
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

module.exports = { getAll, getById, createRestaurant, replaceRestaurant, deleteRestaurant };
