-- Foodies database: the 9 tables of the ER diagram
-- Run this in DBeaver, connected to the "foodies" database.
-- WARNING: it drops the tables first, so running it again deletes all their data.

DROP TABLE IF EXISTS chat_logs, favorites, reviews, restaurant_dishes, dishes, restaurants, categories, regions, users CASCADE;

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255),                       -- null for accounts that only use Google sign-in
  google_id     VARCHAR(255) UNIQUE,                -- null unless the user signed in with Google
  role          VARCHAR(10)  NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CHECK (password_hash IS NOT NULL OR google_id IS NOT NULL)   -- every account needs a way to log in
);

CREATE TABLE regions (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE categories (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE restaurants (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  region_id   INTEGER NOT NULL REFERENCES regions(id),
  address     VARCHAR(200),
  phone       VARCHAR(30),
  lat         DOUBLE PRECISION CHECK (lat BETWEEN -90 AND 90),
  lng         DOUBLE PRECISION CHECK (lng BETWEEN -180 AND 180),
  price_level SMALLINT NOT NULL CHECK (price_level BETWEEN 1 AND 4),
  style       VARCHAR(10) NOT NULL CHECK (style IN ('heritage', 'authentic', 'fusion', 'modern'))
);

CREATE TABLE dishes (
  id            SERIAL PRIMARY KEY,
  name_en       VARCHAR(100) NOT NULL,
  name_ar       VARCHAR(100),
  description   TEXT,
  category_id   INTEGER NOT NULL REFERENCES categories(id),
  is_vegetarian BOOLEAN NOT NULL DEFAULT FALSE,
  weather       VARCHAR(10) NOT NULL DEFAULT 'any' CHECK (weather IN ('hot', 'cold', 'any'))  -- the weather the dish suits, used by dish-of-the-day
);

-- many-to-many between restaurants and dishes, with the price
CREATE TABLE restaurant_dishes (
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  dish_id       INTEGER NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  price_usd     NUMERIC(8, 2) NOT NULL CHECK (price_usd >= 0),
  available     BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (restaurant_id, dish_id)
);

CREATE TABLE reviews (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  restaurant_id    INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  rating           SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  tradition_rating SMALLINT NOT NULL CHECK (tradition_rating BETWEEN 1 AND 5),  -- 1 very modern, 5 very traditional
  comment          VARCHAR(1000),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ,                       -- null until the review is edited
  UNIQUE (user_id, restaurant_id)                   -- one review per user per restaurant
);

CREATE TABLE favorites (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dish_id INTEGER NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, dish_id)
);

CREATE TABLE chat_logs (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,    -- null for visitors
  question        VARCHAR(500) NOT NULL,
  answer          TEXT NOT NULL,                                      -- what the chatbot replied
  matched_dish_id INTEGER REFERENCES dishes(id) ON DELETE SET NULL,   -- null if no dish matched
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- indexes on the foreign keys used in searches and joins
CREATE INDEX idx_restaurants_region ON restaurants(region_id);
CREATE INDEX idx_dishes_category ON dishes(category_id);
CREATE INDEX idx_restaurant_dishes_dish ON restaurant_dishes(dish_id);
CREATE INDEX idx_reviews_restaurant ON reviews(restaurant_id);
