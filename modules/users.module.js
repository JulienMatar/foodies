const pool = require('./db');

// one user, or undefined
async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0];
}

// emails are saved in lowercase, so "Maya@Foodies.test" and "maya@foodies.test" are the same account
async function findByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = LOWER($1)', [email]);
  return rows[0];
}

async function findByGoogleId(googleId) {
  const { rows } = await pool.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
  return rows[0];
}

// account made with the register form (role is 'user' by default)
async function create({ name, email, password_hash }) {
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, LOWER($2), $3)
     RETURNING *`,
    [name, email, password_hash]
  );
  return rows[0];
}

// account made by "Sign in with Google": no password
async function createWithGoogle({ name, email, google_id }) {
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, google_id)
     VALUES ($1, LOWER($2), $3)
     RETURNING *`,
    [name, email, google_id]
  );
  return rows[0];
}

// an existing account (made with a password) signs in with Google for the first time
async function linkGoogle(id, googleId) {
  const { rows } = await pool.query(
    'UPDATE users SET google_id = $1 WHERE id = $2 RETURNING *',
    [googleId, id]
  );
  return rows[0];
}

module.exports = { findById, findByEmail, findByGoogleId, create, createWithGoogle, linkGoogle };
