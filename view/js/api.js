// Fetch helpers for the Foodies API (/api).
// The API always sends errors as { "error": "message" },
// so request() throws an Error carrying that message.

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch {
    throw new Error("Can't reach the server. Is it running?");
  }

  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(body?.error || `Request failed (${res.status})`);
    err.status = res.status; // so a page can react to 401 (not logged in) or 409 (already exists)
    throw err;
  }
  return body;
}

// sends a JSON body with POST / PUT
const send = (method, path, data) => request(path, { method, body: data === undefined ? undefined : JSON.stringify(data) });

// lists are asked for by several parts of a page: fetch each one only once
const cache = new Map();
function getCached(path) {
  if (!cache.has(path)) {
    cache.set(path, request(path).catch((err) => {
      cache.delete(path); // let the next call try again
      throw err;
    }));
  }
  return cache.get(path);
}

// ---------- real endpoints ----------

export const getDishes = () => getCached('/dishes');
export const getDish = (id) => getCached(`/dishes/${id}`); // the dish + the restaurants serving it
export const getRestaurants = () => getCached('/restaurants');
// the restaurant + its scores + its menu. fresh = true asks the server again (after a new review)
export function getRestaurant(id, fresh = false) {
  if (fresh) cache.delete(`/restaurants/${id}`);
  return getCached(`/restaurants/${id}`);
}
export const getRegions = () => getCached('/regions');
export const getCategories = () => getCached('/categories');
export const getRates = () => getCached('/rates'); // { USD: 1, LBP, EUR }

// the pages use rating / tradition / reviews; the API sends avg_rating / tradition_score / review_count.
// a restaurant with no reviews yet gets 0 stars and a neutral tradition score of 3
const withScores = (r) => ({
  ...r,
  rating: r.avg_rating ?? 0,
  tradition: r.tradition_score ?? 3,
  reviews: r.review_count ?? 0,
});

export async function getRestaurantsWithScores() {
  const restaurants = await getRestaurants();
  return restaurants.map(withScores);
}

// every menu row (restaurant_dishes): { restaurant_id, dish_id, price_usd, available },
// built from the menu that GET /api/restaurants/:id sends for each restaurant
export async function getMenu() {
  const restaurants = await getRestaurants();
  const details = await Promise.all(restaurants.map((r) => getRestaurant(r.id)));
  return details.flatMap((r) => r.menu.map((m) => ({
    restaurant_id: r.id, dish_id: m.dish_id, price_usd: m.price_usd, available: m.available,
  })));
}

// the restaurants that serve a dish, with its price there (from GET /api/dishes/:id)
export async function getDishMakers(dishId) {
  const dish = await getDish(dishId);
  return dish.restaurants.map(withScores);
}

// the same sort values as GET /api/restaurants?sort=
// done here because the page already has the list and changes the sort without reloading
export function sortRestaurants(list, sort) {
  const byTradition = (a, b) => b.tradition - a.tradition || b.rating - a.rating;
  const price = (r) => r.price_usd ?? r.price_level;
  const sorters = {
    authentic: byTradition,
    mix: (a, b) => (a.style === 'fusion' ? 0 : 1) - (b.style === 'fusion' ? 0 : 1) || byTradition(a, b),
    modern: (a, b) => a.tradition - b.tradition || b.rating - a.rating,
    price_asc: (a, b) => price(a) - price(b),
    price_desc: (a, b) => price(b) - price(a),
    top_rated: (a, b) => b.rating - a.rating || b.reviews - a.reviews,
    nearest: (a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity),
  };
  return [...list].sort(sorters[sort] || byTradition);
}

// GET /api/dish-of-the-day; weather is null when Open-Meteo could not be reached
export async function getDishOfTheDay() {
  const { dish_id, weather } = await request('/dish-of-the-day');
  return { dish_id, weather: weather || { city: 'Beirut', temp_c: '–', label: 'weather unavailable' } };
}

// ---------- accounts ----------
// the login is an httpOnly cookie: the browser sends it with every request by itself,
// and JavaScript can't read it, so we ask the server who is logged in

// the logged-in user, or null
export async function getMe() {
  try {
    return await request('/auth/me');
  } catch {
    return null;
  }
}

export const login = (email, password) => send('POST', '/auth/login', { email, password });
export const register = (name, email, password) => send('POST', '/auth/register', { name, email, password });
export const logout = () => send('POST', '/auth/logout');

// true if the server has Google sign-in set up: it then answers with a redirect to Google
// instead of an error (redirect: 'manual' stops the browser from following it)
export async function googleAvailable() {
  try {
    const res = await fetch('/api/auth/google', { redirect: 'manual' });
    return res.type === 'opaqueredirect';
  } catch {
    return false;
  }
}

// ---------- favorites (need a login) ----------

export const getFavorites = () => request('/favorites'); // the saved dishes, newest first
export const addFavorite = (dishId) => send('POST', `/favorites/${dishId}`);
export const removeFavorite = (dishId) => send('DELETE', `/favorites/${dishId}`);

// ---------- reviews ----------

export const getReviews = (restaurantId) => request(`/restaurants/${restaurantId}/reviews`);
export const createReview = (restaurantId, review) => send('POST', `/restaurants/${restaurantId}/reviews`, review);
export const updateReview = (id, review) => send('PUT', `/reviews/${id}`, review);
export const deleteReview = (id) => send('DELETE', `/reviews/${id}`);

// ---------- Ask Teta (POST /api/chat) ----------
// the server answers with OpenAI when it has a key, or with its built-in rules otherwise.
// history = the last messages, so Teta remembers what we were talking about

export const askTeta = (question, history = []) => send('POST', '/chat', { question, history });
export const getChatStatus = () => request('/chat/status'); // { ai: true | false, model }

// ---------- near me ----------

// the restaurants sorted by distance from a position, each with distance_km
export async function getRestaurantsNear(lat, lng) {
  const list = await request(`/restaurants?near=${lat.toFixed(4)},${lng.toFixed(4)}`);
  return list.map(withScores);
}

// ---------- admin (need an admin login) ----------

export const getAdminStats = () => request('/admin/stats');
export const getChatLogs = (page = 1, limit = 10) => request(`/admin/chat-logs?page=${page}&limit=${limit}`);
