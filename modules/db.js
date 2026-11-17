const { Pool } = require('pg');

// connection to PostgreSQL, shared by all the modules.
// on our computers the values come from .env (PGHOST, PGUSER...).
// online, hosts like Render, Neon or Supabase give one DATABASE_URL instead,
// and their databases need an encrypted (SSL) connection
const pool = process.env.DATABASE_URL
  ? new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false },
    max: 10,
  })
  : new Pool({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    max: 10, // at most 10 connections open at the same time
  });

module.exports = pool;
