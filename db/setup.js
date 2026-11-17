// creates the tables and adds the sample data: runs db/schema.sql then db/seed.sql
//   npm run db:setup
// useful online, where there is no DBeaver: point DATABASE_URL (or PGHOST...) at the hosted database first.
// WARNING: schema.sql drops the tables first, so this deletes all the data of that database.

try {
  process.loadEnvFile();
} catch {
  // no .env file: the variables come from the host
}

const fs = require('fs');
const path = require('path');
const pool = require('../modules/db');

async function run() {
  for (const file of ['schema.sql', 'seed.sql']) {
    const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
    await pool.query(sql); // a query without $1 placeholders can hold many statements
    console.log(`${file} done`);
  }
  await pool.end();
}

run().catch((err) => {
  console.error('Database setup failed:', err.message);
  process.exit(1);
});
