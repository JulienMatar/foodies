-- FOODIES | Complete local demonstration database
-- PostgreSQL only. Create an EMPTY database named foodies first.
-- Execute this entire file as a script in pgAdmin or DBeaver, not individual statements.
-- Includes known demo passwords; do not deploy the demo accounts publicly.
-- No existing table is dropped. If any statement fails, the transaction rolls back.

BEGIN;

-- FOODIES | PostgreSQL database schema
-- Fresh installation only. Connect to the foodies database before running.
-- Deliberately no DROP TABLE or IF NOT EXISTS: an existing schema is not overwritten.
-- Use foodies_database.sql or npm run db:setup for an atomic installation.

-- ---------- people ----------

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,         -- always saved in lowercase by the API
  password_hash VARCHAR(255),                         -- bcrypt hash; null for accounts that only use Google sign-in
  google_id     VARCHAR(255) UNIQUE,                  -- null unless the user signed in with Google
  role          VARCHAR(10)  NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT users_login_method_check CHECK (password_hash IS NOT NULL OR google_id IS NOT NULL),
  CONSTRAINT users_email_lowercase_check CHECK (email = LOWER(email)),
  CONSTRAINT users_name_not_blank CHECK (BTRIM(name) <> '')
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
  price_usd     NUMERIC(8, 2) NOT NULL CHECK (price_usd >= 0 AND price_usd < 1000000),
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
CREATE INDEX idx_reviews_restaurant ON reviews(restaurant_id, created_at DESC, id DESC);
CREATE INDEX idx_favorites_dish ON favorites(dish_id);
CREATE INDEX idx_chat_logs_created ON chat_logs(created_at DESC, id DESC);
CREATE INDEX idx_chat_logs_user ON chat_logs(user_id);
CREATE INDEX idx_chat_logs_dish ON chat_logs(matched_dish_id);
CREATE INDEX idx_favorites_user_created ON favorites(user_id, created_at DESC);

-- FOODIES | Demonstration data (fresh, empty schema only)
-- Restaurant names, contact details, locations and prices are illustrative.
-- Test accounts are public demo credentials. Never use them on a public site.
-- The installation transaction protects against partial imports.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM users) OR EXISTS (SELECT 1 FROM regions)
     OR EXISTS (SELECT 1 FROM categories) OR EXISTS (SELECT 1 FROM restaurants)
     OR EXISTS (SELECT 1 FROM dishes) OR EXISTS (SELECT 1 FROM restaurant_dishes)
     OR EXISTS (SELECT 1 FROM reviews) OR EXISTS (SELECT 1 FROM favorites)
     OR EXISTS (SELECT 1 FROM chat_logs) THEN
    RAISE EXCEPTION 'Demo seed requires an empty Foodies schema; existing records were not replaced.';
  END IF;
END;
$$;

INSERT INTO regions (id, name) VALUES
  (1, 'Beirut'), (2, 'Byblos'), (3, 'Tripoli'), (4, 'Saida'), (5, 'Zahle'), (6, 'Baalbek');          -- ids 1 to 6

INSERT INTO categories (id, name) VALUES
  (1, 'Mezze'), (2, 'Grills'), (3, 'Seafood'), (4, 'Stews'), (5, 'Desserts'), (6, 'Bakery');        -- ids 1 to 6

-- weather: 'hot' = good on hot days, 'cold' = good on cold days, 'any' = all year
-- allergens: only gluten, dairy, nuts, sesame, fish, eggs
-- meat: none, lamb, beef, chicken or fish
INSERT INTO dishes
  (id, slug, name_en, name_ar, description, category_id, weather,
   ingredients, is_vegetarian, is_vegan, is_gluten_free, allergens, meat, served_raw, good_to_know, first_timer)
VALUES
  (1, 'hummus', 'Hummus', 'حمص',
   'Chickpea purée with tahini, lemon and garlic, served with olive oil.', 1, 'any',
   ARRAY['chickpeas', 'tahini (sesame paste)', 'lemon juice', 'garlic', 'olive oil'],
   TRUE, TRUE, TRUE, ARRAY['sesame'], 'none', FALSE,
   'Tear a piece of Lebanese bread and use it as a spoon. "Hummus bi lahmeh" comes topped with fried minced meat: ask if you avoid meat.', TRUE),

  (2, 'tabbouleh', 'Tabbouleh', 'تبولة',
   'Parsley salad with bulgur, tomato, mint, lemon and olive oil.', 1, 'hot',
   ARRAY['flat-leaf parsley', 'fine bulgur (wheat)', 'tomato', 'mint', 'spring onion', 'lemon juice', 'olive oil'],
   TRUE, TRUE, FALSE, ARRAY['gluten'], 'none', FALSE,
   'In Lebanon it is a herb salad, not a grain salad: mostly parsley, chopped very fine. Scoop it with crisp lettuce or cabbage leaves.', TRUE),

  (3, 'fattoush', 'Fattoush', 'فتوش',
   'Mixed salad with toasted bread, sumac and pomegranate molasses.', 1, 'hot',
   ARRAY['lettuce', 'tomato', 'cucumber', 'radish', 'purslane', 'mint', 'toasted pita bread', 'sumac', 'pomegranate molasses', 'olive oil'],
   TRUE, TRUE, FALSE, ARRAY['gluten'], 'none', FALSE,
   'Sumac, a red berry powder, gives the lemony taste. The bread is added at the last minute so it stays crunchy.', TRUE),

  (4, 'baba-ghanouj', 'Baba Ghanouj', 'بابا غنوج',
   'Smoky grilled eggplant dip with tahini and lemon.', 1, 'any',
   ARRAY['eggplant charred over a flame', 'tahini (sesame paste)', 'lemon juice', 'garlic', 'olive oil', 'pomegranate seeds'],
   TRUE, TRUE, TRUE, ARRAY['sesame'], 'none', FALSE,
   'Many Lebanese homes call this tahini version "mtabbal". The smoky taste comes from burning the eggplant skin over a fire.', FALSE),

  (5, 'kibbeh-nayeh', 'Kibbeh Nayeh', 'كبة نية',
   'Raw lamb with fine bulgur and spices, served with olive oil and mint.', 1, 'any',
   ARRAY['very fresh lean lamb (raw)', 'fine bulgur (wheat)', 'onion', 'mint', 'marjoram', 'kammouneh spice mix', 'olive oil'],
   FALSE, FALSE, FALSE, ARRAY['gluten'], 'lamb', TRUE,
   'Served raw, like a tartare, with fresh mint, spring onion and bread. Not for pregnant women or anyone who avoids raw meat.', FALSE),

  (6, 'shish-taouk', 'Shish Taouk', 'شيش طاووق',
   'Grilled chicken skewers marinated in garlic, lemon and yogurt.', 2, 'any',
   ARRAY['chicken breast', 'yogurt', 'garlic', 'lemon juice', 'tomato paste', 'paprika', 'olive oil'],
   FALSE, FALSE, TRUE, ARRAY['dairy'], 'chicken', FALSE,
   'Comes with toum, a fluffy white garlic sauce (no eggs, but very strong), pickles and fries. A safe first grill to try.', TRUE),

  (7, 'sayadieh', 'Sayadieh', 'صيادية',
   'Fish on caramelised-onion rice, topped with toasted nuts.', 3, 'cold',
   ARRAY['white fish', 'rice', 'onions cooked until dark brown', 'cumin', 'toasted pine nuts', 'almonds', 'tahini and lemon sauce'],
   FALSE, FALSE, TRUE, ARRAY['fish', 'nuts', 'sesame'], 'fish', FALSE,
   'The fisherman''s dish of the coast (Saida, Tripoli, Byblos). The rice is brown because the onions are cooked very slowly.', FALSE),

  (8, 'mloukhieh', 'Mloukhieh', 'ملوخية',
   'Jute leaf stew with chicken, served over rice.', 4, 'cold',
   ARRAY['jute leaves (mloukhieh)', 'chicken', 'chicken broth', 'garlic', 'coriander', 'lemon', 'rice with vermicelli'],
   FALSE, FALSE, FALSE, ARRAY['gluten'], 'chicken', FALSE,
   'A home-cooked Sunday dish. Eat it with a spoon over rice, with chopped onions soaked in vinegar on top.', FALSE),

  (9, 'knefeh', 'Knefeh', 'كنافة',
   'Warm cheese pastry soaked in sugar syrup, often eaten in a sesame bun.', 5, 'cold',
   ARRAY['semolina crust', 'white akkawi cheese', 'butter', 'sugar syrup with orange blossom water', 'pistachios', 'sesame ka''ak bun'],
   TRUE, FALSE, FALSE, ARRAY['gluten', 'dairy', 'nuts', 'sesame'], 'none', FALSE,
   'A breakfast sweet, eaten hot and stretchy inside a sesame ka''ak bun. Tripoli is famous for it.', TRUE),

  (10, 'manoushe-zaatar', 'Manoushe Zaatar', 'منقوشة زعتر',
   'Flatbread baked with thyme, sesame and olive oil.', 6, 'any',
   ARRAY['bread dough (wheat)', 'za''atar (wild thyme, sumac, sesame)', 'olive oil'],
   TRUE, TRUE, FALSE, ARRAY['gluten', 'sesame'], 'none', FALSE,
   'The Lebanese breakfast, baked to order at the neighbourhood furn. Fold it and eat it with tomato, mint and olives.', TRUE),

  (11, 'falafel', 'Falafel', 'فلافل',
   'Crispy fried balls of chickpeas, fava beans and herbs, wrapped in bread with tahini sauce.', 1, 'any',
   ARRAY['chickpeas', 'fava beans', 'parsley', 'coriander', 'onion', 'garlic', 'cumin', 'tahini sauce', 'pickled turnips', 'Lebanese bread'],
   TRUE, TRUE, FALSE, ARRAY['gluten', 'sesame'], 'none', FALSE,
   'Street food sold in a rolled sandwich. The balls themselves have no wheat: ask for a plate without bread if you avoid gluten.', TRUE),

  (12, 'warak-enab', 'Warak Enab', 'ورق عنب',
   'Vine leaves rolled around rice, tomato and herbs, cooked in lemon and olive oil.', 1, 'hot',
   ARRAY['vine leaves', 'rice', 'tomato', 'parsley', 'mint', 'onion', 'lemon juice', 'olive oil'],
   TRUE, TRUE, TRUE, ARRAY[]::TEXT[], 'none', FALSE,
   'This is the cold olive-oil version ("bi zeit"). There is also a hot version cooked with lamb: check which one you order.', TRUE),

  (13, 'mjaddara', 'Mjaddara', 'مجدرة',
   'Lentils and rice cooked together, topped with crispy fried onions.', 4, 'cold',
   ARRAY['brown lentils', 'rice', 'onions fried until crispy', 'cumin', 'olive oil'],
   TRUE, TRUE, TRUE, ARRAY[]::TEXT[], 'none', FALSE,
   'A humble dish that everyone loves, eaten during Lent. It is served warm or cold with a salad, pickles or yogurt.', FALSE),

  (14, 'sfiha', 'Sfiha Baalbakiyeh', 'صفيحة بعلبكية',
   'Small square open pies of minced lamb, tomato and onion, the pride of Baalbek.', 6, 'any',
   ARRAY['bread dough (wheat)', 'minced lamb', 'tomato', 'onion', 'pomegranate molasses', 'seven spices'],
   FALSE, FALSE, FALSE, ARRAY['gluten'], 'lamb', FALSE,
   'Baked in the furn and ordered by the dozen. Squeeze lemon on top and eat them with yogurt or a cold drink.', FALSE);   -- ids 1 to 14

-- Real restaurant names, addresses and publicly listed contacts checked 2026-11-27.
-- Published phone numbers are not call-tested; Lakkis also lists reservation hotline 1661.
-- Map pins are approximate; NULL means a location was not sufficiently verified.
-- Price levels and styles are project classifications, not official ratings.
-- Tawlet Mar Mikhael: https://www.soukeltayeb.com/tawlet
-- Cross-check: https://joinpearl.co/restaurants/beirut/tawlet
-- Map: https://opentravelguide.com/lebanon/beirut/restaurants/tawlet-mar-mikhael/
-- Em Sherif Cafe: https://emsherif-cafe.com/
-- Cross-check: https://www.waze.com/live-map/directions/lb/mount-lebanon-governorate/beirut/em-sherif-cafe?to=place.ChIJQSFs8ecWHxURvuGYlDezBqE
-- Map: https://lebanon.worldplaces.me/review/94927567-em-sherif-cafe.html
-- Liza Beirut: https://lizabeirut.com/
-- Cross-check: https://www.sky-management.net/liza-beirut.html
-- Map: https://www.yellowpages.net/phone-961-1208108-lebanese-restaurant-Beirut-LB81149.html
-- Feniqia: https://staging.jbail-byblostourism.org/en/listing/Feneqia
-- Cross-check: https://www.tripadvisor.com/Restaurant_Review-g298264-d2019823-Reviews-Feniqia-Byblos_Mount_Lebanon_Governorate.html
-- Map: https://lebanon.worldplaces.me/lebanese-restaurants-in-byblos/22079758-feniqia.html
-- Silver Shore Restaurant: https://guide.moovtoo.com/LB/en/food-drinks/detail/silver-shore-restaurant-17911
-- Cross-check: https://www.indexoflebanon.com/directory/restaurants-in-lebanon/lebanon-company-in-tripoli_silver-shore.php
-- Map: https://www.bizmideast.com/LB/silver-shore-restaurant-06-601-385
-- Chahine Seafood Saida: https://chahineseafood.com/
-- Cross-check: https://restaurantguru.com/Chahine-seafood-saida-Sidon
-- Map: https://eatoutmap.com/en/lebanon/sidon/chahine-seafood-saida
-- Mersal: https://mersalleb.com/contact-us/
-- Cross-check: https://restaurantguru.com/MERSAL-Zahle
-- Lakkis Farm Baalbek: https://www.lakkis.farm/fr/branches/baalbak
-- Map: https://mapcarta.com/N6390245285
-- Silver Shore: a more recent directory also lists +961 71 004 600; landline not call-tested.
INSERT INTO restaurants (id, name, region_id, address, phone, lat, lng, price_level, style) VALUES
  (1, 'Tawlet Mar Mikhael', 1, 'Armenia Street, Mar Mikhael, Beirut', '+961 81 266 060', 33.8972, 35.5259, 2, 'authentic'),
  (2, 'Em Sherif Cafe', 1, 'Minet El Hosn, Downtown, Beirut', '+961 78 988 989', 33.89607, 35.50678, 4, 'modern'),
  (3, 'Liza Beirut', 1, 'Doumani Street, Trabaud, Achrafieh, Beirut', '+961 71 717 105', 33.889117, 35.512416, 4, 'modern'),
  (4, 'Feniqia', 2, 'Place de la Citadelle, Rue Pepe Abed, Byblos', '+961 9 540 444', 34.12088, 35.64592, 3, 'heritage'),
  (5, 'Silver Shore Restaurant', 3, 'El Mina, Tripoli', '+961 6 601 385', 34.454412, 35.809578, 3, 'authentic'),
  (6, 'Chahine Seafood Saida', 4, 'H97P+CXQ, Saida', '+961 3 885 022', 33.563587, 35.387484, 2, 'authentic'),
  (7, 'Mersal', 5, 'Boulevard Berdawni, across from Grand Kadri Hotel, Zahle', '+961 81 944 000', NULL, NULL, 3, 'fusion'),
  (8, 'Lakkis Farm Baalbek', 6, 'Douris Main Road, Baalbek', '+961 4 402 559', 33.9935, 36.17577, 2, 'heritage');

-- DEMO ONLY: original project menu associations, prices and availability are illustrative,
-- not verified menus for these real restaurants. Do not present as official offers.
INSERT INTO restaurant_dishes (restaurant_id, dish_id, price_usd, available) VALUES
  (1, 1, 4.00, TRUE),  (1, 2, 5.00, TRUE),  (1, 5, 9.00, TRUE),  (1, 8, 8.00, TRUE),  (1, 12, 6.00, TRUE), (1, 13, 5.00, TRUE),
  (2, 1, 9.00, TRUE),  (2, 3, 11.00, TRUE), (2, 6, 18.00, TRUE), (2, 9, 10.00, TRUE),
  (3, 1, 7.00, TRUE),  (3, 4, 8.00, TRUE),  (3, 5, 15.00, TRUE), (3, 6, 14.00, FALSE), (3, 11, 6.00, TRUE),
  (4, 2, 4.50, TRUE),  (4, 4, 4.50, TRUE),  (4, 7, 16.00, TRUE), (4, 10, 2.00, TRUE),  (4, 12, 5.00, TRUE),
  (5, 3, 6.00, TRUE),  (5, 7, 20.00, TRUE), (5, 9, 5.00, TRUE),
  (6, 1, 5.00, TRUE),  (6, 7, 15.00, TRUE), (6, 10, 2.50, TRUE), (6, 11, 3.00, TRUE),
  (7, 2, 6.00, TRUE),  (7, 5, 12.00, TRUE), (7, 6, 12.00, TRUE), (7, 4, 6.00, TRUE),  (7, 12, 7.00, TRUE),
  (8, 14, 4.00, TRUE), (8, 1, 3.50, TRUE),  (8, 2, 4.00, TRUE),  (8, 13, 4.00, TRUE), (8, 11, 2.50, FALSE);

-- sample accounts so you can log in and test (test passwords only, never real ones):
--   admin@foodies.test / Admin123!      (admin: can add/edit/delete dishes and restaurants)
--   maya@foodies.test  / Password123!
--   tom@foodies.test   / Password123!
-- password_hash is the bcrypt hash of the password, never the password itself.
INSERT INTO users (id, name, email, password_hash, role) VALUES
  (1, 'Admin', 'admin@foodies.test', '$2b$10$TDeEgyK/.qzfQroVpMrwY.1xVfkcFU3Jczs5SgGSA/hU8f8Hu9aA.', 'admin'),
  (2, 'Maya',  'maya@foodies.test',  '$2b$10$5hEF.7qpX9mRXb/LRxtDSeVR2CrUcd4VklcmyjCib..l6s/Dv7WTO', 'user'),
  (3, 'Tom',   'tom@foodies.test',   '$2b$10$5hEF.7qpX9mRXb/LRxtDSeVR2CrUcd4VklcmyjCib..l6s/Dv7WTO', 'user');   -- ids 1 to 3

-- Reviews intentionally empty: fictional reviews must not be attributed to real businesses.
-- Add real user reviews through the app.

INSERT INTO favorites (user_id, dish_id) VALUES (2, 5), (2, 7), (3, 1);

-- Explicit IDs above preserve the original website's sample relationships.
-- Restart the sequences after the imported IDs so future inserts never collide.
ALTER SEQUENCE regions_id_seq RESTART WITH 7;
ALTER SEQUENCE categories_id_seq RESTART WITH 7;
ALTER SEQUENCE dishes_id_seq RESTART WITH 15;
ALTER SEQUENCE restaurants_id_seq RESTART WITH 9;
ALTER SEQUENCE users_id_seq RESTART WITH 4;

COMMIT;
