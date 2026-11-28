// Ask Teta (POST /api/chat) with her built-in rules: no OpenAI key in the tests, so the answers are always the same
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestApp, client, ACCOUNTS } = require('./helpers');

let app;
before(async () => { app = await startTestApp('chat'); });
after(() => app.close());

// (6 questions per minute per visitor, counted by IP address. the checks of bad questions come from
//  [::1] instead of 127.0.0.1: for the server that is another visitor, with its own counter)

test('asking about a dish by name gives the dish and real places that serve it', async () => {
  const res = await client(app.url).post('/api/chat', { question: 'Where can I eat sayadieh?' });
  assert.equal(res.status, 200);
  assert.equal(res.body.source, 'rules');
  assert.equal(res.body.dish_id, 7);
  assert.equal(typeof res.body.answer, 'string');
  assert.ok(res.body.results.length >= 1);
  for (const r of res.body.results) {
    assert.ok(['Feniqia', 'Silver Shore Restaurant', 'Chahine Seafood Saida'].includes(r.restaurant.name), r.restaurant.name);
    assert.equal(r.dish.id, 7);
  }
});

test('a diet question gets an answer too', async () => {
  const res = await client(app.url).post('/api/chat', { question: 'I am vegan, what can I eat?', history: [{ role: 'user', text: 'hi' }, { role: 'teta', text: 'Ahlan!' }] });
  assert.equal(res.status, 200);
  assert.ok(res.body.answer.length > 10);
});

test('every question is saved in chat_logs, with who asked when logged in', async () => {
  const maya = client(app.url);
  await maya.login(...ACCOUNTS.maya);
  await maya.post('/api/chat', { question: 'Tell me about knefeh' });
  const { rows } = await app.pool.query('SELECT user_id, question, matched_dish_id FROM chat_logs ORDER BY id DESC LIMIT 1');
  assert.deepEqual(rows[0], { user_id: 2, question: 'Tell me about knefeh', matched_dish_id: 9 });
});

test('bad questions are refused with 400', async () => {
  const api = client(app.url.replace('127.0.0.1', '[::1]'));
  const bad = [{}, { question: '   ' }, { question: 'x'.repeat(501) }, { question: 'hi', history: 'no' },
    { question: 'hi', history: [{ role: 'robot', text: 'x' }] }, { question: 'hi', history: Array(7).fill({ role: 'user', text: 'x' }) }];
  for (const body of bad) {
    assert.equal((await api.post('/api/chat', body)).status, 400, JSON.stringify(body).slice(0, 80));
  }
});

test('the 7th question in a minute is refused (429) with Retry-After', async () => {
  const api = client(app.url);
  // 3 questions were already asked from 127.0.0.1 above: 3 more are fine, the next one is refused
  for (let i = 0; i < 3; i++) assert.equal((await api.post('/api/chat', { question: 'hummus?' })).status, 200);
  const res = await api.post('/api/chat', { question: 'hummus?' });
  assert.equal(res.status, 429);
  assert.ok(Number(res.headers.get('retry-after')) > 0);
  assert.match(res.body.error, /Teta/);
});
