// checks the body of a dish request (POST, PUT): every field must be sent

const RULES = {
  name_en: { check: (v) => typeof v === 'string' && v.trim() !== '', message: 'name_en must be a non-empty string' },
  name_ar: { check: (v) => typeof v === 'string', message: 'name_ar must be a string' },
  description: { check: (v) => typeof v === 'string', message: 'description must be a string' },
  category_id: { check: (v) => Number.isInteger(v) && v > 0, message: 'category_id must be a positive integer' },
  is_vegetarian: { check: (v) => typeof v === 'boolean', message: 'is_vegetarian must be true or false' },
};

function validateDish(req, res, next) {
  const body = req.body || {};

  for (const [field, rule] of Object.entries(RULES)) {
    if (body[field] === undefined) return res.status(400).json({ error: `${field} is required` });
    if (!rule.check(body[field])) return res.status(400).json({ error: rule.message });
  }

  next();
}

module.exports = validateDish;
