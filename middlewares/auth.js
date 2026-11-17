// access control for the routes
//   requireUser  -> 401 if nobody is logged in; otherwise req.user = { id, role }
//   optionalUser -> never blocks; sets req.user when someone is logged in (POST /api/chat saves who asked)
//   requireAdmin -> 403 if the logged-in user is not an admin (use it after requireUser)

const { COOKIE_NAME, readToken } = require('../utils/helper1');
const usersModule = require('../modules/users.module');

function requireUser(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  const payload = token && readToken(token);
  if (!payload) return res.status(401).json({ error: 'You need to log in' });

  req.user = { id: payload.id, role: payload.role };
  next();
}

function optionalUser(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  const payload = token && readToken(token);
  if (payload) req.user = { id: payload.id, role: payload.role };
  next();
}

// the role inside the token was true when the user logged in, up to 7 days ago.
// for admin actions we read it again from the database: an admin who lost the role is blocked right away
async function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admins only' });

  const user = await usersModule.findById(req.user.id);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Admins only' });
  next();
}

module.exports = { requireUser, optionalUser, requireAdmin };
