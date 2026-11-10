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

// ---------- still in the browser ----------

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------- Ask Teta (mock chatbot) ----------

// other spellings people type for some dishes
const ALIASES = {
  Hummus: ['hommos', 'houmous', 'humus'],
  Knefeh: ['knafeh', 'kunafa', 'kanafeh', 'knafe'],
  'Manoushe Zaatar': ['manakish', 'manaeesh', 'manousheh', 'manouche'],
  'Shish Taouk': ['tawook', 'taouk', 'chicken'],
  Mloukhieh: ['molokhia', 'mulukhiyah', 'mlukhiye'],
  'Baba Ghanouj': ['moutabal', 'mutabal', 'eggplant'],
};

const CATEGORY_WORDS = {
  Mezze: ['mezze', 'meze', 'starter', 'salad'],
  Grills: ['grill', 'bbq', 'skewer'],
  Seafood: ['fish', 'seafood'],
  Stews: ['stew', 'home cooking'],
  Desserts: ['dessert', 'sweet', 'sugar'],
  Bakery: ['bakery', 'bread', 'breakfast'],
};

// true if a word in the question starts with `word`
function has(text, word) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z])${escaped}`).test(text);
}

function dishWords(dish) {
  return dish.name_en.toLowerCase().split(/\s+/).filter((w) => w.length >= 4).concat(ALIASES[dish.name_en] || []);
}

// returns { answer, dish_id, results: [{ restaurant, dish, price_usd }] }
export async function askTeta(question) {
  // TODO: replace with real endpoint -- POST /api/chat { question } (rate-limited, saved in chat_logs)
  const [dishes, restaurants, regions, menu] = await Promise.all([getDishes(), getRestaurantsWithScores(), getRegions(), getMenu()]);
  await wait(650);

  const q = question.toLowerCase();
  const region = regions.find((r) => has(q, r.name.toLowerCase()));
  const where = region ? ` in ${region.name}` : '';
  const cheap = /cheap|budget|afford|price|least/.test(q);

  const placesFor = (dish) => menu
    .filter((m) => m.dish_id === dish.id && m.available)
    .map((m) => ({ restaurant: restaurants.find((r) => r.id === m.restaurant_id), dish, price_usd: m.price_usd }))
    .filter((p) => p.restaurant && (!region || p.restaurant.region_id === region.id));
  const rank = (places) => places.sort(cheap
    ? (a, b) => a.price_usd - b.price_usd
    : (a, b) => b.restaurant.tradition - a.restaurant.tradition || b.restaurant.rating - a.restaurant.rating);

  // 1. the question names a dish
  const dish = dishes.find((d) => (d.name_ar && question.includes(d.name_ar)) || dishWords(d).some((w) => has(q, w)));
  if (dish) {
    const places = rank(placesFor(dish)).slice(0, 3);
    if (!places.length) {
      return { answer: `Nobody makes ${dish.name_en}${where} yet, habibi. Ask me again without the region and I'll find you a place.`, dish_id: dish.id, results: [] };
    }
    const top = places[0].restaurant;
    const count = places.length === 1 ? 'One place makes it' : `${places.length} places make it`;
    const why = cheap ? 'it has the best price' : `they score ${top.tradition} out of 5 for tradition`;
    return {
      answer: `${dish.name_en}! ${dish.description} ${count}${where}. Go to ${top.name} first, ${why}.`,
      dish_id: dish.id,
      results: places,
    };
  }

  // 2. the question describes what they want: a category, vegetarian, or the weather
  let pool = dishes;
  let filtered = false;
  const category = Object.entries(CATEGORY_WORDS).find(([, words]) => words.some((w) => has(q, w)));
  if (category) { pool = pool.filter((d) => d.category === category[0]); filtered = true; }
  if (/vegetarian|veggie|vegan|no meat/.test(q)) { pool = pool.filter((d) => d.is_vegetarian); filtered = true; }
  if (/cold|winter|rain|warm me/.test(q)) { pool = pool.filter((d) => d.weather === 'cold'); filtered = true; }
  else if (/hot day|summer|heat|fresh|light/.test(q)) { pool = pool.filter((d) => d.weather === 'hot'); filtered = true; }

  if (filtered) {
    const places = rank(pool.flatMap(placesFor));
    if (!places.length) {
      return { answer: `I can't find anything like that${where}, ya albi. Try another region, or ask me about a dish by name.`, dish_id: null, results: [] };
    }
    // the best place for each of the first 3 dishes (places is already ranked)
    const best = places.filter((p, i) => places.findIndex((x) => x.dish.id === p.dish.id) === i).slice(0, 3);
    const names = best.map((p) => p.dish.name_en);
    const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} or ${names.at(-1)}` : names[0];
    const top = best[0];
    return {
      answer: `For that, I'd have ${list}${where}. My pick: ${top.dish.name_en} at ${top.restaurant.name}.`,
      dish_id: top.dish.id,
      results: best,
    };
  }

  // 3. only a region
  if (region) {
    const here = rank(restaurants
      .filter((r) => r.region_id === region.id)
      .map((r) => ({ restaurant: r, dish: null, price_usd: null })));
    if (!here.length) return { answer: `I don't know a good place in ${region.name} yet. Soon, inshallah.`, dish_id: null, results: [] };
    const top = here[0].restaurant;
    return {
      answer: `In ${region.name}, start with ${top.name}. It's ${top.style}, and diners give it ${top.tradition} out of 5 for tradition.`,
      dish_id: null,
      results: here.slice(0, 3),
    };
  }

  return {
    answer: "Ahlan! I only know Lebanese food, habibi. Ask me about a dish like hummus or knefeh, what to eat on a cold day, or what's good in Byblos.",
    dish_id: null,
    results: [],
  };
}
