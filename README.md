# Foodies

Find traditional Lebanese dishes and the restaurants that serve them.
REST API built with Node.js, Express 5 and PostgreSQL.

Web Programming 1 project by Julien Matar, Peter Nehmeh and Freddy Rayess.

## Setup

1. Install the dependencies:
   ```bash
   npm install
   ```
2. In DBeaver (or psql), create a database named `foodies`, then run:
   - `db/schema.sql` -- creates the tables (**warning:** it drops them first, so it deletes all their data)
   - `db/seed.sql` -- adds sample data
3. Copy `.env.example` to `.env`, put your own PostgreSQL user and password in it, and set `JWT_SECRET` to any long random text.
   Google sign-in is optional: fill `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to turn it on.
4. Start the server:
   ```bash
   npm start
   ```
   The API runs on `http://localhost:4040/api`.

## Project structure

| Folder | Role |
|---|---|
| `routes/` | which URL goes to which controller, and which middlewares run first |
| `middlewares/` | logger, login/admin checks (`auth.js`), input validation, JSON error handler |
| `controller/` | reads the request, calls the module, picks the status code |
| `modules/` | the SQL queries (`db.js` is the shared connection pool) |
| `utils/` | `helper1` login cookie (JWT), `helper2` weather (Open-Meteo), `helper3` exchange rates |
| `db/` | `schema.sql`, `seed.sql`, and `foodies.dbml` (the ER diagram: paste it into https://dbdiagram.io to view it) |
| `docs/` | the ER diagram (`Foodies_ER_Diagram`) and the list of every endpoint (`Foodies_Endpoints`), as PDF and PNG |
| `view/` | the website (HTML, CSS and JavaScript pages, served by Express) |

## Website pages (`view/`)

Open `http://localhost:4040` once the server runs.

Each part of the site is its own page; the top bar links them all and marks the page you are on.

| Page | Script | What it does |
|---|---|---|
| `index.html` | `home.js` | the search (it opens `dishes.html?q=&region=`), the dish of the day, links to the other pages, Sahtein |
| `new.html` | `new.js` | "New to Lebanese food?": the first dishes to try, how to eat a mezze, words for the table, the diet labels |
| `dishes.html` | `dishes.js` | every dish, with search, region, category and diet filters |
| `road.html` | `road.js` | the food road trip: six stops and what to order, then the six cities with photos |
| `restaurants.html?region=` | `restaurants.js` | the tradition meter: every restaurant from very modern to pure heritage (`?region=` shows one city) |
| `traditions.html` | `traditions.js` | Lebanese food traditions |
| `dish.html?id=` | `dish.js` | one dish: photo, ingredients, diet and allergy table, tips, the restaurants serving it; the heart saves it to your favorites (needs a login) |
| `restaurant.html?id=` | `restaurant.js` | one restaurant: its city photo and story, scores, menu with prices, reviews; logged-in users write, edit and delete their review, admins can delete any |
| `favorites.html` | `favorites.js` | the dishes you saved |

Shared code is in `js/ui.js` (header, sign-in dialog, prices, diet labels, dish cards), `js/api.js` (calls to the API),
`js/heritage.js` (city stories, traditions, tips, words) and `js/credits.js` (picture credits).
The pages share the same header and footer: if you change them, change them in every `.html` file.

"Sign in" in the top bar opens a dialog to log in or create an account.
`chat.html` (Ask Teta) is not linked from the site for now: the chatbot will be rebuilt later.

The design: smooth warm paper, cedar green and tarboush red, Cormorant Garamond headings, Arabic names in Ruqaa calligraphy.
Sections sit on the paper (no boxes), split by a thin rule with a small cedar, and every page ends with a "Next" link to the following page.
- The scenes of Lebanon are real 19th-century prints in the public domain (`view/img/prints/`): a watercolour of the cedars by
  Friedrich Perlberg, lithographs of Baalbek and Sidon after David Roberts (1843), an engraving of the cedar grove after Harry Fenn,
  and a sketch by Edward Lear. They are blended into the page: on the home page the watercolour's sky is cut away
  (`cedars-cutout.png`, the original is `cedars-watercolour.jpg`), Sidon and Baalbek fade into the paper,
  the engraving is in a museum mount and Lear's sketch is shown as a postcard. The artworks themselves are not repainted.
- The cities and dishes are real photographs from Wikimedia Commons (`view/img/photos/`), under free licenses
  (CC0, CC BY, CC BY-SA, public domain). Their authors and licenses are in `view/js/credits.js`, shown under each photo
  and in the "Picture credits" list in the footer. **Keep the credits when you reuse or change a photo**: CC BY and CC BY-SA require them.
- The city stories and traditions are in `view/js/heritage.js`.

## Test accounts (from `db/seed.sql`)

| Email | Password | Role |
|---|---|---|
| `admin@foodies.test` | `Admin123!` | admin |
| `maya@foodies.test` | `Password123!` | user |
| `tom@foodies.test` | `Password123!` | user |

Logging in sets an httpOnly cookie named `token` (a JWT, valid 7 days).

## Endpoints

Access: Public = no login, User = logged in, Owner = the author of the review, Admin = admin role.

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | Public | create an account `{ name, email, password }` (logs you in) |
| POST | `/api/auth/login` | Public | log in `{ email, password }` |
| POST | `/api/auth/logout` | User | clear the login cookie |
| GET | `/api/auth/me` | User | the logged-in user |
| GET | `/api/auth/google` | Public | start Google sign-in |
| GET | `/api/auth/google/callback` | Public | Google sends the user back here |
| GET | `/api/dishes?search=&category=&vegetarian=&vegan=&gluten_free=&without=` | Public | list / search dishes (`without=nuts,sesame` hides dishes with those allergens) |
| GET | `/api/dishes/:id` | Public | one dish + the restaurants serving it and their prices |
| POST | `/api/dishes` | Admin | create a dish `{ name_en, name_ar, description, category_id, is_vegetarian, weather }` + optional `slug, ingredients[], is_vegan, is_gluten_free, allergens[], meat, served_raw, good_to_know, first_timer` |
| PUT | `/api/dishes/:id` | Admin | replace a dish (same body) |
| DELETE | `/api/dishes/:id` | Admin | delete a dish |
| GET | `/api/restaurants?dish=&region=&style=&sort=` | Public | filter and sort, with `avg_rating`, `tradition_score`, `review_count` |
| GET | `/api/restaurants/:id` | Public | one restaurant + scores + `menu` |
| POST | `/api/restaurants` | Admin | create `{ name, region_id, address, phone, lat, lng, price_level, style }` |
| PUT | `/api/restaurants/:id` | Admin | replace a restaurant (same body) |
| DELETE | `/api/restaurants/:id` | Admin | delete a restaurant |
| POST | `/api/restaurants/:id/dishes` | Admin | put a dish on the menu `{ dish_id, price_usd, available }` |
| PUT | `/api/restaurants/:id/dishes/:dishId` | Admin | change `{ price_usd?, available? }` |
| DELETE | `/api/restaurants/:id/dishes/:dishId` | Admin | take a dish off the menu |
| GET | `/api/restaurants/:id/reviews` | Public | reviews, newest first |
| POST | `/api/restaurants/:id/reviews` | User | add a review `{ rating, tradition_rating, comment }` |
| PUT | `/api/reviews/:id` | Owner | edit your review (same body) |
| DELETE | `/api/reviews/:id` | Owner or admin | delete a review |
| GET | `/api/favorites` | User | my favorite dishes |
| POST | `/api/favorites/:dishId` | User | add a favorite |
| DELETE | `/api/favorites/:dishId` | User | remove a favorite |
| GET | `/api/regions` | Public | list regions |
| GET | `/api/categories` | Public | list dish categories |
| GET | `/api/dish-of-the-day` | Public | a dish that suits today's weather in Beirut (Open-Meteo) |
| GET | `/api/rates` | Public | 1 USD in LBP and EUR (cached 1 hour; if the rates service is down: the last rates, or estimated ones with `"estimated": true`) |

`sort` values: `authentic`, `mix` (fusion first), `modern`, `price_asc`, `price_desc`, `top_rated`.
With `?dish=`, only the restaurants where that dish is available are listed, with its `price_usd`, and the price sorts use it.

Not built yet: the chatbot (`POST /api/chat`, `GET /api/admin/chat-logs`).

Errors are always JSON: `{ "error": "message" }`.
The full API (32 endpoints, 30 built, the 2 chatbot ones planned) is in `docs/Foodies_Endpoints.pdf`,
and the database design in `docs/Foodies_ER_Diagram.pdf` (it matches `db/schema.sql` and `db/foodies.dbml`).
