// checks the body of a review (POST /api/restaurants/:id/reviews, PUT /api/reviews/:id)
// rating and tradition_rating are required, comment is optional

const isScore = (v) => Number.isInteger(v) && v >= 1 && v <= 5;

const RULES = {
  rating: { required: true, check: isScore, message: 'rating must be a whole number from 1 to 5' },
  tradition_rating: { required: true, check: isScore, message: 'tradition_rating must be a whole number from 1 (modern) to 5 (traditional)' },
  comment: { required: false, check: (v) => v === null || (typeof v === 'string' && v.length <= 1000), message: 'comment must be a string (1000 characters max)' },
};

function validateReview(req, res, next) {
  const body = req.body || {};

  for (const [field, rule] of Object.entries(RULES)) {
    if (body[field] === undefined) {
      if (rule.required) return res.status(400).json({ error: `${field} is required` });
      continue;
    }
    if (!rule.check(body[field])) return res.status(400).json({ error: rule.message });
  }

  next();
}

module.exports = validateReview;
