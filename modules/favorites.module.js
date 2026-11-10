const pool = require('./db');

// the favorite dishes of a user, the last one saved first
async function findByUser(userId) {
  const { rows } = await pool.query(
    `SELECT d.*, c.name AS category, f.created_at AS saved_at
     FROM favorites f
     JOIN dishes d ON d.id = f.dish_id
     JOIN categories c ON c.id = d.category_id
     WHERE f.user_id = $1
     ORDER BY f.created_at DESC`,
    [userId]
  );
  return rows;
}

// saves a dish. Returns undefined if it was already a favorite
async function add(userId, dishId) {
  const { rows } = await pool.query(
    `INSERT INTO favorites (user_id, dish_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, dish_id) DO NOTHING
     RETURNING *`,
    [userId, dishId]
  );
  return rows[0];
}

// removes a favorite; returns true if it existed
async function remove(userId, dishId) {
  const { rowCount } = await pool.query(
    'DELETE FROM favorites WHERE user_id = $1 AND dish_id = $2',
    [userId, dishId]
  );
  return rowCount > 0;
}

module.exports = { findByUser, add, remove };
