// shared helpers for the tests (run them with: npm test)
//
// every test file gets its OWN empty database (foodies_test_<name>), filled with db/schema.sql and db/seed.sql,
// and deleted at the end. so the tests never touch the real "foodies" database, and the files can run at the same time.
// node --test runs each file in its own process: the rate-limit counters are not shared between files either.

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// .env gives the PostgreSQL user and password (the same ones as for the real database)
try {
  process.loadEnvFile(path.join(__dirname, '..', '.env'));
} catch {
  // no .env (e.g. on a CI server): the PG... variables come from the environment
}

// safety: with DATABASE_URL the app would connect to the hosted database (Neon) and the tests would wipe it
if (process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is set: the tests only run on a local PostgreSQL. Close this terminal or remove it first.');
}

// the tests don't need real secrets
process.env.JWT_SECRET = process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32
  ? process.env.JWT_SECRET
  : 'test-secret-only-used-by-the-tests-0123456789';
delete process.env.OPENAI_API_KEY; // Teta answers with her rules: the same answer every time, and free
process.env.NODE_ENV = 'test';

// a connection to the "postgres" database, to create and delete the test databases
function adminClient() {
  return new Client({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT) || 5432,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: 'postgres',
  });
}

// creates foodies_test_<name> with the tables and the sample data, then starts the app on a free port.
// returns { url, pool, close }
async function startTestApp(name) {
  const dbName = `foodies_test_${name}`;
  if (!/^foodies_test_[a-z_]+$/.test(dbName)) throw new Error(`bad test database name: ${dbName}`);

  const admin = adminClient();
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`);
  await admin.query(`CREATE DATABASE ${dbName}`);
  await admin.end();

  // the app reads PGDATABASE when modules/db.js is loaded, so set it before require('../app')
  process.env.PGDATABASE = dbName;
  const pool = require('../modules/db');
  for (const file of ['schema.sql', 'seed.sql']) {
    await pool.query(fs.readFileSync(path.join(__dirname, '..', 'db', file), 'utf8'));
  }

  const app = require('../app');
  const server = app.listen(0); // 0 = any free port
  await new Promise((resolve) => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;

  async function close() {
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
    const again = adminClient();
    await again.connect();
    await again.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`);
    await again.end();
  }

  return { url, pool, close };
}

// a tiny browser: remembers the login cookie between requests, like the real site does.
//   const maya = client(url); await maya.login('maya@foodies.test', 'Password123!');
//   const { status, body, headers } = await maya.get('/api/favorites');
function client(baseUrl) {
  let cookie = null;

  async function request(method, urlPath, body, extraHeaders = {}) {
    const headers = { ...extraHeaders };
    if (cookie) headers.Cookie = cookie;
    let payload;
    if (body !== undefined) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
      payload = typeof body === 'string' ? body : JSON.stringify(body);
    }
    const res = await fetch(baseUrl + urlPath, { method, headers, body: payload, redirect: 'manual' });

    const setCookie = res.headers.get('set-cookie');
    if (setCookie && setCookie.startsWith('token=')) {
      const value = setCookie.split(';')[0];
      cookie = value === 'token=' ? null : value; // logout sends an empty cookie
    }
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = null; }
    return { status: res.status, body: json, text, headers: res.headers, setCookie };
  }

  return {
    get: (p, h) => request('GET', p, undefined, h),
    post: (p, b, h) => request('POST', p, b, h),
    put: (p, b, h) => request('PUT', p, b, h),
    delete: (p, h) => request('DELETE', p, undefined, h),
    async login(email, password) {
      const res = await request('POST', '/api/auth/login', { email, password });
      if (res.status !== 200) throw new Error(`login failed for ${email}: ${res.status} ${res.text}`);
      return res;
    },
    hasCookie: () => Boolean(cookie),
  };
}

// the sample accounts of db/seed.sql
const ACCOUNTS = {
  admin: ['admin@foodies.test', 'Admin123!'],
  maya: ['maya@foodies.test', 'Password123!'],
  tom: ['tom@foodies.test', 'Password123!'],
};

module.exports = { startTestApp, client, ACCOUNTS };
