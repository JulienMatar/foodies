const pool = require('./db');

// numbers for the admin dashboard. Each query uses GROUP BY / aggregates on our tables,
// so they always show the real state of the database.

// how many rows in each table, plus the questions asked today
async function counts() {
  const { rows } = await pool.query(
    `SELECT (SELECT COUNT(*) FROM users)::int        AS users,
            (SELECT COUNT(*) FROM dishes)::int       AS dishes,
            (SELECT COUNT(*) FROM restaurants)::int  AS restaurants,
            (SELECT COUNT(*) FROM reviews)::int      AS reviews,
            (SELECT COUNT(*) FROM favorites)::int    AS favorites,
            (SELECT COUNT(*) FROM chat_logs)::int    AS questions,
            (SELECT COUNT(*) FROM chat_logs WHERE created_at >= date_trunc('day', NOW()))::int AS questions_today`
  );
  return rows[0];
}

// the dishes saved most often in favorites
async function topFavorites(limit = 5) {
  const { rows } = await pool.query(
    `SELECT d.id, d.name_en, d.slug, COUNT(f.user_id)::int AS saves
     FROM dishes d
     JOIN favorites f ON f.dish_id = d.id
     GROUP BY d.id
     ORDER BY saves DESC, d.name_en
     LIMIT $1`,
    [limit]
  );
  return rows;
}

// the dishes people ask Teta about the most
async function topAsked(limit = 5) {
  const { rows } = await pool.query(
    `SELECT d.id, d.name_en, d.slug, COUNT(l.id)::int AS questions
     FROM chat_logs l
     JOIN dishes d ON d.id = l.matched_dish_id
     GROUP BY d.id
     ORDER BY questions DESC, d.name_en
     LIMIT $1`,
    [limit]
  );
  return rows;
}

// the best rated restaurants (with at least one review)
async function topRestaurants(limit = 5) {
  const { rows } = await pool.query(
    `SELECT r.id, r.name, g.name AS region,
            ROUND(AVG(v.rating), 1)::float AS avg_rating, COUNT(v.id)::int AS review_count
     FROM restaurants r
     JOIN regions g ON g.id = r.region_id
     JOIN reviews v ON v.restaurant_id = r.id
     GROUP BY r.id, g.name
     ORDER BY avg_rating DESC, review_count DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

// questions asked each day of the last 7 days, 0 for a day with none.
// generate_series makes the 7 days, the LEFT JOIN adds the questions of each day
async function questionsPerDay() {
  const { rows } = await pool.query(
    `SELECT to_char(day, 'YYYY-MM-DD') AS day, COUNT(l.id)::int AS questions
     FROM generate_series(date_trunc('day', NOW()) - INTERVAL '6 days', date_trunc('day', NOW()), INTERVAL '1 day') AS day
     LEFT JOIN chat_logs l ON l.created_at >= day AND l.created_at < day + INTERVAL '1 day'
     GROUP BY day
     ORDER BY day`
  );
  return rows;
}

module.exports = { counts, topFavorites, topAsked, topRestaurants, questionsPerDay };
