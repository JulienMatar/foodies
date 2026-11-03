const pool = require('./db');

// all regions, sorted by name
async function findAll() {
  const { rows } = await pool.query('SELECT id, name FROM regions ORDER BY name');
  return rows;
}

module.exports = { findAll };
