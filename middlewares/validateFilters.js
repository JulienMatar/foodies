// checks the query string of the list routes and saves the clean values in req.filters
//   GET /api/dishes?search=&category=&vegetarian=&vegan=&gluten_free=&without=nuts,sesame
//   GET /api/restaurants?dish=&region=&style=&sort=
// every filter is optional; an empty value (?category=) counts as not sent

const STYLES = ['heritage', 'authentic', 'fusion', 'modern'];
const SORTS = ['authentic', 'mix', 'modern', 'price_asc', 'price_desc', 'top_rated'];
const ALLERGENS = ['gluten', 'dairy', 'nuts', 'sesame', 'fish', 'eggs'];

// '' and undefined both mean "no filter"
const given = (v) => v !== undefined && v !== '';
const toId = (v) => (/^\d+$/.test(v) && Number(v) > 0 ? Number(v) : null);

function validateDishFilters(req, res, next) {
  const { search, category, vegetarian, vegan, gluten_free: glutenFree, without } = req.query;
  const filters = {};

  if (given(search)) {
    if (typeof search !== 'string' || search.length > 100) return res.status(400).json({ error: 'search must be 100 characters max' });
    filters.search = search.trim();
  }
  if (given(category)) {
    filters.category = toId(category);
    if (!filters.category) return res.status(400).json({ error: 'category must be a category id' });
  }
  if (given(vegetarian)) {
    if (vegetarian !== 'true' && vegetarian !== 'false') return res.status(400).json({ error: 'vegetarian must be true or false' });
    filters.vegetarian = vegetarian === 'true';
  }
  // vegan and gluten_free only make sense as "true": show me only those dishes
  if (given(vegan)) {
    if (vegan !== 'true') return res.status(400).json({ error: 'vegan can only be true' });
    filters.vegan = true;
  }
  if (given(glutenFree)) {
    if (glutenFree !== 'true') return res.status(400).json({ error: 'gluten_free can only be true' });
    filters.glutenFree = true;
  }
  // without=nuts,sesame -> hide the dishes that contain any of them
  if (given(without)) {
    const list = String(without).split(',').map((a) => a.trim()).filter(Boolean);
    if (!list.length || !list.every((a) => ALLERGENS.includes(a))) {
      return res.status(400).json({ error: `without can only contain: ${ALLERGENS.join(', ')}` });
    }
    filters.without = list;
  }

  req.filters = filters;
  next();
}

function validateRestaurantFilters(req, res, next) {
  const { dish, region, style, sort } = req.query;
  const filters = {};

  if (given(dish)) {
    filters.dish = toId(dish);
    if (!filters.dish) return res.status(400).json({ error: 'dish must be a dish id' });
  }
  if (given(region)) {
    filters.region = toId(region);
    if (!filters.region) return res.status(400).json({ error: 'region must be a region id' });
  }
  if (given(style)) {
    if (!STYLES.includes(style)) return res.status(400).json({ error: 'style must be heritage, authentic, fusion or modern' });
    filters.style = style;
  }
  if (given(sort)) {
    if (!SORTS.includes(sort)) return res.status(400).json({ error: `sort must be one of: ${SORTS.join(', ')}` });
    filters.sort = sort;
  }

  req.filters = filters;
  next();
}

module.exports = { validateDishFilters, validateRestaurantFilters };
