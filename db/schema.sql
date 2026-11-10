-- Foodies database: the 9 tables of the ER diagram
-- Run this in DBeaver, connected to the "foodies" database, then run seed.sql.
-- WARNING: it drops the tables first, so running it again deletes all their data.

DROP TABLE IF EXISTS chat_logs, favorites, reviews, restaurant_dishes, dishes, restaurants, categories, regions, users CASCADE;

-- ---------- people ----------

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,         -- always saved in lowercase by the API
  password_hash VARCHAR(255),                         -- bcrypt hash; null for accounts that only use Google sign-in
  google_id     VARCHAR(255) UNIQUE,                  -- null unless the user signed in with Google
  role          VARCHAR(10)  NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CHECK (password_hash IS NOT NULL OR google_id IS NOT NULL)   -- every account needs a way to log in
);

-- ---------- lookups ----------

CREATE TABLE regions (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE categories (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

-- ---------- catalog ----------

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
  id             SERIAL PRIMARY KEY,
  slug           VARCHAR(40) UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),   -- short name for the photo: view/img/photos/dishes/<slug>.jpg
  name_en        VARCHAR(100) NOT NULL,
  name_ar        VARCHAR(100),
  description    TEXT,
  category_id    INTEGER NOT NULL REFERENCES categories(id),
  weather        VARCHAR(10) NOT NULL DEFAULT 'any' CHECK (weather IN ('hot', 'cold', 'any')),  -- the weather the dish suits, used by dish-of-the-day

  -- what is in it, for people who don't know Lebanese food
  ingredients    TEXT[]  NOT NULL DEFAULT '{}',        -- e.g. {chickpeas, tahini, lemon}
  is_vegetarian  BOOLEAN NOT NULL DEFAULT FALSE,
  is_vegan       BOOLEAN NOT NULL DEFAULT FALSE,       -- no animal products at all (in Lebanon: "siyami", eaten during Lent)
  is_gluten_free BOOLEAN NOT NULL DEFAULT FALSE,       -- as it is usually served
  allergens      TEXT[]  NOT NULL DEFAULT '{}'
                 CHECK (allergens <@ ARRAY['gluten', 'dairy', 'nuts', 'sesame', 'fish', 'eggs']),  -- <@ means "only values from this list"
  meat           VARCHAR(10) NOT NULL DEFAULT 'none' CHECK (meat IN ('none', 'lamb', 'beef', 'chicken', 'fish')),
  served_raw     BOOLEAN NOT NULL DEFAULT FALSE,       -- raw meat or fish (e.g. kibbeh nayeh)
  good_to_know   TEXT,                                 -- how it is eaten, a tip for first-timers
  first_timer    BOOLEAN NOT NULL DEFAULT FALSE,       -- a good first try, shown in "New to Lebanese food?"

  CHECK (NOT is_vegan OR is_vegetarian),               -- vegan dishes are vegetarian too
  CHECK (NOT is_vegetarian OR meat = 'none')           -- vegetarian dishes have no meat or fish
);

-- many-to-many between restaurants and dishes: the menu, with the price
CREATE TABLE restaurant_dishes (
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  dish_id       INTEGER NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  price_usd     NUMERIC(8, 2) NOT NULL CHECK (price_usd >= 0),
  available     BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (restaurant_id, dish_id)               -- a dish is on a menu only once
);

-- ---------- what users write ----------

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

-- many-to-many between users and dishes
CREATE TABLE favorites (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dish_id    INTEGER NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),      -- so "my favorites" can show the newest first
  PRIMARY KEY (user_id, dish_id)                    -- a dish is saved only once per user
);

-- ---------- chatbot ----------

CREATE TABLE chat_logs (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,    -- null for visitors
  question        VARCHAR(500) NOT NULL,
  answer          TEXT NOT NULL,                                      -- what the chatbot replied
  matched_dish_id INTEGER REFERENCES dishes(id) ON DELETE SET NULL,   -- null if no dish matched
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- indexes on the foreign keys used in searches and joins
-- (the primary keys and UNIQUE columns already have one)
CREATE INDEX idx_restaurants_region ON restaurants(region_id);
CREATE INDEX idx_dishes_category ON dishes(category_id);
CREATE INDEX idx_restaurant_dishes_dish ON restaurant_dishes(dish_id);
CREATE INDEX idx_reviews_restaurant ON reviews(restaurant_id);
CREATE INDEX idx_favorites_dish ON favorites(dish_id);
CREATE INDEX idx_chat_logs_created ON chat_logs(created_at);
