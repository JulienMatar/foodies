// security headers sent with every answer (what the "helmet" package does, written by hand so we can explain each one)

// Content-Security-Policy: the browser only runs scripts, styles, fonts and images from the places listed here.
// even if someone managed to put a <script> in a review, the browser would refuse to run it (XSS protection)
const CSP = [
  "default-src 'self'",
  "script-src 'self'",                                                          // only our own js/ files
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",              // inline style="--pos:..." on the meters
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "frame-src https://maps.google.com https://www.google.com",                  // the only <iframe> we show: the Google map
  "connect-src 'self'",                                                         // fetch() can only call our own API
  "frame-ancestors 'none'",                                                     // nobody can show our site in an <iframe> (clickjacking)
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

function securityHeaders(req, res, next) {
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');            // the browser trusts our Content-Type, no guessing
  res.setHeader('X-Frame-Options', 'DENY');                       // old browsers: same as frame-ancestors 'none'
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)'); // only "near me" may ask for the location
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

  // once online with https: the browser must always use https for the next 6 months
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }
  next();
}

module.exports = securityHeaders;
