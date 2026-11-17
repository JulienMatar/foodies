const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

// middlewares
const logger = require('./middlewares/logger');
const securityHeaders = require('./middlewares/security');
const { apiLimit } = require('./middlewares/rateLimit');
const { cacheFor, noStore } = require('./middlewares/cache');
const errorHandler = require('./middlewares/errorHandler');
const pool = require('./modules/db');

// routes
const authRoutes = require('./routes/auth.routes');
const dishesRoutes = require('./routes/dishes.routes');
const restaurantsRoutes = require('./routes/restaurants.routes');
const reviewsRoutes = require('./routes/reviews.routes');
const favoritesRoutes = require('./routes/favorites.routes');
const regionsRoutes = require('./routes/regions.routes');
const categoriesRoutes = require('./routes/categories.routes');
const utilitiesRoutes = require('./routes/utilities.routes');
const chatRoutes = require('./routes/chat.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

// don't tell attackers which framework we use (Express adds "X-Powered-By: Express" by default)
app.disable('x-powered-by');

// online, the site sits behind the host's proxy (Render, Railway...): trust it so req.ip is the
// visitor's real IP (needed by the rate limiter) and secure cookies work over https
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

// security headers on every answer (see middlewares/security.js)
app.use(securityHeaders);

// the express.json() middleware parses JSON request bodies and populates req.body.
// limit: a body bigger than 20 kB is refused (413), so nobody can flood the server with huge requests
app.use(express.json({ limit: '20kb' }));

// reads the Cookie header into req.cookies (the login token is saved in a cookie)
app.use(cookieParser());

// Application-level middleware -- logs the method and URL of every request
app.use(logger);

// serves the frontend (HTML, CSS, JS) from the view folder; / opens view/index.html
// the photos never change: the browser can keep them 7 days. HTML, CSS and JS are checked again each time
// (with the ETag, so the answer is a tiny 304 when nothing changed)
app.use(express.static(path.join(__dirname, 'view'), {
  setHeaders(res, filePath) {
    const isImage = /\.(jpe?g|png|svg|webp)$/i.test(filePath);
    res.setHeader('Cache-Control', isImage ? 'public, max-age=604800' : 'no-cache');
  },
}));

// GET /api/health -- used by the hosting service to check that the app and the database are up
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'ok', uptime_s: Math.round(process.uptime()) });
  } catch {
    res.status(503).json({ error: 'Database unavailable' });
  }
});

// every /api route: at most 600 requests per 15 minutes per visitor
app.use('/api', apiLimit);

app.use('/api/auth', noStore, authRoutes);
app.use('/api/dishes', cacheFor(60), dishesRoutes);          // admins rarely change dishes: 1 minute is fine
app.use('/api/restaurants', restaurantsRoutes);                // scores change with every review: ETag only
app.use('/api/reviews', reviewsRoutes);
app.use('/api/favorites', noStore, favoritesRoutes);           // different for every user: never cached
app.use('/api/regions', cacheFor(3600), regionsRoutes);        // almost never change: 1 hour
app.use('/api/categories', cacheFor(3600), categoriesRoutes);
app.use('/api/chat', noStore, chatRoutes);
app.use('/api/admin', noStore, adminRoutes);
app.use('/api', utilitiesRoutes); // /api/dish-of-the-day and /api/rates

app.use((req, res) => {
  res.status(404).json({ error: 'Page Not found' });
});

// must be last: catches the errors of all the routes above
app.use(errorHandler);

module.exports = app;
