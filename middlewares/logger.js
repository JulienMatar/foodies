// logs the HTTP method and URL of each incoming request to the console
function logger(req, res, next) {
  // quiet during npm test, so the test results stay readable
  if (process.env.NODE_ENV !== 'test') console.log(`${req.method} ${req.url}`);
  next();
}

module.exports = logger;
