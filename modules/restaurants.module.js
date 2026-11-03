const pool = require('./db');

// all restaurants with their region name
async function findAll() {
  const { rows } = await pool.query(
    `SELECT r.*, g.name AS region
     FROM restaurants r
     JOIN regions g ON g.id = r.region_id
     ORDER BY r.name`
  );
  return rows;
}

// one restaurant, or undefined if the id doesn't exist
async function findById(id) {
  const { rows } = await pool.query(
    `SELECT r.*, g.name AS region
     FROM restaurants r
     JOIN regions g ON g.id = r.region_id
     WHERE r.id = $1`,
    [id]
  );
  return rows[0];
}

// inserts a restaurant and returns it with its new id
async function create(r) {
  const { rows } = await pool.query(
    `INSERT INTO restaurants (name, region_id, address, phone, lat, lng, price_level, style)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [r.name, r.region_id, r.address, r.phone, r.lat, r.lng, r.price_level, r.style]
  );
  return rows[0];
}

// replaces a restaurant; returns undefined if the id doesn't exist
async function replace(id, r) {
  const { rows } = await pool.query(
    `UPDATE restaurants
     SET name = $1, region_id = $2, address = $3, phone = $4, lat = $5, lng = $6, price_level = $7, style = $8
     WHERE id = $9
     RETURNING *`,
    [r.name, r.region_id, r.address, r.phone, r.lat, r.lng, r.price_level, r.style, id]
  );
  return rows[0];
}

// deletes a restaurant; returns true if it existed
async function remove(id) {
  const { rowCount } = await pool.query('DELETE FROM restaurants WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = { findAll, findById, create, replace, remove };
