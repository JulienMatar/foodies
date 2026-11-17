const pool = require('./db');

// ---------- what Teta knows: the dishes, the restaurants and the menus ----------
// the chatbot needs the whole catalog for every question. It changes rarely,
// so we keep it in memory for 5 minutes instead of running 3 queries per question (server-side cache).
// the admin routes call clearCatalogCache() after a change, so Teta never stays out of date.

const CATALOG_MS = 5 * 60 * 1000;
let catalog = null;
let catalogAt = 0;

async function getCatalog() {
  if (catalog && Date.now() - catalogAt < CATALOG_MS) return catalog;

  const [dishes, restaurants, menu] = await Promise.all([
    pool.query(
      `SELECT d.*, c.name AS category
       FROM dishes d JOIN categories c ON c.id = d.category_id
       ORDER BY d.id`
    ),
    pool.query(
      `SELECT r.*, g.name AS region,
              ROUND(AVG(v.rating), 1)::float           AS avg_rating,
              ROUND(AVG(v.tradition_rating), 1)::float AS tradition_score,
              COUNT(v.id)::int                         AS review_count
       FROM restaurants r
       JOIN regions g ON g.id = r.region_id
       LEFT JOIN reviews v ON v.restaurant_id = r.id
       GROUP BY r.id, g.name
       ORDER BY r.id`
    ),
    pool.query('SELECT restaurant_id, dish_id, price_usd::float AS price_usd, available FROM restaurant_dishes'),
  ]);

  catalog = { dishes: dishes.rows, restaurants: restaurants.rows, menu: menu.rows };
  catalogAt = Date.now();
  return catalog;
}

function clearCatalogCache() {
  catalog = null;
}

// ---------- chat_logs ----------

// saves a question and Teta's answer; user_id and matched_dish_id can be null
async function log({ userId, question, answer, dishId }) {
  const { rows } = await pool.query(
    `INSERT INTO chat_logs (user_id, question, answer, matched_dish_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId ?? null, question, answer, dishId ?? null]
  );
  return rows[0];
}

// how many questions were asked since midnight (used to cap the OpenAI bill per day)
async function countToday() {
  const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM chat_logs WHERE created_at >= date_trunc('day', NOW())");
  return rows[0].n;
}

// the newest questions first, with the name of who asked and the dish found.
// LIMIT / OFFSET = one page of results
async function findLogs({ limit, offset }) {
  const { rows } = await pool.query(
    `SELECT l.id, l.question, l.answer, l.created_at,
            l.user_id, u.name AS user_name,
            l.matched_dish_id, d.name_en AS matched_dish
     FROM chat_logs l
     LEFT JOIN users u ON u.id = l.user_id
     LEFT JOIN dishes d ON d.id = l.matched_dish_id
     ORDER BY l.created_at DESC, l.id DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  const { rows: count } = await pool.query('SELECT COUNT(*)::int AS total FROM chat_logs');
  return { total: count[0].total, logs: rows };
}

module.exports = { getCatalog, clearCatalogCache, log, countToday, findLogs };
