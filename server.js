// loads the variables from .env (PORT, the database, the secrets) into process.env.
// online there is no .env file: the host sets the variables itself, so a missing file is fine
try {
  process.loadEnvFile();
} catch {
  console.log('No .env file, using the environment variables of the host');
}

const { once } = require('events');
const app = require('./app');
const pool = require('./modules/db');

const PORT = process.env.PORT || 4040;

// the login tokens can't be signed without a secret, and a short one can be guessed
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET is missing or too short in .env (32 characters minimum, see .env.example)');
  process.exit(1);
}

if (!process.env.OPENAI_API_KEY) {
  console.log('OPENAI_API_KEY is not set: Ask Teta answers with the built-in rules (no AI)');
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

    // when the host stops or restarts the app (SIGTERM) or we press Ctrl+C (SIGINT):
    // finish the requests in progress, close the database connections, then exit
    const shutdown = (signal) => {
      console.log(`${signal} received, closing the server`);
      server.close(async () => {
        await pool.end();
        process.exit(0);
      });
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();
