const categoriesModule = require('../modules/categories.module');

// GET /api/categories
async function getAll(req, res) {
  const categories = await categoriesModule.findAll();
  res.json(categories);
}

module.exports = { getAll };
