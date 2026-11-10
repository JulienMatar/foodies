const pool = require('./db');

// $1, $2... are placeholders: the values are sent separately from the SQL,
// so user input can't change the query (no SQL injection)

// all dishes with their category name; every filter is optional
//   filters.search     -> text found in the English name, Arabic name or description
//   filters.category   -> category id
//   filters.vegetarian -> true or false
//   filters.vegan / filters.glutenFree -> true: only those dishes
//   filters.without    -> list of allergens to avoid, e.g. ['nuts', 'sesame']
async function findAll(filters = {}) {
  const conditions = [];
  const values = [];

  if (filters.search) {
    values.push(`%${filters.search}%`);
    const n = values.length;
    // ILIKE = LIKE without caring about upper/lower case
    conditions.push(`(d.name_en ILIKE $${n} OR d.name_ar ILIKE $${n} OR d.description ILIKE $${n})`);
  }
  if (filters.category) {
    values.push(filters.category);
    conditions.push(`d.category_id = $${values.length}`);
  }
  if (filters.vegetarian !== undefined) {
    values.push(filters.vegetarian);
    conditions.push(`d.is_vegetarian = $${values.length}`);
  }
  if (filters.vegan) conditions.push('d.is_vegan');
  if (filters.glutenFree) conditions.push('d.is_gluten_free');
  if (filters.without) {
    values.push(filters.without);
    // && means "the two lists have at least one value in common"
    conditions.push(`NOT (d.allergens && $${values.length}::text[])`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT d.*, c.name AS category
     FROM dishes d
     JOIN categories c ON c.id = d.category_id
     ${where}
     ORDER BY d.name_en`,
    values
  );
  return rows;
}

// one dish, or undefined if the id doesn't exist
async function findById(id) {
  const { rows } = await pool.query(
    `SELECT d.*, c.name AS category
     FROM dishes d
     JOIN categories c ON c.id = d.category_id
     WHERE d.id = $1`,
    [id]
  );
  return rows[0];
}

// the restaurants that have a dish on their menu, with the price and their scores.
// the ones where it is available come first, then the cheapest.
// (NUMERIC comes back from pg as a string, ::float makes it a JS number)
async function findRestaurantsServing(dishId) {
  const { rows } = await pool.query(
    `SELECT r.*, g.name AS region,
            rd.price_usd::float AS price_usd, rd.available,
            ROUND(AVG(v.rating), 1)::float           AS avg_rating,
            ROUND(AVG(v.tradition_rating), 1)::float AS tradition_score,
            COUNT(v.id)::int                         AS review_count
     FROM restaurant_dishes rd
     JOIN restaurants r ON r.id = rd.restaurant_id
     JOIN regions g ON g.id = r.region_id
     LEFT JOIN reviews v ON v.restaurant_id = r.id
     WHERE rd.dish_id = $1
     GROUP BY r.id, g.name, rd.price_usd, rd.available
     ORDER BY rd.available DESC, rd.price_usd`,
    [dishId]
  );
  return rows;
}

// the dishes that suit a weather ('hot' or 'cold'), plus the ones good all year ('any')
async function findForWeather(weather) {
  const { rows } = await pool.query(
    `SELECT d.*, c.name AS category
     FROM dishes d
     JOIN categories c ON c.id = d.category_id
     WHERE d.weather = $1 OR d.weather = 'any'
     ORDER BY d.id`,
    [weather]
  );
  return rows;
}

// the columns we write, in the order of the $1, $2... placeholders.
// the optional details get a default when they are not sent
function dishValues(dish) {
  return [
    dish.slug ?? null, dish.name_en, dish.name_ar, dish.description, dish.category_id, dish.weather,
    dish.ingredients ?? [], dish.is_vegetarian, dish.is_vegan ?? false, dish.is_gluten_free ?? false,
    dish.allergens ?? [], dish.meat ?? 'none', dish.served_raw ?? false, dish.good_to_know ?? null, dish.first_timer ?? false,
  ];
}

// inserts a dish and returns it with its new id
async function create(dish) {
  const { rows } = await pool.query(
    `INSERT INTO dishes (slug, name_en, name_ar, description, category_id, weather,
                         ingredients, is_vegetarian, is_vegan, is_gluten_free, allergens, meat, served_raw, good_to_know, first_timer)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     RETURNING *`,
    dishValues(dish)
  );
  return rows[0];
}

// replaces a dish; returns undefined if the id doesn't exist
async function replace(id, dish) {
  const { rows } = await pool.query(
    `UPDATE dishes
     SET slug = $1, name_en = $2, name_ar = $3, description = $4, category_id = $5, weather = $6,
         ingredients = $7, is_vegetarian = $8, is_vegan = $9, is_gluten_free = $10, allergens = $11,
         meat = $12, served_raw = $13, good_to_know = $14, first_timer = $15
     WHERE id = $16
     RETURNING *`,
    [...dishValues(dish), id]
  );
  return rows[0];
}

// deletes a dish; returns true if it existed
async function remove(id) {
  const { rowCount } = await pool.query('DELETE FROM dishes WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = { findAll, findById, findRestaurantsServing, findForWeather, create, replace, remove };
