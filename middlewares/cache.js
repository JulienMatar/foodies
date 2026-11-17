// HTTP caching: tells the browser how long it may keep an answer without asking the server again.
//   cacheFor(seconds) -> "Cache-Control: public, max-age=..." on GET answers that are the same for everybody
//   noStore           -> never keep it (answers that depend on who is logged in)
//
// Express also adds an ETag to every answer: when the browser asks again with If-None-Match,
// Express answers 304 Not Modified with no body if nothing changed.

function cacheFor(seconds) {
  return (req, res, next) => {
    if (req.method === 'GET') res.setHeader('Cache-Control', `public, max-age=${seconds}`);
    next();
  };
}

function noStore(req, res, next) {
  res.setHeader('Cache-Control', 'no-store');
  next();
}

module.exports = { cacheFor, noStore };
