const { Pool } = require('pg');

// connection to PostgreSQL, shared by all the modules.
// the values come from .env
const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});

module.exports = pool;
