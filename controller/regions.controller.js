const regionsModule = require('../modules/regions.module');

// GET /api/regions
async function getAll(req, res) {
  const regions = await regionsModule.findAll();
  res.json(regions);
}

module.exports = { getAll };
