const pool = require('./db');

// all dish categories, sorted by name
async function findAll() {
  const { rows } = await pool.query('SELECT id, name FROM categories ORDER BY name');
  return rows;
}

module.exports = { findAll };
