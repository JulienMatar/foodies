# Foodies

Find traditional Lebanese dishes and the restaurants that serve them.
REST API built with Node.js, Express 5 and PostgreSQL.

Web Programming 1 project by Julien Matar, Peter Nehmeh and Freddy Rayess.

## Team

Each of us pushes from our own GitHub account, through a branch and a pull request, so GitHub keeps who did what.

| Member | GitHub | Commits | Pull requests |
|---|---|---|---|
| Julien Matar | [@JulienMatar](https://github.com/JulienMatar) | [commits](https://github.com/JulienMatar/foodies/commits?author=JulienMatar) | [pull requests](https://github.com/JulienMatar/foodies/pulls?q=is%3Apr+author%3AJulienMatar) |
| Peter Nehmeh | [@PeterNehme-git](https://github.com/PeterNehme-git) | [commits](https://github.com/JulienMatar/foodies/commits?author=PeterNehme-git) | [pull requests](https://github.com/JulienMatar/foodies/pulls?q=is%3Apr+author%3APeterNehme-git) |
| Freddy Rayess | [@fredyrayess](https://github.com/fredyrayess) | [commits](https://github.com/JulienMatar/foodies/commits?author=fredyrayess) | [pull requests](https://github.com/JulienMatar/foodies/pulls?q=is%3Apr+author%3Afredyrayess) |

The whole history per person: [Insights → Contributors](https://github.com/JulienMatar/foodies/graphs/contributors).

## Setup

1. Install the dependencies:
   ```bash
   npm install
   ```
2. In DBeaver (or psql), create a database named `foodies`, then run:
   - `db/schema.sql` -- creates the tables (**warning:** it drops them first, so it deletes all their data)
   - `db/seed.sql` -- adds sample data: 14 dishes and 8 real restaurants (names, addresses and phones checked by Peter; the menus and prices are examples), no reviews yet
3. Copy `.env.example` to `.env`, put your own PostgreSQL user and password in it, and set `JWT_SECRET` to any long random text.
   Google sign-in is optional: fill `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to turn it on.
   Ask Teta with AI is optional too: put an OpenAI key in `OPENAI_API_KEY`. Without it, Teta answers with her built-in rules.
4. Start the server:
   ```bash
   npm start
   ```
   The API runs on `http://localhost:4040/api`. `npm run dev` restarts the server by itself when a file changes.

## Project structure

| Folder | Role |
|---|---|
| `routes/` | which URL goes to which controller, and which middlewares run first |
| `middlewares/` | logger, security headers (`security.js`), rate limits (`rateLimit.js`), HTTP caching (`cache.js`), login/admin checks (`auth.js`), input validation, JSON error handler |
| `controller/` | reads the request, calls the module, picks the status code |
| `modules/` | the SQL queries (`db.js` is the shared connection pool) |
| `utils/` | `helper1` login cookie (JWT), `helper2` weather (Open-Meteo), `helper3` exchange rates, `helper4` Ask Teta with OpenAI, `helper5` Ask Teta without AI (rules) |
| `db/` | `schema.sql`, `seed.sql`, `setup.js` (`npm run db:setup` runs both, for a hosted database), and `foodies.dbml` (the ER diagram: paste it into https://dbdiagram.io to view it) |
| `project_design/` | the ER diagram (`Foodies_ER_Diagram`) and the list of every endpoint (`Foodies_Endpoints`), as PDF and PNG |
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
| `restaurants.html?region=` | `restaurants.js` | the tradition meter: every restaurant from very modern to pure heritage (`?region=` shows one city), a Google map ("Show on map" puts the pin on a restaurant from its lat/lng, "Directions" opens the route in Google Maps), and "Near me" to sort them by distance |
| `traditions.html` | `traditions.js` | Lebanese food traditions |
| `dish.html?id=` | `dish.js` | one dish: photo, ingredients, diet and allergy table, tips, the restaurants serving it; the heart saves it to your favorites (needs a login) |
| `restaurant.html?id=` | `restaurant.js` | one restaurant: its city photo and story, a Google map with a "Get directions" button, scores, menu with prices, reviews; logged-in users write, edit and delete their review, admins can delete any |
| `favorites.html` | `favorites.js` | the dishes you saved |
| `chat.html?q=` | `chat.js` | Ask Teta: the chatbot. It remembers the conversation, and links each answer to the dishes and restaurants |
| `admin.html` | `admin.js` | admins only: the numbers of the site, the most saved dishes, the best places, the questions asked to Teta (the chart icon in the top bar) |

Shared code is in `js/ui.js` (header, sign-in dialog, prices, diet labels, dish cards), `js/api.js` (calls to the API),
`js/heritage.js` (city stories, traditions, tips, words) and `js/credits.js` (picture credits).
The pages share the same header and footer: if you change them, change them in every `.html` file.

"Sign in" in the top bar opens a dialog to log in or create an account.

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
| GET | `/api/auth/google/status` | Public | `{ available }`: is Google sign-in set up on this server |
| GET | `/api/auth/google` | Public | start Google sign-in (503 when it is not set up) |
| GET | `/api/auth/google/callback` | Public | Google sends the user back here |
| GET | `/api/dishes?search=&category=&vegetarian=&vegan=&gluten_free=&without=` | Public | list / search dishes (`without=nuts,sesame` hides dishes with those allergens) |
| GET | `/api/dishes/:id` | Public | one dish + the restaurants serving it and their prices |
| POST | `/api/dishes` | Admin | create a dish `{ name_en, name_ar, description, category_id, is_vegetarian, weather }` + optional `slug, ingredients[], is_vegan, is_gluten_free, allergens[], meat, served_raw, good_to_know, first_timer` |
| PUT | `/api/dishes/:id` | Admin | replace a dish (same body) |
| DELETE | `/api/dishes/:id` | Admin | delete a dish |
| GET | `/api/restaurants?dish=&region=&style=&sort=&near=` | Public | filter and sort, with `avg_rating`, `tradition_score`, `review_count` (`near=33.89,35.50` adds `distance_km`) |
| GET | `/api/restaurants/:id` | Public | one restaurant + scores + `menu` |
| POST | `/api/restaurants` | Admin | create `{ name, region_id, address, phone, lat, lng, price_level, style }` (`lat` and `lng` can both be `null` when the exact spot is not known) |
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
| POST | `/api/chat` | Public, 6 per minute | ask Teta `{ question, history? }` → `{ answer, dish_id, results, source: "ai" \| "rules" }`, saved in `chat_logs` |
| GET | `/api/chat/status` | Public | `{ ai, model }`: does Teta use AI right now |
| GET | `/api/admin/stats` | Admin | counts, most saved dishes, best rated places, questions per day |
| GET | `/api/admin/chat-logs?page=&limit=` | Admin | the questions asked to Teta, newest first, by pages |
| GET | `/api/health` | Public | the app and the database are up (used by the host) |
| GET | `/api/rates` | Public | 1 USD in LBP and EUR (cached 1 hour; if the rates service is down: the last rates, or estimated ones with `"estimated": true`) |

`sort` values: `authentic`, `mix` (fusion first), `modern`, `price_asc`, `price_desc`, `top_rated`, `nearest` (needs `near`).
With `?dish=`, only the restaurants where that dish is available are listed, with its `price_usd`, and the price sorts use it.

Errors are always JSON: `{ "error": "message" }`.
The API design (the 32 planned endpoints) is in `project_design/Foodies_Endpoints.pdf`,
and the database design in `project_design/Foodies_ER_Diagram.pdf` (it matches `db/schema.sql` and `db/foodies.dbml`).

## Ask Teta: how the chatbot works

1. The page sends `POST /api/chat { question, history }` (history = the last 6 messages, so Teta follows the conversation).
2. The server loads the catalog: every dish, restaurant, menu and price (`modules/chat.module.js`, kept 5 minutes in memory).
3. With an `OPENAI_API_KEY`, `utils/helper4.js` sends Teta's rules + the catalog + the question to the OpenAI Responses API,
   and asks for JSON that follows a schema (`{ answer, dish_id, picks }`). The model can only recommend what is in our database;
   ids it makes up are thrown away by the controller.
4. Without a key, if OpenAI is down, or after `CHAT_DAILY_LIMIT` AI answers in a day, `utils/helper5.js` answers with rules
   (dish names, categories, diets, allergies, weather, regions). The chatbot always answers.
5. The question and answer are saved in `chat_logs`; admins read them on `admin.html`.

The key never leaves the server, and `/api/chat` is limited to 6 questions per minute per visitor, so nobody can run up the bill.

## Security

| Risk | What we do | Where |
|---|---|---|
| SQL injection | every value goes in `$1, $2...` placeholders, never in the SQL text; sort orders come from a fixed list | `modules/` |
| Stolen passwords | bcrypt hashes (cost 10), never the password; the same message for a wrong email and a wrong password | `auth.controller.js` |
| Password guessing | 10 login / register tries per 15 minutes per IP | `middlewares/rateLimit.js` |
| XSS | the login token is in an httpOnly cookie (JavaScript can't read it); the pages escape database text (`esc()`, `textContent`); a Content-Security-Policy only allows our own scripts, and only Google Maps in an `<iframe>` | `helper1.js`, `ui.js`, `security.js` |
| CSRF | `sameSite: 'lax'` cookie, JSON-only API, `state` check on Google sign-in | `helper1.js`, `auth.controller.js` |
| Clickjacking | `frame-ancestors 'none'` and `X-Frame-Options: DENY` | `security.js` |
| Too much access | `requireUser` (401), `requireAdmin` (403, re-reads the role in the database), owner checks on reviews | `middlewares/auth.js` |
| Bad input | a validation middleware on every route that takes input; the database CHECKs say the same thing | `middlewares/validate*.js`, `schema.sql` |
| Flooding | 600 API calls per 15 minutes per IP, 20 kB max request body, 6 chat questions per minute | `rateLimit.js`, `app.js` |
| Leaking details | errors are `{ error }` without stack traces, no `X-Powered-By`, secrets only in `.env` (not in git), HSTS + https-only cookies in production | `errorHandler.js`, `app.js` |

## Caching

| What | How long | Where |
|---|---|---|
| Photos and prints | 7 days in the browser (`Cache-Control: max-age=604800`) | `app.js` (express.static) |
| HTML, CSS, JS | checked each time, but answered `304 Not Modified` (no body) when nothing changed, thanks to the ETag | `app.js` |
| Regions, categories | 1 hour in the browser | `middlewares/cache.js` |
| Dishes | 1 minute in the browser | `middlewares/cache.js` |
| Favorites, auth, chat, admin | never (`no-store`): different for every user | `middlewares/cache.js` |
| Weather | 30 minutes in the server's memory | `utils/helper2.js` |
| Exchange rates | 1 hour in the server's memory (old or estimated rates if the service is down) | `utils/helper3.js` |
| Teta's catalog | 5 minutes in the server's memory, cleared when an admin changes a dish, restaurant or menu | `modules/chat.module.js` |
| Lists inside a page | each list fetched once per page | `view/js/api.js` |

## Tests

```bash
npm test
```

68 automated tests (`test/`, with Node's built-in test runner: nothing to install) call every endpoint the way the website does:
public lists and filters, sign-in and accounts, reviews and favorites with the owner rules, admin dishes / restaurants / menus,
the dashboard, Ask Teta, the rate limits, the error answers and the security headers.

Each test file creates its own empty database (`foodies_test_...`) with `schema.sql` and `seed.sql`, and deletes it at the end,
so the tests never touch the real `foodies` database. They only need PostgreSQL running and the `PG...` values of `.env`.
They refuse to run when `DATABASE_URL` is set, so they can't reach the hosted database by mistake.

## Deployment (Render + Neon)

The app runs on Render (a normal Node server, like on our computers) and the database on Neon (free PostgreSQL that doesn't expire).

1. On https://neon.tech, create a project (region: Europe, close to Lebanon) and copy its connection string (`postgresql://...`).
2. Create the tables and the sample data in Neon, from our computer (PowerShell, in the project folder):
   ```powershell
   $env:DATABASE_URL="postgresql://..."; npm run db:setup
   ```
   (`DATABASE_URL` wins over the `PG...` values of `.env`, so this only touches Neon. Close the terminal after, so the next `npm start` uses the local database again.)
3. On https://render.com: **New → Blueprint**, pick the GitHub repository. `render.yaml` describes the web service.
4. Render asks for the secret variables: `DATABASE_URL` (the Neon string), `OPENAI_API_KEY` (or empty), and the `GOOGLE_*` ones
   only if you use Google sign-in (`GOOGLE_REDIRECT_URI` = `https://<your-app>.onrender.com/api/auth/google/callback`, also added in the Google console).
   `JWT_SECRET` is generated by Render.
5. Render builds (`npm ci`), starts (`npm start`) and checks `/api/health`. The site is at `https://<your-app>.onrender.com`.

The free Render plan sleeps after 15 minutes without visits: the first visit after that takes about a minute. Open the site a bit before a demo.
In production (`NODE_ENV=production`) the cookies are https-only, HSTS is on, and Express trusts Render's proxy so the rate limits see each visitor's real IP.
Any host that runs Node 20.12+ works the same way: set the variables of `.env.example` (with `DATABASE_URL`), run `npm ci` then `npm start`.
