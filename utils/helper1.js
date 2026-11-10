// helper1: login tokens (JWT) saved in a cookie
//
// after a login we create a JWT (a signed text holding the user's id and role)
// and send it in an httpOnly cookie: the browser sends it back with every request,
// and JavaScript in the page can't read it (protects it from XSS).

const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'token';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',                                // not sent by forms on other sites (CSRF protection)
  secure: process.env.NODE_ENV === 'production',  // https only once the site is online
};

// creates the token for a user row from the database
function createToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// returns { id, role } if the token is valid, or null if it's fake, changed or expired
function readToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

function setLoginCookie(res, user) {
  res.cookie(COOKIE_NAME, createToken(user), { ...COOKIE_OPTIONS, maxAge: MAX_AGE_MS });
}

function clearLoginCookie(res) {
  res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
}

// the user as we send it to the client: never the password hash
function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, created_at: user.created_at };
}

module.exports = { COOKIE_NAME, COOKIE_OPTIONS, readToken, setLoginCookie, clearLoginCookie, publicUser };
