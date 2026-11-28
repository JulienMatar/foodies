// the public endpoints (no login): lists, filters, sorting, one item, errors, headers
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestApp, client } = require('./helpers');

let app;
let api;
before(async () => {
  app = await startTestApp('public');
  api = client(app.url);
});
after(() => app.close());

const names = (list) => list.map((x) => x.name || x.name_en);

// ---------- health, lookups ----------

test('GET /api/health says the app and the database are up', async () => {
  const res = await api.get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
  assert.equal(res.body.database, 'ok');
});

test('GET /api/regions lists the 6 regions', async () => {
  const res = await api.get('/api/regions');
  assert.equal(res.status, 200);
  assert.deepEqual(names(res.body).sort(), ['Baalbek', 'Beirut', 'Byblos', 'Saida', 'Tripoli', 'Zahle']);
});

test('GET /api/categories lists the 6 categories', async () => {
  const res = await api.get('/api/categories');
  assert.equal(res.status, 200);
  assert.equal(res.body.length, 6);
  assert.ok(names(res.body).includes('Desserts'));
});

// ---------- dishes ----------

test('GET /api/dishes lists the 14 dishes with their details', async () => {
  const res = await api.get('/api/dishes');
  assert.equal(res.status, 200);
  assert.equal(res.body.length, 14);
  const hummus = res.body.find((d) => d.slug === 'hummus');
  assert.equal(hummus.name_ar, 'حمص');
  assert.ok(Array.isArray(hummus.ingredients));
  assert.deepEqual(hummus.allergens, ['sesame']);
});

test('GET /api/dishes filters: search, category, vegetarian, vegan, gluten_free, without', async () => {
  const search = await api.get('/api/dishes?search=hummus');
  assert.equal(search.status, 200);
  assert.ok(names(search.body).includes('Hummus'));

  const desserts = await api.get('/api/dishes?category=5');
  assert.deepEqual(names(desserts.body), ['Knefeh']);

  assert.equal((await api.get('/api/dishes?vegetarian=true')).body.length, 9);
  assert.equal((await api.get('/api/dishes?vegetarian=false')).body.length, 5);
  assert.equal((await api.get('/api/dishes?vegan=true')).body.length, 8);
  assert.equal((await api.get('/api/dishes?gluten_free=true')).body.length, 6);

  const noSesame = await api.get('/api/dishes?without=sesame');
  assert.equal(noSesame.body.length, 8);
  assert.ok(noSesame.body.every((d) => !d.allergens.includes('sesame')));

  const both = await api.get('/api/dishes?vegan=true&without=gluten,sesame');
  assert.deepEqual(names(both.body).sort(), ['Mjaddara', 'Warak Enab']);

  const empty = await api.get('/api/dishes?category=');
  assert.equal(empty.body.length, 14, 'an empty filter counts as not sent');
});

test('GET /api/dishes refuses bad filters with 400', async () => {
  for (const q of ['category=abc', 'category=0', 'vegetarian=yes', 'vegan=false', 'gluten_free=1', 'without=peanuts', `search=${'x'.repeat(101)}`]) {
    const res = await api.get(`/api/dishes?${q}`);
    assert.equal(res.status, 400, q);
    assert.equal(typeof res.body.error, 'string', q);
  }
});

test('GET /api/dishes/:id gives the dish and where to eat it', async () => {
  const res = await api.get('/api/dishes/7'); // sayadieh
  assert.equal(res.status, 200);
  assert.equal(res.body.slug, 'sayadieh');
  assert.deepEqual(names(res.body.restaurants).sort(), ['Chahine Seafood Saida', 'Feniqia', 'Silver Shore Restaurant']);
  assert.ok(res.body.restaurants.every((r) => r.price_usd !== undefined));
});

test('GET /api/dishes/:id: 404 for a missing dish, 400 for a bad id', async () => {
  assert.equal((await api.get('/api/dishes/999')).status, 404);
  for (const id of ['abc', '0', '-1', '1.5']) {
    assert.equal((await api.get(`/api/dishes/${id}`)).status, 400, id);
  }
});

test('an id too big for the database is a 400, not a server error', async () => {
  for (const p of ['/api/dishes/99999999999', '/api/restaurants/99999999999', '/api/restaurants/99999999999/reviews']) {
    const res = await api.get(p);
    assert.equal(res.status, 400, p);
  }
});

// ---------- restaurants ----------

test('GET /api/restaurants lists Peter\'s 8 real restaurants with their scores', async () => {
  const res = await api.get('/api/restaurants');
  assert.equal(res.status, 200);
  assert.equal(res.body.length, 8);
  const tawlet = res.body.find((r) => r.name === 'Tawlet Mar Mikhael');
  assert.equal(tawlet.region, 'Beirut');
  assert.equal(tawlet.lat, 33.8972);
  assert.equal(tawlet.review_count, 0);
  assert.equal(tawlet.avg_rating, null);
  const mersal = res.body.find((r) => r.name === 'Mersal');
  assert.equal(mersal.lat, null, 'Mersal has no exact spot yet');
});

test('GET /api/restaurants filters: region, style, dish', async () => {
  assert.equal((await api.get('/api/restaurants?region=1')).body.length, 3);
  assert.deepEqual(names((await api.get('/api/restaurants?style=heritage')).body).sort(), ['Feniqia', 'Lakkis Farm Baalbek']);

  // falafel: Lakkis has it but it is not available today, so it is not listed
  const falafel = await api.get('/api/restaurants?dish=11');
  assert.deepEqual(names(falafel.body).sort(), ['Chahine Seafood Saida', 'Liza Beirut']);
  assert.ok(falafel.body.every((r) => typeof r.price_usd === 'number' || typeof r.price_usd === 'string'));
});

test('GET /api/restaurants sorts by the price of a dish', async () => {
  const asc = await api.get('/api/restaurants?dish=7&sort=price_asc');
  assert.deepEqual(names(asc.body), ['Chahine Seafood Saida', 'Feniqia', 'Silver Shore Restaurant']);
  const desc = await api.get('/api/restaurants?dish=7&sort=price_desc');
  assert.deepEqual(names(desc.body), ['Silver Shore Restaurant', 'Feniqia', 'Chahine Seafood Saida']);
});

test('GET /api/restaurants?near= adds distance_km and sorts nearest first', async () => {
  const res = await api.get('/api/restaurants?near=33.89,35.50'); // downtown Beirut
  assert.equal(res.status, 200);
  assert.equal(res.body[0].name, 'Em Sherif Cafe');
  const distances = res.body.map((r) => r.distance_km).filter((d) => d !== null);
  assert.deepEqual(distances, [...distances].sort((a, b) => a - b));
  assert.equal(res.body.at(-1).name, 'Mersal', 'no coordinates: last');
  assert.equal(res.body.at(-1).distance_km, null);
});

test('GET /api/restaurants: every sort works', async () => {
  for (const sort of ['authentic', 'mix', 'modern', 'price_asc', 'price_desc', 'top_rated']) {
    const res = await api.get(`/api/restaurants?sort=${sort}`);
    assert.equal(res.status, 200, sort);
    assert.equal(res.body.length, 8, sort);
  }
  assert.equal((await api.get('/api/restaurants?sort=nearest&near=34,35.6')).status, 200);
});

test('GET /api/restaurants refuses bad filters with 400', async () => {
  for (const q of ['dish=x', 'region=0', 'style=cheap', 'sort=random', 'sort=nearest', 'near=abc', 'near=91,35', 'near=33,181', 'near=33.8']) {
    const res = await api.get(`/api/restaurants?${q}`);
    assert.equal(res.status, 400, q);
  }
});

test('GET /api/restaurants/:id gives the restaurant and its menu', async () => {
  const res = await api.get('/api/restaurants/1');
  assert.equal(res.status, 200);
  assert.equal(res.body.name, 'Tawlet Mar Mikhael');
  assert.equal(res.body.phone, '+961 81 266 060');
  assert.equal(res.body.menu.length, 6);
  assert.equal((await api.get('/api/restaurants/999')).status, 404);
  assert.equal((await api.get('/api/restaurants/abc')).status, 400);
});

test('GET /api/restaurants/:id/reviews: empty at first, 404 for a missing restaurant', async () => {
  const res = await api.get('/api/restaurants/1/reviews');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, []);
  assert.equal((await api.get('/api/restaurants/999/reviews')).status, 404);
});

// ---------- utilities (these call outside services, with a fallback) ----------

test('GET /api/dish-of-the-day always suggests a dish', async () => {
  const res = await api.get('/api/dish-of-the-day');
  assert.equal(res.status, 200);
  assert.equal(typeof res.body.dish_id, 'number');
  assert.equal(res.body.dish.id, res.body.dish_id);
});

test('GET /api/rates gives 1 USD in LBP and EUR', async () => {
  const res = await api.get('/api/rates');
  assert.equal(res.status, 200);
  assert.ok(Number(res.body.LBP) > 1000, JSON.stringify(res.body));
  assert.ok(Number(res.body.EUR) > 0);
});

test('GET /api/chat/status: no AI key in the tests', async () => {
  const res = await api.get('/api/chat/status');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { ai: false, model: null });
});

// ---------- errors and protections ----------

test('an unknown API route is a JSON 404', async () => {
  const res = await api.get('/api/nothing-here');
  assert.equal(res.status, 404);
  assert.equal(typeof res.body.error, 'string');
});

test('a body that is not JSON is a 400, a huge body is a 413', async () => {
  const bad = await api.post('/api/auth/login', '{"email": ');
  assert.equal(bad.status, 400);
  assert.equal(bad.body.error, 'Request body is not valid JSON');

  const huge = await api.post('/api/chat', { question: 'x'.repeat(30000) });
  assert.equal(huge.status, 413);
});

test('every answer has the security headers, and no X-Powered-By', async () => {
  for (const p of ['/', '/api/dishes', '/api/nothing-here']) {
    const res = await api.get(p);
    const csp = res.headers.get('content-security-policy');
    assert.match(csp, /default-src 'self'/, p);
    assert.match(csp, /frame-ancestors 'none'/, p);
    assert.match(csp, /frame-src https:\/\/maps\.google\.com https:\/\/www\.google\.com/, p);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff', p);
    assert.equal(res.headers.get('x-frame-options'), 'DENY', p);
    assert.equal(res.headers.get('x-powered-by'), null, p);
  }
});

test('caching: lookups are cached, the user data never is', async () => {
  assert.match((await api.get('/api/regions')).headers.get('cache-control'), /max-age=3600/);
  assert.match((await api.get('/api/dishes')).headers.get('cache-control'), /max-age=60/);
  assert.match((await api.get('/api/auth/me')).headers.get('cache-control'), /no-store/);
  assert.match((await api.get('/img/cedar.svg')).headers.get('cache-control'), /max-age=604800/);
});

test('an unchanged list answers 304 Not Modified with its ETag', async () => {
  const first = await api.get('/api/restaurants');
  const etag = first.headers.get('etag');
  assert.ok(etag);
  // node:http and not fetch(): fetch adds "Cache-Control: no-cache" when it sees If-None-Match,
  // and then the server must send everything again (like the browser's "hard reload")
  const http = require('node:http');
  const status = await new Promise((resolve, reject) => {
    http.get(`${app.url}/api/restaurants`, { headers: { 'If-None-Match': etag } }, (res) => {
      res.resume();
      resolve(res.statusCode);
    }).on('error', reject);
  });
  assert.equal(status, 304);
});

test('every page of the website is served', async () => {
  const pages = ['/', '/index.html', '/new.html', '/dishes.html', '/dish.html', '/road.html', '/restaurants.html',
    '/restaurant.html', '/traditions.html', '/favorites.html', '/chat.html', '/admin.html'];
  for (const p of pages) {
    const res = await api.get(p);
    assert.equal(res.status, 200, p);
    assert.match(res.headers.get('content-type'), /text\/html/, p);
  }
});
