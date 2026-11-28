// checks the body of a restaurant request (POST, PUT): every field must be sent

const STYLES = ['heritage', 'authentic', 'fusion', 'modern'];

const RULES = {
  name: { check: (v) => typeof v === 'string' && v.trim() !== '', message: 'name must be a non-empty string' },
  region_id: { check: (v) => Number.isInteger(v) && v > 0, message: 'region_id must be a positive integer' },
  address: { check: (v) => typeof v === 'string', message: 'address must be a string' },
  phone: { check: (v) => typeof v === 'string', message: 'phone must be a string' },
  // null = we don't know the exact spot yet (the map then searches the address)
  lat: { check: (v) => v === null || (typeof v === 'number' && v >= -90 && v <= 90), message: 'lat must be a number from -90 to 90, or null' },
  lng: { check: (v) => v === null || (typeof v === 'number' && v >= -180 && v <= 180), message: 'lng must be a number from -180 to 180, or null' },
  price_level: { check: (v) => Number.isInteger(v) && v >= 1 && v <= 4, message: 'price_level must be 1, 2, 3 or 4' },
  style: { check: (v) => STYLES.includes(v), message: 'style must be heritage, authentic, fusion or modern' },
};

function validateRestaurant(req, res, next) {
  const body = req.body || {};

  for (const [field, rule] of Object.entries(RULES)) {
    if (body[field] === undefined) return res.status(400).json({ error: `${field} is required` });
    if (!rule.check(body[field])) return res.status(400).json({ error: rule.message });
  }

  // a spot needs both numbers: lat without lng (or the opposite) can't be shown on a map
  if ((body.lat === null) !== (body.lng === null)) {
    return res.status(400).json({ error: 'send lat and lng together, or both null' });
  }

  next();
}

module.exports = validateRestaurant;
