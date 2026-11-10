// loads the variables from .env (PORT and the database settings) into process.env
process.loadEnvFile();

const { once } = require('events');
const app = require('./app');
const pool = require('./modules/db');

const PORT = process.env.PORT || 4040;

// the login tokens can't be signed without a secret
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing in .env (see .env.example)');
  process.exit(1);
}

// checks that PostgreSQL answers, then starts the server.
// once() waits for the 'listening' event; if 'error' fires first
// (e.g. the port is already in use), catch runs.
async function startServer() {
  try {
    await pool.query('SELECT 1');
    console.log('Connected to PostgreSQL');

    const server = app.listen(PORT);
    await once(server, 'listening');
    console.log(`Foodies API running on http://localhost:${PORT}`);
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();
