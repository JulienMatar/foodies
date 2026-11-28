// admin only: dishes, restaurants, menus, the dashboard numbers and the chat logs
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestApp, client, ACCOUNTS } = require('./helpers');

let app;
let admin;
let maya;
let visitor;
before(async () => {
  app = await startTestApp('admin');
  admin = client(app.url);
  maya = client(app.url);
  visitor = client(app.url);
  await admin.login(...ACCOUNTS.admin);
  await maya.login(...ACCOUNTS.maya);
});
after(() => app.close());

const DISH = {
  name_en: 'Kafta', name_ar: 'كفتة', description: 'Grilled minced meat skewers.', category_id: 2, is_vegetarian: false, weather: 'any',
  slug: 'kafta', ingredients: ['minced lamb', 'parsley', 'onion'], allergens: [], meat: 'lamb', first_timer: true,
};
const PLACE = {
  name: 'Test Furn', region_id: 1, address: 'Hamra Street, Beirut', phone: '+961 1 000 000',
  lat: 33.8963, lng: 35.4823, price_level: 1, style: 'authentic',
};

// ---------- who may do what ----------

test('admin routes: 401 for visitors, 403 for normal users', async () => {
  const routes = [
    ['post', '/api/dishes', DISH], ['put', '/api/dishes/1', DISH], ['delete', '/api/dishes/1'],
    ['post', '/api/restaurants', PLACE], ['put', '/api/restaurants/1', PLACE], ['delete', '/api/restaurants/1'],
    ['post', '/api/restaurants/1/dishes', { dish_id: 3, price_usd: 5 }], ['put', '/api/restaurants/1/dishes/1', { available: false }],
    ['delete', '/api/restaurants/1/dishes/1'], ['get', '/api/admin/stats'], ['get', '/api/admin/chat-logs'],
  ];
  for (const [method, path, body] of routes) {
    assert.equal((await visitor[method](path, body)).status, 401, `visitor ${method} ${path}`);
    assert.equal((await maya[method](path, body)).status, 403, `maya ${method} ${path}`);
  }
});

test('an admin who loses the role is blocked at once, even with an old login', async () => {
  const former = client(app.url);
  await former.post('/api/auth/register', { name: 'Former Admin', email: 'former@foodies.test', password: 'Secret123!' });
  await app.pool.query("UPDATE users SET role = 'admin' WHERE email = 'former@foodies.test'");
  await former.login('former@foodies.test', 'Secret123!'); // the token now says "admin"
  assert.equal((await former.get('/api/admin/stats')).status, 200);
  await app.pool.query("UPDATE users SET role = 'user' WHERE email = 'former@foodies.test'");
  assert.equal((await former.get('/api/admin/stats')).status, 403);
});

// ---------- dishes ----------

let kafta;

test('create, read, replace and delete a dish', async () => {
  const created = await admin.post('/api/dishes', DISH);
  assert.equal(created.status, 201);
  kafta = created.body;
  assert.equal(kafta.slug, 'kafta');
  assert.equal(kafta.is_vegan, false, 'missing details get their default');
  assert.equal(kafta.served_raw, false);

  assert.equal((await visitor.get(`/api/dishes/${kafta.id}`)).body.name_en, 'Kafta');

  const replaced = await admin.put(`/api/dishes/${kafta.id}`, { ...DISH, name_en: 'Kafta Meshwiyeh', weather: 'hot' });
  assert.equal(replaced.status, 200);
  assert.equal(replaced.body.name_en, 'Kafta Meshwiyeh');
  assert.equal(replaced.body.weather, 'hot');
  assert.equal((await admin.put('/api/dishes/999', DISH)).status, 404);
});

test('dishes: the same slug twice is a 409, a missing category is a 400', async () => {
  assert.equal((await admin.post('/api/dishes', { ...DISH, name_en: 'Copy' })).status, 409);
  assert.equal((await admin.post('/api/dishes', { ...DISH, slug: 'other', category_id: 99 })).status, 400);
});

test('dishes: bad bodies are 400 with a message', async () => {
  const bad = [
    {},
    { ...DISH, name_en: '  ' },
    { ...DISH, category_id: 'two' },
    { ...DISH, is_vegetarian: 'no' },
    { ...DISH, weather: 'rainy' },
    { ...DISH, slug: 'Bad Slug!' },
    { ...DISH, allergens: ['peanuts'] },
    { ...DISH, meat: 'pork' },
    { ...DISH, ingredients: 'lamb' },
    { ...DISH, is_vegan: true, is_vegetarian: false, meat: 'none' },
    { ...DISH, is_vegetarian: true, meat: 'lamb' },
    { ...DISH, slug: 'long', name_en: 'x'.repeat(101) },
    { ...DISH, slug: 'long-ar', name_ar: 'x'.repeat(101) },
  ];
  for (const body of bad) {
    const res = await admin.post('/api/dishes', body);
    assert.equal(res.status, 400, JSON.stringify(body).slice(0, 120));
    assert.equal(typeof res.body.error, 'string');
  }
});

// ---------- restaurants ----------

let furn;

test('create, read, replace and delete a restaurant', async () => {
  const created = await admin.post('/api/restaurants', PLACE);
  assert.equal(created.status, 201);
  furn = created.body;
  assert.equal(furn.name, 'Test Furn');

  const replaced = await admin.put(`/api/restaurants/${furn.id}`, { ...PLACE, price_level: 2, style: 'heritage' });
  assert.equal(replaced.status, 200);
  assert.equal(replaced.body.style, 'heritage');
  assert.equal((await admin.put('/api/restaurants/999', PLACE)).status, 404);
});

test('a restaurant can be saved without its exact spot (lat and lng null), like Mersal', async () => {
  const mersal = (await visitor.get('/api/restaurants/7')).body;
  const res = await admin.put('/api/restaurants/7', {
    name: mersal.name, region_id: mersal.region_id, address: mersal.address, phone: mersal.phone,
    lat: null, lng: null, price_level: mersal.price_level, style: mersal.style,
  });
  assert.equal(res.status, 200, res.text);
  assert.equal(res.body.lat, null);
});

test('restaurants: bad bodies are 400 with a message', async () => {
  const bad = [
    {},
    { ...PLACE, name: '' },
    { ...PLACE, region_id: 0 },
    { ...PLACE, region_id: 99 },
    { ...PLACE, price_level: 5 },
    { ...PLACE, style: 'cheap' },
    { ...PLACE, lat: 'north' },
    { ...PLACE, lat: 95 },
    { ...PLACE, lng: -200 },
    { ...PLACE, lat: null }, // only one of the two
    { ...PLACE, name: 'x'.repeat(101) },
    { ...PLACE, address: 'x'.repeat(201) },
    { ...PLACE, phone: '1'.repeat(31) },
  ];
  for (const body of bad) {
    const res = await admin.post('/api/restaurants', body);
    assert.equal(res.status, 400, JSON.stringify(body).slice(0, 120));
    assert.equal(typeof res.body.error, 'string');
  }
});

// ---------- the menu ----------

test('put a dish on a menu, change it, take it off', async () => {
  const added = await admin.post(`/api/restaurants/${furn.id}/dishes`, { dish_id: kafta.id, price_usd: 6.5, available: true });
  assert.equal(added.status, 201);
  assert.equal((await admin.post(`/api/restaurants/${furn.id}/dishes`, { dish_id: kafta.id, price_usd: 7 })).status, 409);

  const menu = (await visitor.get(`/api/restaurants/${furn.id}`)).body.menu;
  assert.equal(menu.length, 1);
  assert.equal(Number(menu[0].price_usd), 6.5);

  const changed = await admin.put(`/api/restaurants/${furn.id}/dishes/${kafta.id}`, { available: false });
  assert.equal(changed.status, 200);
  assert.equal(changed.body.available, false);
  assert.equal((await admin.put(`/api/restaurants/${furn.id}/dishes/${kafta.id}`, {})).status, 400);
  assert.equal((await admin.put(`/api/restaurants/${furn.id}/dishes/1`, { price_usd: 3 })).status, 404, 'not on this menu');

  for (const body of [{ dish_id: kafta.id }, { price_usd: 3 }, { dish_id: 1, price_usd: -1 }, { dish_id: 1, price_usd: 'free' }]) {
    assert.equal((await admin.post(`/api/restaurants/${furn.id}/dishes`, body)).status, 400, JSON.stringify(body));
  }
  assert.equal((await admin.post('/api/restaurants/999/dishes', { dish_id: 1, price_usd: 3 })).status, 404);
  assert.equal((await admin.post(`/api/restaurants/${furn.id}/dishes`, { dish_id: 999, price_usd: 3 })).status, 404);

  assert.equal((await admin.delete(`/api/restaurants/${furn.id}/dishes/${kafta.id}`)).status, 204);
  assert.equal((await admin.delete(`/api/restaurants/${furn.id}/dishes/${kafta.id}`)).status, 404);
});

test('deleting a restaurant or a dish also removes its menu lines, reviews and favorites', async () => {
  await admin.post(`/api/restaurants/${furn.id}/dishes`, { dish_id: kafta.id, price_usd: 6 });
  await maya.post(`/api/restaurants/${furn.id}/reviews`, { rating: 4, tradition_rating: 4 });
  await maya.post(`/api/favorites/${kafta.id}`);

  assert.equal((await admin.delete(`/api/restaurants/${furn.id}`)).status, 204);
  assert.equal((await visitor.get(`/api/restaurants/${furn.id}`)).status, 404);
  assert.equal((await admin.delete(`/api/restaurants/${furn.id}`)).status, 404);

  assert.equal((await admin.delete(`/api/dishes/${kafta.id}`)).status, 204);
  assert.equal((await visitor.get(`/api/dishes/${kafta.id}`)).status, 404);
  assert.ok(!(await maya.get('/api/favorites')).body.some((d) => d.id === kafta.id));

  const { rows } = await app.pool.query('SELECT COUNT(*)::int AS n FROM restaurant_dishes WHERE restaurant_id = $1', [furn.id]);
  assert.equal(rows[0].n, 0);
});

test('a region used by restaurants cannot disappear (foreign key)', async () => {
  await assert.rejects(app.pool.query('DELETE FROM regions WHERE id = 1'), (err) => err.code === '23503');
});

// ---------- dashboard ----------

test('GET /api/admin/stats gives the dashboard numbers', async () => {
  await visitor.post('/api/chat', { question: 'What is hummus?' });
  const res = await admin.get('/api/admin/stats');
  assert.equal(res.status, 200);
  assert.equal(res.body.counts.restaurants, 8);
  assert.equal(res.body.counts.dishes, 14);
  assert.ok(res.body.counts.questions >= 1);
  assert.equal(res.body.questions_per_day.length, 7, 'the last 7 days');
  assert.ok(Array.isArray(res.body.top_favorites));
  assert.deepEqual(res.body.chatbot, { ai: false, model: null });
  assert.match(res.headers.get('cache-control'), /no-store/);
});

test('GET /api/admin/chat-logs pages through the questions, newest first', async () => {
  for (const q of ['Something vegan?', 'Where to eat knefeh?', 'Is tabbouleh gluten free?']) {
    await visitor.post('/api/chat', { question: q });
  }
  const res = await admin.get('/api/admin/chat-logs?page=1&limit=2');
  assert.equal(res.status, 200);
  assert.equal(res.body.logs.length, 2);
  assert.equal(res.body.limit, 2);
  assert.ok(res.body.total >= 4);
  assert.equal(res.body.pages, Math.ceil(res.body.total / 2));
  assert.equal(res.body.logs[0].question, 'Is tabbouleh gluten free?');

  for (const q of ['page=0', 'page=x', 'limit=0', 'limit=101']) {
    assert.equal((await admin.get(`/api/admin/chat-logs?${q}`)).status, 400, q);
  }
});
