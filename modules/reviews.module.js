const pool = require('./db');

// the reviews of a restaurant with the author's name, newest first
async function findByRestaurant(restaurantId) {
  const { rows } = await pool.query(
    `SELECT v.*, u.name AS author
     FROM reviews v
     JOIN users u ON u.id = v.user_id
     WHERE v.restaurant_id = $1
     ORDER BY v.created_at DESC, v.id DESC`,
    [restaurantId]
  );
  return rows;
}

// one review, or undefined
async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM reviews WHERE id = $1', [id]);
  return rows[0];
}

// adds a review. Returns undefined if this user already reviewed this restaurant
// (the table allows one review per user per restaurant)
async function create(userId, restaurantId, review) {
  const { rows } = await pool.query(
    `INSERT INTO reviews (user_id, restaurant_id, rating, tradition_rating, comment)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, restaurant_id) DO NOTHING
     RETURNING *`,
    [userId, restaurantId, review.rating, review.tradition_rating, review.comment ?? null]
  );
  return rows[0];
}

// replaces the content of a review and sets updated_at
async function replace(id, review) {
  const { rows } = await pool.query(
    `UPDATE reviews
     SET rating = $1, tradition_rating = $2, comment = $3, updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [review.rating, review.tradition_rating, review.comment ?? null, id]
  );
  return rows[0];
}

// deletes a review; returns true if it existed
async function remove(id) {
  const { rowCount } = await pool.query('DELETE FROM reviews WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = { findByRestaurant, findById, create, replace, remove };
