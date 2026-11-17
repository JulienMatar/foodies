// rate limiting: each visitor (IP address) can only send a few requests in a time window.
//   - stops password guessing on /api/auth/login (brute force)
//   - stops one person from spending all our OpenAI credit on /api/chat
//
// rateLimit({ name, windowMs, max }) returns a middleware.
// the counters are kept in memory: fine for one server (they reset when it restarts).

const buckets = new Map(); // "name:ip" -> { count, resetAt }

function rateLimit({ name, windowMs, max, message }) {
  return (req, res, next) => {
    const key = `${name}:${req.ip}`;
    const now = Date.now();
    let bucket = buckets.get(key);

    // first request, or the window is over: start counting again
    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;

    const secondsLeft = Math.ceil((bucket.resetAt - now) / 1000);
    res.setHeader('RateLimit-Limit', max);
    res.setHeader('RateLimit-Remaining', Math.max(0, max - bucket.count));
    res.setHeader('RateLimit-Reset', secondsLeft);

    if (bucket.count > max) {
      res.setHeader('Retry-After', secondsLeft);
      return res.status(429).json({ error: message || `Too many requests, try again in ${secondsLeft} seconds` });
    }
    next();
  };
}

// every 10 minutes, forget the windows that are over so the Map doesn't grow forever.
// unref() lets the program stop even if this timer is still waiting
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) if (now >= bucket.resetAt) buckets.delete(key);
}, 10 * 60 * 1000).unref();

// the limits used in the routes
const MINUTE = 60 * 1000;
const apiLimit = rateLimit({ name: 'api', windowMs: 15 * MINUTE, max: 600 });
const authLimit = rateLimit({
  name: 'auth', windowMs: 15 * MINUTE, max: 10,
  message: 'Too many sign-in attempts, wait 15 minutes and try again',
});
const chatLimit = rateLimit({
  name: 'chat', windowMs: MINUTE, max: 6,
  message: 'Teta needs a minute to breathe, habibi. Ask again in a moment',
});

module.exports = { rateLimit, apiLimit, authLimit, chatLimit };
