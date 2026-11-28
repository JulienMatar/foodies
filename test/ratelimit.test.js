// the sign-in limit: 10 tries per 15 minutes per visitor, against password guessing
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestApp, client } = require('./helpers');

let app;
before(async () => { app = await startTestApp('ratelimit'); });
after(() => app.close());

test('after 10 tries, login is refused with 429 even with the right password', async () => {
  const api = client(app.url);
  for (let i = 1; i <= 10; i++) {
    const res = await api.post('/api/auth/login', { email: 'maya@foodies.test', password: `guess-${i}` });
    assert.equal(res.status, 401, `try ${i}`);
    assert.equal(res.headers.get('ratelimit-limit'), '10');
    assert.equal(res.headers.get('ratelimit-remaining'), String(10 - i));
  }
  const blocked = await api.post('/api/auth/login', { email: 'maya@foodies.test', password: 'Password123!' });
  assert.equal(blocked.status, 429);
  assert.match(blocked.body.error, /wait 15 minutes/);

  // registering shares the same counter
  assert.equal((await api.post('/api/auth/register', { name: 'X', email: 'x@x.co', password: 'Secret123!' })).status, 429);

  // the rest of the site still works
  assert.equal((await api.get('/api/dishes')).status, 200);
});

test('the general API limit sends its counters', async () => {
  const res = await client(app.url).get('/api/regions');
  assert.equal(res.headers.get('ratelimit-limit'), '600');
});
