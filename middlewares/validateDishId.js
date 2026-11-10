// checks that req.params.dishId is a positive integer
// and saves it as a number in req.validatedDishId
// (same idea as validateId, for the routes that have /:dishId)

function validateDishId(req, res, next) {
  const dishId = Number(req.params.dishId);
  if (!Number.isInteger(dishId) || dishId <= 0) {
    return res.status(400).json({ error: 'Invalid dish ID' });
  }
  req.validatedDishId = dishId;
  next();
}

module.exports = validateDishId;
