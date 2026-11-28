// Ask Teta WITH the AI, without a real key and without paying: a fake OpenAI answers instead.
// we replace fetch() for api.openai.com only, so we can check what our server sends to OpenAI
// (the rules, our database, no web tools) and what it does with the answer (keeps only real ids).
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestApp, client } = require('./helpers');
const { DONT_KNOW } = require('../utils/helper4');

let app;
let api;
let sent = [];        // every request our server sent to OpenAI
let nextReply = null; // what the fake OpenAI answers next: { status, body }

const realFetch = global.fetch;

before(async () => {
  app = await startTestApp('ai');
  api = client(app.url);
  process.env.OPENAI_API_KEY = 'sk-fake-key-for-the-tests';
  process.env.OPENAI_MODEL = 'test-model';

  global.fetch = async (url, options) => {
    if (!String(url).startsWith('https://api.openai.com/')) return realFetch(url, options);
    sent.push({ url: String(url), headers: options.headers, body: JSON.parse(options.body) });
    const { status = 200, body } = nextReply;
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  };
});

after(async () => {
  global.fetch = realFetch;
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_MODEL;
  await app.close();
});

// the shape of a Responses API answer, with Teta's JSON as the text
const openAIAnswer = (reply) => ({
  body: { output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(reply) }] }] },
});

test('/api/chat/status says the AI is on, with the model', async () => {
  const res = await api.get('/api/chat/status');
  assert.deepEqual(res.body, { ai: true, model: 'test-model' });
});

test('what we send to OpenAI: the strict rules, our database, and no web tools', async () => {
  sent = [];
  nextReply = openAIAnswer({ answer: 'Sayadieh, habibi!', dish_id: 7, picks: [] });
  const res = await api.post('/api/chat', { question: 'What is sayadieh?' });
  assert.equal(res.status, 200);
  assert.equal(sent.length, 1);

  const { url, headers, body } = sent[0];
  assert.equal(url, 'https://api.openai.com/v1/responses');
  assert.equal(headers.Authorization, 'Bearer sk-fake-key-for-the-tests');
  assert.equal(body.model, 'test-model');
  assert.equal(body.store, false, 'OpenAI must not keep the conversation');
  assert.equal(body.tools, undefined, 'no web search or other tools: the model can only use what we send');
  assert.equal(body.text.format.type, 'json_schema');
  assert.equal(body.text.format.strict, true);

  const system = body.input[0];
  assert.equal(system.role, 'system');
  assert.match(system.content, /ONLY source of facts/);
  assert.match(system.content, /Do not add anything from your own knowledge/);
  assert.ok(system.content.includes(DONT_KNOW), 'the model is told what to say when it does not know');
  // our database is in the prompt: dishes, restaurants, menus with prices
  assert.match(system.content, /#7 Sayadieh/);
  assert.match(system.content, /#4 Feniqia .*Sayadieh #7 \$16/);
  assert.match(system.content, /Lakkis Farm Baalbek/);

  assert.deepEqual(body.input.at(-1), { role: 'user', content: 'What is sayadieh?' });
});

test('the conversation history is sent with the right roles', async () => {
  sent = [];
  nextReply = openAIAnswer({ answer: 'Try mjaddara.', dish_id: 13, picks: [] });
  await api.post('/api/chat', {
    question: 'And something vegan?',
    history: [{ role: 'user', text: 'Hi Teta' }, { role: 'teta', text: 'Ahlan habibi!' }],
  });
  const roles = sent[0].body.input.map((m) => m.role);
  assert.deepEqual(roles, ['system', 'user', 'assistant', 'user']);
});

test('places and dishes the model makes up are thrown away; real ones get their real price', async () => {
  nextReply = openAIAnswer({
    answer: 'Go to Feniqia, and to my cousin\'s place.',
    dish_id: 7,
    picks: [{ restaurant_id: 4, dish_id: 7 }, { restaurant_id: 999, dish_id: 7 }, { restaurant_id: 5, dish_id: 999 }],
  });
  const res = await api.post('/api/chat', { question: 'Where for sayadieh?' });
  assert.equal(res.body.source, 'ai');
  assert.equal(res.body.dish_id, 7);
  assert.deepEqual(res.body.results.map((r) => r.restaurant.name), ['Feniqia', 'Silver Shore Restaurant']);
  assert.equal(res.body.results[0].price_usd, 16, 'the price comes from our database, not from the model');
  assert.equal(res.body.results[1].dish, null, 'dish 999 does not exist');
});

test('a made-up dish id becomes null, in the answer and in chat_logs', async () => {
  nextReply = openAIAnswer({ answer: 'Shawarma!', dish_id: 999, picks: [] });
  const res = await api.post('/api/chat', { question: 'Shawarma?' });
  assert.equal(res.body.dish_id, null);
  const { rows } = await app.pool.query('SELECT matched_dish_id, answer FROM chat_logs ORDER BY id DESC LIMIT 1');
  assert.deepEqual(rows[0], { matched_dish_id: null, answer: 'Shawarma!' });
});

test('if OpenAI fails, Teta still answers with her built-in rules', async () => {
  nextReply = { status: 500, body: { error: { message: 'server down' } } };
  const res = await client(app.url.replace('127.0.0.1', '[::1]')).post('/api/chat', { question: 'Where can I eat sayadieh?' });
  assert.equal(res.status, 200);
  assert.equal(res.body.source, 'rules');
  assert.equal(res.body.dish_id, 7);
});
