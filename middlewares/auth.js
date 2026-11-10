// access control for the routes
//   requireUser  -> 401 if nobody is logged in; otherwise req.user = { id, role }
//   requireAdmin -> 403 if the logged-in user is not an admin (use it after requireUser)

const { COOKIE_NAME, readToken } = require('../utils/helper1');

function requireUser(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  const payload = token && readToken(token);
  if (!payload) return res.status(401).json({ error: 'You need to log in' });

  req.user = { id: payload.id, role: payload.role };
  next();
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admins only' });
  next();
}

module.exports = { requireUser, requireAdmin };
