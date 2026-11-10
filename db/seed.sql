-- Sample data so the API has something to show while we build it.
-- Run this once, right after schema.sql.
-- The restaurants, prices and phone numbers are made-up examples,
-- to be replaced with real Lebanese restaurants later.

INSERT INTO regions (name) VALUES
  ('Beirut'), ('Byblos'), ('Tripoli'), ('Saida'), ('Zahle'), ('Baalbek');          -- ids 1 to 6

INSERT INTO categories (name) VALUES
  ('Mezze'), ('Grills'), ('Seafood'), ('Stews'), ('Desserts'), ('Bakery');        -- ids 1 to 6

-- weather: 'hot' = good on hot days, 'cold' = good on cold days, 'any' = all year
-- allergens: only gluten, dairy, nuts, sesame, fish, eggs
-- meat: none, lamb, beef, chicken or fish
INSERT INTO dishes
  (slug, name_en, name_ar, description, category_id, weather,
   ingredients, is_vegetarian, is_vegan, is_gluten_free, allergens, meat, served_raw, good_to_know, first_timer)
VALUES
  ('hummus', 'Hummus', 'حمص',
   'Chickpea purée with tahini, lemon and garlic, served with olive oil.', 1, 'any',
   ARRAY['chickpeas', 'tahini (sesame paste)', 'lemon juice', 'garlic', 'olive oil'],
   TRUE, TRUE, TRUE, ARRAY['sesame'], 'none', FALSE,
   'Tear a piece of Lebanese bread and use it as a spoon. "Hummus bi lahmeh" comes topped with fried minced meat: ask if you avoid meat.', TRUE),

  ('tabbouleh', 'Tabbouleh', 'تبولة',
   'Parsley salad with bulgur, tomato, mint, lemon and olive oil.', 1, 'hot',
   ARRAY['flat-leaf parsley', 'fine bulgur (wheat)', 'tomato', 'mint', 'spring onion', 'lemon juice', 'olive oil'],
   TRUE, TRUE, FALSE, ARRAY['gluten'], 'none', FALSE,
   'In Lebanon it is a herb salad, not a grain salad: mostly parsley, chopped very fine. Scoop it with crisp lettuce or cabbage leaves.', TRUE),

  ('fattoush', 'Fattoush', 'فتوش',
   'Mixed salad with toasted bread, sumac and pomegranate molasses.', 1, 'hot',
   ARRAY['lettuce', 'tomato', 'cucumber', 'radish', 'purslane', 'mint', 'toasted pita bread', 'sumac', 'pomegranate molasses', 'olive oil'],
   TRUE, TRUE, FALSE, ARRAY['gluten'], 'none', FALSE,
   'Sumac, a red berry powder, gives the lemony taste. The bread is added at the last minute so it stays crunchy.', TRUE),

  ('baba-ghanouj', 'Baba Ghanouj', 'بابا غنوج',
   'Smoky grilled eggplant dip with tahini and lemon.', 1, 'any',
   ARRAY['eggplant charred over a flame', 'tahini (sesame paste)', 'lemon juice', 'garlic', 'olive oil', 'pomegranate seeds'],
   TRUE, TRUE, TRUE, ARRAY['sesame'], 'none', FALSE,
   'Many Lebanese homes call this tahini version "mtabbal". The smoky taste comes from burning the eggplant skin over a fire.', FALSE),

  ('kibbeh-nayeh', 'Kibbeh Nayeh', 'كبة نية',
   'Raw lamb with fine bulgur and spices, served with olive oil and mint.', 1, 'any',
   ARRAY['very fresh lean lamb (raw)', 'fine bulgur (wheat)', 'onion', 'mint', 'marjoram', 'kammouneh spice mix', 'olive oil'],
   FALSE, FALSE, FALSE, ARRAY['gluten'], 'lamb', TRUE,
   'Served raw, like a tartare, with fresh mint, spring onion and bread. Not for pregnant women or anyone who avoids raw meat.', FALSE),

  ('shish-taouk', 'Shish Taouk', 'شيش طاووق',
   'Grilled chicken skewers marinated in garlic, lemon and yogurt.', 2, 'any',
   ARRAY['chicken breast', 'yogurt', 'garlic', 'lemon juice', 'tomato paste', 'paprika', 'olive oil'],
   FALSE, FALSE, TRUE, ARRAY['dairy'], 'chicken', FALSE,
   'Comes with toum, a fluffy white garlic sauce (no eggs, but very strong), pickles and fries. A safe first grill to try.', TRUE),

  ('sayadieh', 'Sayadieh', 'صيادية',
   'Fish on caramelised-onion rice, topped with toasted nuts.', 3, 'cold',
   ARRAY['white fish', 'rice', 'onions cooked until dark brown', 'cumin', 'toasted pine nuts', 'almonds', 'tahini and lemon sauce'],
   FALSE, FALSE, TRUE, ARRAY['fish', 'nuts', 'sesame'], 'fish', FALSE,
   'The fisherman''s dish of the coast (Saida, Tripoli, Byblos). The rice is brown because the onions are cooked very slowly.', FALSE),

  ('mloukhieh', 'Mloukhieh', 'ملوخية',
   'Jute leaf stew with chicken, served over rice.', 4, 'cold',
   ARRAY['jute leaves (mloukhieh)', 'chicken', 'chicken broth', 'garlic', 'coriander', 'lemon', 'rice with vermicelli'],
   FALSE, FALSE, FALSE, ARRAY['gluten'], 'chicken', FALSE,
   'A home-cooked Sunday dish. Eat it with a spoon over rice, with chopped onions soaked in vinegar on top.', FALSE),

  ('knefeh', 'Knefeh', 'كنافة',
   'Warm cheese pastry soaked in sugar syrup, often eaten in a sesame bun.', 5, 'cold',
   ARRAY['semolina crust', 'white akkawi cheese', 'butter', 'sugar syrup with orange blossom water', 'pistachios', 'sesame ka''ak bun'],
   TRUE, FALSE, FALSE, ARRAY['gluten', 'dairy', 'nuts', 'sesame'], 'none', FALSE,
   'A breakfast sweet, eaten hot and stretchy inside a sesame ka''ak bun. Tripoli is famous for it.', TRUE),

  ('manoushe-zaatar', 'Manoushe Zaatar', 'منقوشة زعتر',
   'Flatbread baked with thyme, sesame and olive oil.', 6, 'any',
   ARRAY['bread dough (wheat)', 'za''atar (wild thyme, sumac, sesame)', 'olive oil'],
   TRUE, TRUE, FALSE, ARRAY['gluten', 'sesame'], 'none', FALSE,
   'The Lebanese breakfast, baked to order at the neighbourhood furn. Fold it and eat it with tomato, mint and olives.', TRUE),

  ('falafel', 'Falafel', 'فلافل',
   'Crispy fried balls of chickpeas, fava beans and herbs, wrapped in bread with tahini sauce.', 1, 'any',
   ARRAY['chickpeas', 'fava beans', 'parsley', 'coriander', 'onion', 'garlic', 'cumin', 'tahini sauce', 'pickled turnips', 'Lebanese bread'],
   TRUE, TRUE, FALSE, ARRAY['gluten', 'sesame'], 'none', FALSE,
   'Street food sold in a rolled sandwich. The balls themselves have no wheat: ask for a plate without bread if you avoid gluten.', TRUE),

  ('warak-enab', 'Warak Enab', 'ورق عنب',
   'Vine leaves rolled around rice, tomato and herbs, cooked in lemon and olive oil.', 1, 'hot',
   ARRAY['vine leaves', 'rice', 'tomato', 'parsley', 'mint', 'onion', 'lemon juice', 'olive oil'],
   TRUE, TRUE, TRUE, ARRAY[]::TEXT[], 'none', FALSE,
   'This is the cold olive-oil version ("bi zeit"). There is also a hot version cooked with lamb: check which one you order.', TRUE),

  ('mjaddara', 'Mjaddara', 'مجدرة',
   'Lentils and rice cooked together, topped with crispy fried onions.', 4, 'cold',
   ARRAY['brown lentils', 'rice', 'onions fried until crispy', 'cumin', 'olive oil'],
   TRUE, TRUE, TRUE, ARRAY[]::TEXT[], 'none', FALSE,
   'A humble dish that everyone loves, eaten during Lent. It is served warm or cold with a salad, pickles or yogurt.', FALSE),

  ('sfiha', 'Sfiha Baalbakiyeh', 'صفيحة بعلبكية',
   'Small square open pies of minced lamb, tomato and onion, the pride of Baalbek.', 6, 'any',
   ARRAY['bread dough (wheat)', 'minced lamb', 'tomato', 'onion', 'pomegranate molasses', 'seven spices'],
   FALSE, FALSE, FALSE, ARRAY['gluten'], 'lamb', FALSE,
   'Baked in the furn and ordered by the dozen. Squeeze lemon on top and eat them with yogurt or a cold drink.', FALSE);   -- ids 1 to 14

INSERT INTO restaurants (name, region_id, address, phone, lat, lng, price_level, style) VALUES
  ('Teta''s Table',          1, 'Gemmayzeh, Beirut',        '01 000 001', 33.8959, 35.5164, 2, 'authentic'),
  ('Cedar & Smoke',          1, 'Downtown, Beirut',         '01 000 002', 33.8966, 35.5035, 4, 'modern'),
  ('Mezze Lab',              1, 'Mar Mikhael, Beirut',      '01 000 003', 33.8975, 35.5249, 3, 'fusion'),
  ('Old Souk Kitchen',       2, 'Old Souk, Byblos',         '09 000 004', 34.1211, 35.6481, 2, 'heritage'),
  ('Al Mina Fish House',     3, 'Al Mina, Tripoli',         '06 000 005', 34.4519, 35.8124, 3, 'authentic'),
  ('Sea Castle Grill',       4, 'Old City, Saida',          '07 000 006', 33.5631, 35.3689, 2, 'fusion'),
  ('Berdawni Riverside',     5, 'Berdawni, Zahle',          '08 000 007', 33.8547, 35.9020, 3, 'heritage'),
  ('Temple Road Furn',       6, 'Near the temples, Baalbek', '08 000 008', 34.0047, 36.2110, 1, 'heritage');  -- ids 1 to 8

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
INSERT INTO users (name, email, password_hash, role) VALUES
  ('Admin', 'admin@foodies.test', '$2b$10$TDeEgyK/.qzfQroVpMrwY.1xVfkcFU3Jczs5SgGSA/hU8f8Hu9aA.', 'admin'),
  ('Maya',  'maya@foodies.test',  '$2b$10$5hEF.7qpX9mRXb/LRxtDSeVR2CrUcd4VklcmyjCib..l6s/Dv7WTO', 'user'),
  ('Tom',   'tom@foodies.test',   '$2b$10$5hEF.7qpX9mRXb/LRxtDSeVR2CrUcd4VklcmyjCib..l6s/Dv7WTO', 'user');   -- ids 1 to 3

INSERT INTO reviews (user_id, restaurant_id, rating, tradition_rating, comment) VALUES
  (2, 1, 5, 5, 'Felt like eating at my grandmother''s house.'),
  (3, 1, 4, 4, 'Great kibbeh nayeh, simple place.'),
  (2, 2, 4, 2, 'Beautiful plating, very modern take.'),
  (3, 3, 4, 3, 'Fun twists on classic mezze.'),
  (2, 4, 5, 5, 'Old stone house, recipes unchanged.'),
  (3, 5, 5, 4, 'Best sayadieh we had in Lebanon.'),
  (2, 6, 3, 3, 'Good view, average food.'),
  (3, 7, 5, 5, 'Classic Zahle mezze by the river.'),
  (2, 8, 5, 5, 'Sfiha straight out of the oven, ten minutes from the temples.');

INSERT INTO favorites (user_id, dish_id) VALUES (2, 5), (2, 7), (3, 1);
