// checks the body of a dish request (POST, PUT)
// REQUIRED fields must be sent; the DETAILS (ingredients, diet...) are optional
// and get a default value in dishes.module.js when they are missing

const WEATHERS = ['hot', 'cold', 'any'];
const ALLERGENS = ['gluten', 'dairy', 'nuts', 'sesame', 'fish', 'eggs'];
const MEATS = ['none', 'lamb', 'beef', 'chicken', 'fish'];

const isText = (v) => typeof v === 'string';
const isTextList = (v) => Array.isArray(v) && v.every((x) => isText(x) && x.trim() !== '' && x.length <= 100);

const REQUIRED = {
  name_en: { check: (v) => isText(v) && v.trim() !== '', message: 'name_en must be a non-empty string' },
  name_ar: { check: isText, message: 'name_ar must be a string' },
  description: { check: isText, message: 'description must be a string' },
  category_id: { check: (v) => Number.isInteger(v) && v > 0, message: 'category_id must be a positive integer' },
  is_vegetarian: { check: (v) => typeof v === 'boolean', message: 'is_vegetarian must be true or false' },
  weather: { check: (v) => WEATHERS.includes(v), message: 'weather must be hot, cold or any' },
};

const DETAILS = {
  slug: { check: (v) => v === null || (isText(v) && /^[a-z0-9-]{1,40}$/.test(v)), message: 'slug must be lowercase letters, numbers and dashes' },
  ingredients: { check: isTextList, message: 'ingredients must be a list of strings' },
  is_vegan: { check: (v) => typeof v === 'boolean', message: 'is_vegan must be true or false' },
  is_gluten_free: { check: (v) => typeof v === 'boolean', message: 'is_gluten_free must be true or false' },
  allergens: { check: (v) => Array.isArray(v) && v.every((a) => ALLERGENS.includes(a)), message: `allergens can only contain: ${ALLERGENS.join(', ')}` },
  meat: { check: (v) => MEATS.includes(v), message: `meat must be one of: ${MEATS.join(', ')}` },
  served_raw: { check: (v) => typeof v === 'boolean', message: 'served_raw must be true or false' },
  good_to_know: { check: (v) => v === null || isText(v), message: 'good_to_know must be a string' },
  first_timer: { check: (v) => typeof v === 'boolean', message: 'first_timer must be true or false' },
};

function validateDish(req, res, next) {
  const body = req.body || {};

  for (const [field, rule] of Object.entries(REQUIRED)) {
    if (body[field] === undefined) return res.status(400).json({ error: `${field} is required` });
    if (!rule.check(body[field])) return res.status(400).json({ error: rule.message });
  }
  for (const [field, rule] of Object.entries(DETAILS)) {
    if (body[field] !== undefined && !rule.check(body[field])) return res.status(400).json({ error: rule.message });
  }

  // the same rules as the CHECKs in schema.sql, with a clearer message
  if (body.is_vegan && !body.is_vegetarian) return res.status(400).json({ error: 'a vegan dish must also be vegetarian' });
  if (body.is_vegetarian && body.meat && body.meat !== 'none') return res.status(400).json({ error: 'a vegetarian dish cannot have meat' });

  next();
}

module.exports = validateDish;
