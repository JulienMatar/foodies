// checks that req.params.id is a positive integer
// and saves it as a number in req.validatedId

function validateId(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid ID' });
  }
  req.validatedId = id;
  next();
}

module.exports = validateId;
