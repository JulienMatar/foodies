// Error-handling middleware -- Express knows it is one because it takes 4 arguments.
// Express 5 sends here any error thrown in an async controller,
// so every error reaches the client as JSON: { "error": "message" }

// PostgreSQL error codes we can explain to the client
const PG_ERRORS = {
  23503: { status: 400, message: 'A referenced id does not exist (check the ids you sent)' },
  23505: { status: 409, message: 'This record already exists (an email, slug or name is already used)' },
  23514: { status: 400, message: 'A value is out of the allowed range' },
};

function errorHandler(err, req, res, next) {
  // the body sent is not valid JSON (thrown by express.json())
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }

  const pgError = PG_ERRORS[err.code];
  if (pgError) {
    return res.status(pgError.status).json({ error: pgError.message });
  }

  // anything else is a bug or a database problem: log it, don't show the details to the client
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}

module.exports = errorHandler;
