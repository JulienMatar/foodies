const pool = require('./db');

// $1, $2... are placeholders: the values are sent separately from the SQL,
// so user input can't change the query (no SQL injection)

// all dishes with their category name
async function findAll() {
  const { rows } = await pool.query(
    `SELECT d.*, c.name AS category
     FROM dishes d
     JOIN categories c ON c.id = d.category_id
     ORDER BY d.name_en`
  );
  return rows;
}

// one dish, or undefined if the id doesn't exist
async function findById(id) {
  const { rows } = await pool.query(
    `SELECT d.*, c.name AS category
     FROM dishes d
     JOIN categories c ON c.id = d.category_id
     WHERE d.id = $1`,
    [id]
  );
  return rows[0];
}

// inserts a dish and returns it with its new id
async function create(dish) {
  const { rows } = await pool.query(
    `INSERT INTO dishes (name_en, name_ar, description, category_id, is_vegetarian, weather)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [dish.name_en, dish.name_ar, dish.description, dish.category_id, dish.is_vegetarian, dish.weather]
  );
  return rows[0];
}

// replaces a dish; returns undefined if the id doesn't exist
async function replace(id, dish) {
  const { rows } = await pool.query(
    `UPDATE dishes
     SET name_en = $1, name_ar = $2, description = $3, category_id = $4, is_vegetarian = $5, weather = $6
     WHERE id = $7
     RETURNING *`,
    [dish.name_en, dish.name_ar, dish.description, dish.category_id, dish.is_vegetarian, dish.weather, id]
  );
  return rows[0];
}

// deletes a dish; returns true if it existed
async function remove(id) {
  const { rowCount } = await pool.query('DELETE FROM dishes WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = { findAll, findById, create, replace, remove };
