const chatModule = require('../modules/chat.module');
const { isOn, model, askOpenAI } = require('../utils/helper4');
const { askRules } = require('../utils/helper5');

// at most this many AI answers per day for the whole site (protects the OpenAI bill).
// after that, Teta still answers, with the built-in rules
const DAILY_AI_LIMIT = Number(process.env.CHAT_DAILY_LIMIT) || 300;

// the AI only sends ids: keep the picks that really exist, and add the names and the price
function buildResults(picks, catalog) {
  const results = [];
  for (const pick of picks.slice(0, 3)) {
    const restaurant = catalog.restaurants.find((r) => r.id === pick.restaurant_id);
    if (!restaurant) continue; // an id the model made up: ignored
    const dish = catalog.dishes.find((d) => d.id === pick.dish_id) || null;
    const onMenu = dish && catalog.menu.find((m) => m.restaurant_id === restaurant.id && m.dish_id === dish.id);
    results.push({
      restaurant: {
        id: restaurant.id, name: restaurant.name, region: restaurant.region,
        style: restaurant.style, price_level: restaurant.price_level,
      },
      dish: dish ? { id: dish.id, name_en: dish.name_en, slug: dish.slug } : null,
      price_usd: onMenu ? onMenu.price_usd : null,
    });
  }
  return results;
}

// POST /api/chat { question, history? }
// -> { answer, dish_id, results: [{ restaurant, dish, price_usd }], source: 'ai' | 'rules' }
async function ask(req, res) {
  const question = req.body.question.trim();
  const catalog = await chatModule.getCatalog();

  let reply = null;
  let source = 'rules';

  if (isOn() && (await chatModule.countToday()) < DAILY_AI_LIMIT) {
    try {
      reply = await askOpenAI({ question, history: req.body.history, catalog });
      source = 'ai';
    } catch (err) {
      // OpenAI is down, too slow, or the key has no credit left: fall back to the rules
      console.error('OpenAI unavailable:', err.message);
    }
  }
  if (!reply) reply = askRules(question, catalog);

  // a dish id the model made up becomes null (matched_dish_id is a foreign key)
  const dishId = catalog.dishes.some((d) => d.id === reply.dish_id) ? reply.dish_id : null;

  await chatModule.log({ userId: req.user?.id, question, answer: reply.answer, dishId });

  res.json({
    answer: reply.answer,
    dish_id: dishId,
    results: buildResults(reply.picks || [], catalog),
    source,
  });
}

// GET /api/chat/status -- lets the page say if Teta uses AI (never sends the key itself)
function status(req, res) {
  res.json({ ai: isOn(), model: isOn() ? model() : null });
}

module.exports = { ask, status };
