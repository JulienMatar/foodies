// npm run set-admin: our own admin replaces the demo admin whose password is public
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestApp, client, ACCOUNTS } = require('./helpers');
const { setAdmin, checkAdmin } = require('../db/set-admin');

let app;
let oldAdmin; // logged in as the demo admin BEFORE the change, like someone who read the README
before(async () => {
  app = await startTestApp('setadmin');
  oldAdmin = client(app.url);
  await oldAdmin.login(...ACCOUNTS.admin);
});
after(() => app.close());

const NEW_ADMIN = { name: 'Julien', email: 'Owner@Example.com', password: 'a-long-private-passphrase' };

test('weak or demo values are refused', () => {
  assert.match(checkAdmin({ ...NEW_ADMIN, password: 'short' }), /12 characters/);
  assert.match(checkAdmin({ ...NEW_ADMIN, password: 'Admin123!' }), /12 characters|public/);
  assert.match(checkAdmin({ ...NEW_ADMIN, email: 'admin@foodies.test' }), /demo/);
  assert.match(checkAdmin({ ...NEW_ADMIN, email: 'not-an-email' }), /valid email/);
  assert.match(checkAdmin({ ...NEW_ADMIN, name: '  ' }), /name/);
  assert.equal(checkAdmin(NEW_ADMIN), null);
});

test('the new admin can sign in and use the admin pages; the demo admin is gone', async () => {
  const { admin, removed } = await setAdmin(app.pool, NEW_ADMIN);
  assert.equal(admin.email, 'owner@example.com');
  assert.equal(admin.role, 'admin');
  assert.deepEqual(removed, ['admin@foodies.test']);

  const owner = client(app.url);
  await owner.login('owner@example.com', NEW_ADMIN.password);
  assert.equal((await owner.get('/api/admin/stats')).status, 200);

  // the old password no longer works
  assert.equal((await client(app.url).post('/api/auth/login', { email: 'admin@foodies.test', password: 'Admin123!' })).status, 401);
  // and someone already logged in as the demo admin loses admin access at once
  assert.equal((await oldAdmin.get('/api/admin/stats')).status, 403);

  // the password is saved as a bcrypt hash
  const { rows } = await app.pool.query("SELECT password_hash FROM users WHERE email = 'owner@example.com'");
  assert.match(rows[0].password_hash, /^\$2[aby]\$10\$/);
});

test('running it again changes the password of the same account', async () => {
  await setAdmin(app.pool, { ...NEW_ADMIN, password: 'another-private-passphrase' });
  const { rows } = await app.pool.query("SELECT COUNT(*)::int AS n FROM users WHERE role = 'admin'");
  assert.equal(rows[0].n, 1, 'still one admin');
  assert.equal((await client(app.url).post('/api/auth/login', { email: 'owner@example.com', password: NEW_ADMIN.password })).status, 401);
});

test('the demo users are only deleted when asked', async () => {
  const before = (await app.pool.query("SELECT COUNT(*)::int AS n FROM users WHERE email LIKE '%@foodies.test'")).rows[0].n;
  assert.equal(before, 2, 'maya and tom are kept by default');
  const { removed } = await setAdmin(app.pool, { ...NEW_ADMIN, removeDemoUsers: true });
  assert.deepEqual(removed.sort(), ['maya@foodies.test', 'tom@foodies.test']);
  const { rows } = await app.pool.query('SELECT COUNT(*)::int AS n FROM favorites');
  assert.equal(rows[0].n, 0, 'their favorites went with them');
});
