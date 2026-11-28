// checks that req.params.id is a positive integer
// (2147483647 at most: the biggest number a SERIAL / INTEGER column can hold in PostgreSQL)
// and saves it as a number in req.validatedId

const MAX_ID = 2147483647;

function validateId(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0 || id > MAX_ID) {
    return res.status(400).json({ error: 'Invalid ID' });
  }
  req.validatedId = id;
  next();
}

module.exports = validateId;
