// accounts: register, log in, who am I, log out, Google sign-in, and the database rules on users
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestApp, client, ACCOUNTS } = require('./helpers');

let app;
before(async () => { app = await startTestApp('auth'); });
after(() => app.close());

// (the sign-in routes allow 10 tries per 15 minutes: this file stays under that, ratelimit.test.js tests the limit)

test('register creates the account, logs it in, and saves the email in lowercase', async () => {
  const sara = client(app.url);
  const res = await sara.post('/api/auth/register', { name: '  Sara  ', email: 'Sara@Example.COM', password: 'Secret123!' });
  assert.equal(res.status, 201);
  assert.equal(res.body.email, 'sara@example.com');
  assert.equal(res.body.name, 'Sara', 'the name is trimmed');
  assert.equal(res.body.role, 'user');
  assert.equal(res.body.password_hash, undefined, 'the hash never leaves the server');

  // the login cookie: httpOnly so page scripts can't read it, SameSite against CSRF
  assert.match(res.setCookie, /^token=/);
  assert.match(res.setCookie, /HttpOnly/i);
  assert.match(res.setCookie, /SameSite=Lax/i);

  const me = await sara.get('/api/auth/me');
  assert.equal(me.status, 200);
  assert.equal(me.body.email, 'sara@example.com');

  // the password is stored as a bcrypt hash
  const { rows } = await app.pool.query("SELECT password_hash FROM users WHERE email = 'sara@example.com'");
  assert.match(rows[0].password_hash, /^\$2[aby]\$/);
});

test('register: the same email in other letters is a 409', async () => {
  const res = await client(app.url).post('/api/auth/register', { name: 'Maya 2', email: 'MAYA@foodies.test', password: 'Secret123!' });
  assert.equal(res.status, 409);
});

test('register refuses bad bodies with 400', async () => {
  const api = client(app.url);
  const bad = [
    {},
    { name: '   ', email: 'a@b.co', password: 'Secret123!' },
    { name: 'A', email: 'not-an-email', password: 'Secret123!' },
    { name: 'A', email: 'a@b.co', password: '123' },
  ];
  for (const body of bad) {
    const res = await api.post('/api/auth/register', body);
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.equal(typeof res.body.error, 'string');
  }
});

test('login: wrong password and unknown email give the same 401', async () => {
  const api = client(app.url);
  const wrong = await api.post('/api/auth/login', { email: 'maya@foodies.test', password: 'nope' });
  const unknown = await api.post('/api/auth/login', { email: 'ghost@foodies.test', password: 'nope' });
  assert.equal(wrong.status, 401);
  assert.equal(unknown.status, 401);
  assert.equal(wrong.body.error, unknown.body.error, 'strangers cannot tell which emails exist');
  assert.equal(api.hasCookie(), false);
});

test('login works with any capitals in the email, then me and logout', async () => {
  const maya = client(app.url);
  const res = await maya.login('Maya@Foodies.Test', ACCOUNTS.maya[1]);
  assert.equal(res.body.name, 'Maya');

  assert.equal((await maya.get('/api/auth/me')).status, 200);
  assert.equal((await maya.post('/api/auth/logout')).status, 204);
  assert.equal((await maya.get('/api/auth/me')).status, 401, 'logged out');
});

test('a fake or changed token is refused', async () => {
  const api = client(app.url);
  const fake = await api.get('/api/auth/me', { Cookie: 'token=not.a.jwt' });
  assert.equal(fake.status, 401);

  // a token signed with another secret, claiming to be the admin
  const jwt = require('jsonwebtoken');
  const forged = jwt.sign({ id: 1, role: 'admin' }, 'some-other-secret-that-is-long-enough-123');
  const res = await api.get('/api/admin/stats', { Cookie: `token=${forged}` });
  assert.equal(res.status, 401);
});

test('logout without being logged in is a 401', async () => {
  assert.equal((await client(app.url).post('/api/auth/logout')).status, 401);
});

test('Google sign-in: redirects to Google when it is set up, a clear error when not', async () => {
  const res = await client(app.url).get('/api/auth/google');
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    assert.ok([301, 302, 303, 307].includes(res.status), `status ${res.status}`);
    assert.match(res.headers.get('location'), /^https:\/\/accounts\.google\.com\//);
  } else {
    assert.equal(res.status, 503);
    assert.match(res.body.error, /not set up/);
  }
});

test('GET /api/auth/google/status tells the page whether to show the Google button', async () => {
  const res = await client(app.url).get('/api/auth/google/status');
  assert.equal(res.status, 200);
  const configured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI);
  assert.deepEqual(res.body, { available: configured });
});

test('Google callback without a valid state is refused', async () => {
  const res = await client(app.url).get('/api/auth/google/callback?code=abc&state=forged');
  assert.ok([400, 503].includes(res.status), `status ${res.status}`);
  assert.equal(typeof res.body.error, 'string');
});

test('the database itself refuses capital emails, blank names and accounts with no way to log in', async () => {
  const tries = [
    ["INSERT INTO users (name, email, password_hash) VALUES ('X', 'Big@x.com', 'h')", 'users_email_lowercase_check'],
    ["INSERT INTO users (name, email, password_hash) VALUES ('  ', 'b@x.com', 'h')", 'users_name_not_blank'],
    ["INSERT INTO users (name, email) VALUES ('C', 'c@x.com')", 'users_login_method_check'],
  ];
  for (const [sql, constraint] of tries) {
    await assert.rejects(app.pool.query(sql), (err) => err.constraint === constraint, constraint);
  }
});
