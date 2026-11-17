const statsModule = require('../modules/stats.module');
const chatModule = require('../modules/chat.module');
const { isOn, model } = require('../utils/helper4');

// GET /api/admin/stats -- everything the dashboard shows, in one answer
async function getStats(req, res) {
  // the 5 queries don't depend on each other: Promise.all runs them at the same time
  const [counts, topFavorites, topAsked, topRestaurants, perDay] = await Promise.all([
    statsModule.counts(),
    statsModule.topFavorites(),
    statsModule.topAsked(),
    statsModule.topRestaurants(),
    statsModule.questionsPerDay(),
  ]);

  res.json({
    counts,
    top_favorites: topFavorites,
    top_asked: topAsked,
    top_restaurants: topRestaurants,
    questions_per_day: perDay,
    chatbot: { ai: isOn(), model: isOn() ? model() : null },
  });
}

// GET /api/admin/chat-logs?page=1&limit=20 -- the questions asked to Teta, newest first
async function getChatLogs(req, res) {
  const { page, limit } = req.pagination;
  const { total, logs } = await chatModule.findLogs({ limit, offset: (page - 1) * limit });
  res.json({ page, limit, total, pages: Math.ceil(total / limit), logs });
}

module.exports = { getStats, getChatLogs };
