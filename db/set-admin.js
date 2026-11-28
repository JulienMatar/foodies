// sets the admin account: YOUR email and password, typed in the terminal (the password is hidden).
//   npm run set-admin
// online (Neon), set DATABASE_URL first, like for npm run db:setup:
//   $env:DATABASE_URL="postgresql://..."; npm run set-admin
//
// what it does:
//   1. creates your admin account (or makes an existing account with that email an admin, with the new password)
//   2. deletes the demo admin admin@foodies.test, whose password is public in the README.
//      someone who logged in as that demo admin loses admin access at once:
//      requireAdmin reads the role in the database, and that account is gone
//   3. if you want, deletes the demo users maya@ and tom@ too (their reviews and favorites go with them)
// the password is saved as a bcrypt hash, never as text.

try {
  process.loadEnvFile();
} catch {
  // no .env file: the variables come from the host
}

const readline = require('readline');
const bcrypt = require('bcryptjs');

const DEMO_ADMIN = 'admin@foodies.test';
const DEMO_USERS = ['maya@foodies.test', 'tom@foodies.test'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// the rules for the new admin; returns an error message, or null when everything is fine
function checkAdmin({ name, email, password }) {
  if (typeof name !== 'string' || name.trim() === '' || name.length > 100) return 'The name must be 1 to 100 characters';
  if (typeof email !== 'string' || !EMAIL.test(email) || email.length > 255) return 'That is not a valid email address';
  if (email.toLowerCase() === DEMO_ADMIN || DEMO_USERS.includes(email.toLowerCase())) return 'Use your own email, not a demo account';
  if (typeof password !== 'string' || password.length < 12) return 'The password must be at least 12 characters';
  if (Buffer.byteLength(password) > 72) return 'The password must be 72 bytes at most (bcrypt ignores the rest)';
  if (['Admin123!', 'Password123!'].includes(password)) return 'That password is public in the README, choose another one';
  return null;
}

// does the work in one transaction: everything is saved, or nothing is (if anything fails)
async function setAdmin(pool, { name, email, password, removeDemoUsers = false }) {
  const problem = checkAdmin({ name, email, password });
  if (problem) throw new Error(problem);

  const hash = await bcrypt.hash(password, 10);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // an account with this email already exists: it becomes the admin, with the new password and name
    const { rows } = await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, LOWER($2), $3, 'admin')
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, role = 'admin'
       RETURNING id, name, email, role`,
      [name.trim(), email, hash]
    );
    const removed = await client.query('DELETE FROM users WHERE email = $1 RETURNING email', [DEMO_ADMIN]);
    let removedUsers = [];
    if (removeDemoUsers) {
      removedUsers = (await client.query('DELETE FROM users WHERE email = ANY($1) RETURNING email', [DEMO_USERS])).rows;
    }
    await client.query('COMMIT');
    return { admin: rows[0], removed: [...removed.rows, ...removedUsers].map((r) => r.email) };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ---------- the questions in the terminal ----------

// every line typed is put in a queue, and each question takes the next one
// (so no answer is lost, even when several lines arrive at once)
function lineReader(rl) {
  const lines = [];
  const waiting = [];
  rl.on('line', (line) => (waiting.length ? waiting.shift()(line) : lines.push(line)));
  rl.on('close', () => { while (waiting.length) waiting.shift()(null); });
  return () => new Promise((resolve) => (lines.length ? resolve(lines.shift()) : waiting.push(resolve)));
}

async function ask(rl, nextLine, question) {
  rl.setPrompt(question);
  rl.prompt();
  const line = await nextLine();
  if (line === null) throw new Error('Stopped. Nothing changed.');
  return line.trim();
}

// like ask(), but the letters typed are shown as *
async function askHidden(rl, nextLine, question) {
  rl.output.write(question);
  rl.setPrompt('');
  rl.muted = true;
  rl.prompt();
  const line = await nextLine();
  rl.muted = false;
  if (!rl.terminal) rl.output.write('\n');
  if (line === null) throw new Error('Stopped. Nothing changed.');
  return line;
}

// which database we are about to change, without the password
function describeDatabase() {
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    return `${url.hostname} / ${url.pathname.slice(1)} (DATABASE_URL)`;
  }
  return `${process.env.PGHOST || 'localhost'} / ${process.env.PGDATABASE} (the PG... values of .env)`;
}

async function main() {
  const pool = require('../modules/db');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: Boolean(process.stdin.isTTY) });
  // while muted, every character typed is written as * (the terminal's control codes are kept)
  rl._writeToOutput = (text) => rl.output.write(rl.muted
    ? text.replace(/(\x1b\[[0-9;]*[A-Za-z])|[^\r\n]/g, (match, code) => code || '*')
    : text);
  const nextLine = lineReader(rl);

  try {
    console.log(`\nThis changes the admin of: ${describeDatabase()}`);
    if ((await ask(rl, nextLine, 'Continue? (y/N) ')).toLowerCase() !== 'y') return console.log('Nothing changed.');

    const name = await ask(rl, nextLine, 'Admin name: ');
    const email = await ask(rl, nextLine, 'Admin email: ');
    const password = await askHidden(rl, nextLine, 'Admin password (12+ characters): ');
    const again = await askHidden(rl, nextLine, 'Same password again: ');
    if (password !== again) throw new Error('The two passwords are different. Nothing changed.');
    const problem = checkAdmin({ name, email, password });
    if (problem) throw new Error(`${problem}. Nothing changed.`);

    const removeDemoUsers = (await ask(rl, nextLine, 'Also delete the demo users maya@ and tom@ (their reviews and favorites too)? (y/N) ')).toLowerCase() === 'y';
    const { admin, removed } = await setAdmin(pool, { name, email, password, removeDemoUsers });

    console.log(`\nDone. Admin: ${admin.name} <${admin.email}>`);
    console.log(removed.length ? `Deleted: ${removed.join(', ')}` : 'No demo account to delete.');
    console.log('Sign in on the site with your new email and password.');
  } catch (err) {
    console.error(`\n${err.message}`);
    process.exitCode = 1;
  } finally {
    rl.close();
    await pool.end();
  }
}

// run the questions only when started with "node db/set-admin.js" (the tests only use setAdmin)
if (require.main === module) main();

module.exports = { setAdmin, checkAdmin };
