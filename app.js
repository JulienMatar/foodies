const express = require('express');

// middlewares
const logger = require('./middlewares/logger');

// routes
const dishesRoutes = require('./routes/dishes.routes');
const restaurantsRoutes = require('./routes/restaurants.routes');
const regionsRoutes = require('./routes/regions.routes');
const categoriesRoutes = require('./routes/categories.routes');

const app = express();

// the express.json() middleware parses JSON request bodies and populates req.body
app.use(express.json());

// Application-level middleware -- logs the method and URL of every request
app.use(logger);

app.use('/api/dishes', dishesRoutes);
app.use('/api/restaurants', restaurantsRoutes);
app.use('/api/regions', regionsRoutes);
app.use('/api/categories', categoriesRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Page Not found' });
});

module.exports = app;
