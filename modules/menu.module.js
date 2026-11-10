const pool = require('./db');

// the menu = the restaurant_dishes table: which restaurant serves which dish, and at what price
// (price_usd is NUMERIC, which pg sends as a string: ::float makes it a JS number)

// the menu of a restaurant, sorted by category then dish name
async function findByRestaurant(restaurantId) {
  const { rows } = await pool.query(
    `SELECT d.id AS dish_id, d.slug, d.name_en, d.name_ar, d.is_vegetarian, d.is_vegan, c.name AS category,
            rd.price_usd::float AS price_usd, rd.available
     FROM restaurant_dishes rd
     JOIN dishes d ON d.id = rd.dish_id
     JOIN categories c ON c.id = d.category_id
     WHERE rd.restaurant_id = $1
     ORDER BY c.name, d.name_en`,
    [restaurantId]
  );
  return rows;
}

// puts a dish on a menu. Returns undefined if it is already there
// (ON CONFLICT DO NOTHING skips the insert instead of throwing an error)
async function add(restaurantId, item) {
  const { rows } = await pool.query(
    `INSERT INTO restaurant_dishes (restaurant_id, dish_id, price_usd, available)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (restaurant_id, dish_id) DO NOTHING
     RETURNING restaurant_id, dish_id, price_usd::float AS price_usd, available`,
    [restaurantId, item.dish_id, item.price_usd, item.available ?? true]
  );
  return rows[0];
}

// changes the price and/or availability; a field that is not sent keeps its value
// (COALESCE returns the first value that is not null). Returns undefined if the dish is not on the menu
async function update(restaurantId, dishId, changes) {
  const { rows } = await pool.query(
    `UPDATE restaurant_dishes
     SET price_usd = COALESCE($1, price_usd), available = COALESCE($2, available)
     WHERE restaurant_id = $3 AND dish_id = $4
     RETURNING restaurant_id, dish_id, price_usd::float AS price_usd, available`,
    [changes.price_usd ?? null, changes.available ?? null, restaurantId, dishId]
  );
  return rows[0];
}

// takes a dish off a menu; returns true if it was there
async function remove(restaurantId, dishId) {
  const { rowCount } = await pool.query(
    'DELETE FROM restaurant_dishes WHERE restaurant_id = $1 AND dish_id = $2',
    [restaurantId, dishId]
  );
  return rowCount > 0;
}

module.exports = { findByRestaurant, add, update, remove };
