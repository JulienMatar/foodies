const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

// middlewares
const logger = require('./middlewares/logger');
const errorHandler = require('./middlewares/errorHandler');

// routes
const authRoutes = require('./routes/auth.routes');
const dishesRoutes = require('./routes/dishes.routes');
const restaurantsRoutes = require('./routes/restaurants.routes');
const reviewsRoutes = require('./routes/reviews.routes');
const favoritesRoutes = require('./routes/favorites.routes');
const regionsRoutes = require('./routes/regions.routes');
const categoriesRoutes = require('./routes/categories.routes');
const utilitiesRoutes = require('./routes/utilities.routes');

const app = express();

// the express.json() middleware parses JSON request bodies and populates req.body
app.use(express.json());

// reads the Cookie header into req.cookies (the login token is saved in a cookie)
app.use(cookieParser());

// Application-level middleware -- logs the method and URL of every request
app.use(logger);

// serves the frontend (HTML, CSS, JS) from the view folder; / opens view/index.html
app.use(express.static(path.join(__dirname, 'view')));

app.use('/api/auth', authRoutes);
app.use('/api/dishes', dishesRoutes);
app.use('/api/restaurants', restaurantsRoutes); // also /:id/dishes and /:id/reviews
app.use('/api/reviews', reviewsRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/regions', regionsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api', utilitiesRoutes); // /api/dish-of-the-day and /api/rates

app.use((req, res) => {
  res.status(404).json({ error: 'Page Not found' });
});

// must be last: catches the errors of all the routes above
app.use(errorHandler);

module.exports = app;
