// logs the HTTP method and URL of each incoming request to the console
function logger(req, res, next) {
  console.log(`${req.method} ${req.url}`);
  next();
}

module.exports = logger;
