const pool = require('./db');

// the scores of a restaurant, computed from its reviews:
//   avg_rating      -> average of reviews.rating (1 to 5), null if no reviews
//   tradition_score -> average of reviews.tradition_rating (1 modern, 5 traditional), null if no reviews
// (AVG returns NUMERIC, which pg sends as a string: ::float makes it a JS number)
const SCORES = `
  ROUND(AVG(v.rating), 1)::float           AS avg_rating,
  ROUND(AVG(v.tradition_rating), 1)::float AS tradition_score,
  COUNT(v.id)::int                         AS review_count`;

// the ORDER BY of each ?sort= value. Only these fixed texts can go in the SQL,
// never what the user typed (that would allow SQL injection)
function orderBy(sort, byDish) {
  // with ?dish= we sort by the price of that dish, otherwise by the price level (1 to 4)
  const price = byDish ? 'rd.price_usd' : 'r.price_level';
  const SORTS = {
    authentic: 'tradition_score DESC NULLS LAST, avg_rating DESC NULLS LAST, r.name',
    mix: "(r.style = 'fusion') DESC, tradition_score DESC NULLS LAST, r.name",
    modern: 'tradition_score ASC NULLS LAST, avg_rating DESC NULLS LAST, r.name',
    price_asc: `${price} ASC, r.name`,
    price_desc: `${price} DESC, r.name`,
    top_rated: 'avg_rating DESC NULLS LAST, review_count DESC, r.name',
  };
  return SORTS[sort] || 'r.name';
}

// all restaurants with their region name and scores; every filter is optional
//   filters.dish   -> only the restaurants where this dish is available (adds its price_usd)
//   filters.region -> region id
//   filters.style  -> heritage, authentic, fusion or modern
//   filters.sort   -> authentic, mix, modern, price_asc, price_desc, top_rated (default: by name)
async function findAll(filters = {}) {
  const conditions = [];
  const values = [];
  let dishJoin = '';
  let dishColumns = '';
  let dishGroup = '';

  if (filters.dish) {
    values.push(filters.dish);
    dishJoin = `JOIN restaurant_dishes rd ON rd.restaurant_id = r.id AND rd.dish_id = $${values.length} AND rd.available`;
    dishColumns = 'rd.price_usd::float AS price_usd,';
    dishGroup = ', rd.price_usd';
  }
  if (filters.region) {
    values.push(filters.region);
    conditions.push(`r.region_id = $${values.length}`);
  }
  if (filters.style) {
    values.push(filters.style);
    conditions.push(`r.style = $${values.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT r.*, g.name AS region, ${dishColumns} ${SCORES}
     FROM restaurants r
     JOIN regions g ON g.id = r.region_id
     ${dishJoin}
     LEFT JOIN reviews v ON v.restaurant_id = r.id
     ${where}
     GROUP BY r.id, g.name ${dishGroup}
     ORDER BY ${orderBy(filters.sort, Boolean(filters.dish))}`,
    values
  );
  return rows;
}

// one restaurant with its scores, or undefined if the id doesn't exist
async function findById(id) {
  const { rows } = await pool.query(
    `SELECT r.*, g.name AS region, ${SCORES}
     FROM restaurants r
     JOIN regions g ON g.id = r.region_id
     LEFT JOIN reviews v ON v.restaurant_id = r.id
     WHERE r.id = $1
     GROUP BY r.id, g.name`,
    [id]
  );
  return rows[0];
}

// inserts a restaurant and returns it with its new id
async function create(r) {
  const { rows } = await pool.query(
    `INSERT INTO restaurants (name, region_id, address, phone, lat, lng, price_level, style)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [r.name, r.region_id, r.address, r.phone, r.lat, r.lng, r.price_level, r.style]
  );
  return rows[0];
}

// replaces a restaurant; returns undefined if the id doesn't exist
async function replace(id, r) {
  const { rows } = await pool.query(
    `UPDATE restaurants
     SET name = $1, region_id = $2, address = $3, phone = $4, lat = $5, lng = $6, price_level = $7, style = $8
     WHERE id = $9
     RETURNING *`,
    [r.name, r.region_id, r.address, r.phone, r.lat, r.lng, r.price_level, r.style, id]
  );
  return rows[0];
}

// deletes a restaurant; returns true if it existed
async function remove(id) {
  const { rowCount } = await pool.query('DELETE FROM restaurants WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = { findAll, findById, create, replace, remove };
