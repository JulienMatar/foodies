// checks the body of the availability routes (which restaurant serves which dish)
//   POST /api/restaurants/:id/dishes          { dish_id, price_usd, available }  -- dish_id and price_usd required
//   PUT  /api/restaurants/:id/dishes/:dishId  { price_usd?, available? }         -- at least one of them

const RULES = {
  dish_id: { check: (v) => Number.isInteger(v) && v > 0, message: 'dish_id must be a positive integer' },
  price_usd: { check: (v) => typeof v === 'number' && v >= 0 && v < 1000000, message: 'price_usd must be a number, 0 or more' },
  available: { check: (v) => typeof v === 'boolean', message: 'available must be true or false' },
};

function validateAddDish(req, res, next) {
  const body = req.body || {};

  for (const field of ['dish_id', 'price_usd']) {
    if (body[field] === undefined) return res.status(400).json({ error: `${field} is required` });
  }
  for (const field of ['dish_id', 'price_usd', 'available']) {
    if (body[field] !== undefined && !RULES[field].check(body[field])) {
      return res.status(400).json({ error: RULES[field].message });
    }
  }

  next();
}

function validateUpdateDish(req, res, next) {
  const body = req.body || {};

  if (body.price_usd === undefined && body.available === undefined) {
    return res.status(400).json({ error: 'send price_usd, available, or both' });
  }
  for (const field of ['price_usd', 'available']) {
    if (body[field] !== undefined && !RULES[field].check(body[field])) {
      return res.status(400).json({ error: RULES[field].message });
    }
  }

  next();
}

module.exports = { validateAddDish, validateUpdateDish };
