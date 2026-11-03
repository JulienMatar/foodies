-- Sample data so the API has something to show while we build it.
-- Run this once, right after schema.sql.
-- The restaurants, prices and phone numbers are made-up examples,
-- to be replaced with real Lebanese restaurants later.

INSERT INTO regions (name) VALUES
  ('Beirut'), ('Byblos'), ('Tripoli'), ('Saida'), ('Zahle');                       -- ids 1 to 5

INSERT INTO categories (name) VALUES
  ('Mezze'), ('Grills'), ('Seafood'), ('Stews'), ('Desserts'), ('Bakery');        -- ids 1 to 6

INSERT INTO dishes (name_en, name_ar, description, category_id, is_vegetarian) VALUES
  ('Hummus',        'حمص',         'Chickpea purée with tahini, lemon and garlic, served with olive oil.', 1, TRUE),
  ('Tabbouleh',     'تبولة',        'Parsley salad with bulgur, tomato, mint, lemon and olive oil.', 1, TRUE),
  ('Fattoush',      'فتوش',         'Mixed salad with toasted bread, sumac and pomegranate molasses.', 1, TRUE),
  ('Baba Ghanouj',  'بابا غنوج',    'Smoky grilled eggplant dip with tahini and lemon.', 1, TRUE),
  ('Kibbeh Nayeh',  'كبة نية',      'Raw lamb with fine bulgur and spices, served with olive oil and mint.', 1, FALSE),
  ('Shish Taouk',   'شيش طاووق',    'Grilled chicken skewers marinated in garlic, lemon and yogurt.', 2, FALSE),
  ('Sayadieh',      'صيادية',       'Fish on caramelised-onion rice, topped with toasted nuts.', 3, FALSE),
  ('Mloukhieh',     'ملوخية',       'Jute leaf stew with chicken, served over rice.', 4, FALSE),
  ('Knefeh',        'كنافة',        'Warm cheese pastry soaked in sugar syrup, often eaten in a sesame bun.', 5, TRUE),
  ('Manoushe Zaatar', 'منقوشة زعتر', 'Flatbread baked with thyme, sesame and olive oil.', 6, TRUE);    -- ids 1 to 10

INSERT INTO restaurants (name, region_id, address, phone, lat, lng, price_level, style) VALUES
  ('Teta''s Table',          1, 'Gemmayzeh, Beirut',        '01 000 001', 33.8959, 35.5164, 2, 'authentic'),
  ('Cedar & Smoke',          1, 'Downtown, Beirut',         '01 000 002', 33.8966, 35.5035, 4, 'modern'),
  ('Mezze Lab',              1, 'Mar Mikhael, Beirut',      '01 000 003', 33.8975, 35.5249, 3, 'fusion'),
  ('Old Souk Kitchen',       2, 'Old Souk, Byblos',         '09 000 004', 34.1211, 35.6481, 2, 'heritage'),
  ('Al Mina Fish House',     3, 'Al Mina, Tripoli',         '06 000 005', 34.4519, 35.8124, 3, 'authentic'),
  ('Sea Castle Grill',       4, 'Old City, Saida',          '07 000 006', 33.5631, 35.3689, 2, 'fusion'),
  ('Berdawni Riverside',     5, 'Berdawni, Zahle',          '08 000 007', 33.8547, 35.9020, 3, 'heritage');  -- ids 1 to 7

INSERT INTO restaurant_dishes (restaurant_id, dish_id, price_usd, available) VALUES
  (1, 1, 4.00, TRUE),  (1, 2, 5.00, TRUE),  (1, 5, 9.00, TRUE),  (1, 8, 8.00, TRUE),
  (2, 1, 9.00, TRUE),  (2, 3, 11.00, TRUE), (2, 6, 18.00, TRUE), (2, 9, 10.00, TRUE),
  (3, 1, 7.00, TRUE),  (3, 4, 8.00, TRUE),  (3, 5, 15.00, TRUE), (3, 6, 14.00, FALSE),
  (4, 2, 4.50, TRUE),  (4, 4, 4.50, TRUE),  (4, 7, 16.00, TRUE), (4, 10, 2.00, TRUE),
  (5, 3, 6.00, TRUE),  (5, 7, 20.00, TRUE), (5, 9, 5.00, TRUE),
  (6, 1, 5.00, TRUE),  (6, 7, 15.00, TRUE), (6, 10, 2.50, TRUE),
  (7, 2, 6.00, TRUE),  (7, 5, 12.00, TRUE), (7, 6, 12.00, TRUE), (7, 4, 6.00, TRUE);

-- sample accounts so the sample reviews have authors.
-- they cannot log in: real bcrypt passwords come with the login feature.
INSERT INTO users (name, email, password_hash, role) VALUES
  ('Admin',      'admin@foodies.test', 'not-a-real-hash', 'admin'),
  ('Maya',       'maya@foodies.test',  'not-a-real-hash', 'user'),
  ('Tom',        'tom@foodies.test',   'not-a-real-hash', 'user');                  -- ids 1 to 3

INSERT INTO reviews (user_id, restaurant_id, rating, tradition_rating, comment) VALUES
  (2, 1, 5, 5, 'Felt like eating at my grandmother''s house.'),
  (3, 1, 4, 4, 'Great kibbeh nayeh, simple place.'),
  (2, 2, 4, 2, 'Beautiful plating, very modern take.'),
  (3, 3, 4, 3, 'Fun twists on classic mezze.'),
  (2, 4, 5, 5, 'Old stone house, recipes unchanged.'),
  (3, 5, 5, 4, 'Best sayadieh we had in Lebanon.'),
  (2, 6, 3, 3, 'Good view, average food.'),
  (3, 7, 5, 5, 'Classic Zahle mezze by the river.');

INSERT INTO favorites (user_id, dish_id) VALUES (2, 5), (2, 7), (3, 1);
