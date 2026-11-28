// what logged-in users do: reviews (with the owner rule) and favorites
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestApp, client, ACCOUNTS } = require('./helpers');

let app;
let maya;
let tom;
let admin;
let visitor;
before(async () => {
  app = await startTestApp('users');
  maya = client(app.url);
  tom = client(app.url);
  admin = client(app.url);
  visitor = client(app.url);
  await maya.login(...ACCOUNTS.maya);
  await tom.login(...ACCOUNTS.tom);
  await admin.login(...ACCOUNTS.admin);
});
after(() => app.close());

// ---------- reviews ----------

let mayaReview;

test('a visitor must log in to write a review', async () => {
  const res = await visitor.post('/api/restaurants/1/reviews', { rating: 5, tradition_rating: 5 });
  assert.equal(res.status, 401);
});

test('Maya reviews Tawlet; the restaurant scores update', async () => {
  const res = await maya.post('/api/restaurants/1/reviews', { rating: 5, tradition_rating: 4, comment: 'Like at home.' });
  assert.equal(res.status, 201);
  assert.equal(res.body.user_id, 2);
  assert.equal(res.body.updated_at, null);
  mayaReview = res.body;

  await tom.post('/api/restaurants/1/reviews', { rating: 4, tradition_rating: 5 });

  const r = (await visitor.get('/api/restaurants/1')).body;
  assert.equal(r.review_count, 2);
  assert.equal(Number(r.avg_rating), 4.5);
  assert.equal(Number(r.tradition_score), 4.5);

  const list = await visitor.get('/api/restaurants/1/reviews');
  assert.equal(list.body.length, 2);
  assert.equal(list.body[0].user_id, 3, 'newest first');
  assert.deepEqual(list.body.map((rev) => rev.author), ['Tom', 'Maya'], 'the author name is shown');
});

test('one review per user per restaurant (409)', async () => {
  const res = await maya.post('/api/restaurants/1/reviews', { rating: 1, tradition_rating: 1 });
  assert.equal(res.status, 409);
});

test('reviews: bad bodies are 400, a missing restaurant is 404', async () => {
  for (const body of [{}, { rating: 6, tradition_rating: 3 }, { rating: 3, tradition_rating: 0 }, { rating: 2.5, tradition_rating: 3 },
    { rating: '5', tradition_rating: 3 }, { rating: 3, tradition_rating: 3, comment: 'x'.repeat(1001) }]) {
    assert.equal((await maya.post('/api/restaurants/2/reviews', body)).status, 400, JSON.stringify(body));
  }
  assert.equal((await maya.post('/api/restaurants/999/reviews', { rating: 3, tradition_rating: 3 })).status, 404);
});

test('only the author can edit a review; editing sets updated_at', async () => {
  const body = { rating: 3, tradition_rating: 3, comment: 'Changed my mind.' };
  assert.equal((await tom.put(`/api/reviews/${mayaReview.id}`, body)).status, 403);
  assert.equal((await admin.put(`/api/reviews/${mayaReview.id}`, body)).status, 403, 'not even the admin edits other people\'s words');
  assert.equal((await visitor.put(`/api/reviews/${mayaReview.id}`, body)).status, 401);

  const res = await maya.put(`/api/reviews/${mayaReview.id}`, body);
  assert.equal(res.status, 200);
  assert.equal(res.body.comment, 'Changed my mind.');
  assert.notEqual(res.body.updated_at, null);

  assert.equal((await maya.put('/api/reviews/999', body)).status, 404);
});

test('delete: not by others, yes by the author or the admin', async () => {
  assert.equal((await tom.delete(`/api/reviews/${mayaReview.id}`)).status, 403);
  assert.equal((await maya.delete(`/api/reviews/${mayaReview.id}`)).status, 204);
  assert.equal((await maya.delete(`/api/reviews/${mayaReview.id}`)).status, 404, 'already gone');

  const tomReview = (await visitor.get('/api/restaurants/1/reviews')).body[0];
  assert.equal((await admin.delete(`/api/reviews/${tomReview.id}`)).status, 204, 'the admin removes any review');
  assert.equal((await visitor.get('/api/restaurants/1')).body.review_count, 0);
});

test('top_rated puts the best reviewed restaurant first', async () => {
  await maya.post('/api/restaurants/4/reviews', { rating: 5, tradition_rating: 5 });
  await tom.post('/api/restaurants/6/reviews', { rating: 2, tradition_rating: 3 });
  const res = await visitor.get('/api/restaurants?sort=top_rated');
  assert.equal(res.body[0].name, 'Feniqia');
});

// ---------- favorites ----------

test('favorites need a login', async () => {
  assert.equal((await visitor.get('/api/favorites')).status, 401);
  assert.equal((await visitor.post('/api/favorites/1')).status, 401);
});

test('Maya starts with her 2 favorites from the sample data', async () => {
  const res = await maya.get('/api/favorites');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.map((d) => d.slug).sort(), ['kibbeh-nayeh', 'sayadieh']);
});

test('add, refuse a double, list newest first, remove', async () => {
  assert.equal((await maya.post('/api/favorites/10')).status, 201);
  assert.equal((await maya.post('/api/favorites/10')).status, 409);
  assert.equal((await maya.post('/api/favorites/999')).status, 404);
  assert.equal((await maya.post('/api/favorites/abc')).status, 400);

  const list = (await maya.get('/api/favorites')).body;
  assert.equal(list.length, 3);
  assert.equal(list[0].slug, 'manoushe-zaatar', 'newest first');

  assert.equal((await maya.delete('/api/favorites/10')).status, 204);
  assert.equal((await maya.delete('/api/favorites/10')).status, 404);
  assert.equal((await maya.get('/api/favorites')).body.length, 2);
});

test('each user only sees their own favorites', async () => {
  const toms = (await tom.get('/api/favorites')).body;
  assert.deepEqual(toms.map((d) => d.slug), ['hummus']);
});
