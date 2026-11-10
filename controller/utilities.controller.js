const dishesModule = require('../modules/dishes.module');
const { getWeather } = require('../utils/helper2');
const { getRates } = require('../utils/helper3');

// the number of the day since 1 Jan 1970: changes once a day, the same for everybody
const dayNumber = () => Math.floor(Date.now() / (24 * 60 * 60 * 1000));

// GET /api/dish-of-the-day
// picks a dish that suits today's weather in Beirut: hot day -> 'hot' or 'any' dishes, cold day -> 'cold' or 'any'
async function getDishOfTheDay(req, res) {
  let weather = null;
  try {
    weather = await getWeather();
  } catch (err) {
    // Open-Meteo is down: still suggest a dish, chosen among all of them
    console.error('Weather unavailable:', err.message);
  }

  const dishes = await dishesModule.findForWeather(weather ? weather.type : 'any');
  const list = dishes.length ? dishes : await dishesModule.findAll();
  if (!list.length) return res.status(404).json({ error: 'There are no dishes yet' });

  // the same dish all day, a different one tomorrow
  const dish = list[dayNumber() % list.length];
  res.json({ dish_id: dish.id, dish, weather });
}

// GET /api/rates -- how many LBP and EUR for 1 USD
async function getExchangeRates(req, res) {
  try {
    res.json(await getRates());
  } catch (err) {
    console.error('Rates unavailable:', err.message);
    res.status(500).json({ error: 'Could not get the exchange rates, try again later' });
  }
}

module.exports = { getDishOfTheDay, getExchangeRates };
