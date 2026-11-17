// checks ?page= and ?limit= of the paginated lists and saves them in req.pagination
// both are optional: page 1 and 20 per page by default, 100 per page max

function validatePage(req, res, next) {
  const { page = '1', limit = '20' } = req.query;

  if (!/^\d+$/.test(page) || Number(page) < 1) return res.status(400).json({ error: 'page must be a whole number, 1 or more' });
  if (!/^\d+$/.test(limit) || Number(limit) < 1 || Number(limit) > 100) return res.status(400).json({ error: 'limit must be a whole number from 1 to 100' });

  req.pagination = { page: Number(page), limit: Number(limit) };
  next();
}

module.exports = validatePage;
