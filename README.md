# Foodies

Find traditional Lebanese dishes and the restaurants that serve them.

**Live site: https://foodies-qewd.onrender.com** (free plan: the first visit after a quiet period takes about a minute)

Web Programming 1 project by Julien Matar, Peter Nehmeh and Freddy Rayess.

## What it does

- **Dishes:** 14 Lebanese dishes with photos, ingredients, allergens and diet labels; search and filter (vegan, gluten-free, "without nuts"...).
- **Restaurants:** 8 real restaurants with their menus, a tradition meter from very modern to pure heritage, a Google map, directions and "Near me".
- **Accounts:** sign up, sign in (email or Google), favorite dishes, write and edit reviews.
- **Ask Teta:** a chatbot that answers with OpenAI, using only the facts in our database, and falls back to built-in rules.
- **Admin dashboard:** site numbers, most saved dishes, best rated places, the questions asked to Teta.
- **Extras:** dish of the day from Beirut's weather, prices in USD / LBP / EUR with live exchange rates.

Built with Node.js, Express 5 and PostgreSQL. No front-end framework: plain HTML, CSS and JavaScript in `view/`.

## Team

Each of us pushes from our own GitHub account, through a branch and a pull request, so GitHub keeps who did what.

| Member | GitHub | Commits | Pull requests |
|---|---|---|---|
| Julien Matar | [@JulienMatar](https://github.com/JulienMatar) | [commits](https://github.com/JulienMatar/foodies/commits?author=JulienMatar) | [pull requests](https://github.com/JulienMatar/foodies/pulls?q=is%3Apr+author%3AJulienMatar) |
| Peter Nehmeh | [@PeterNehme-git](https://github.com/PeterNehme-git) | [commits](https://github.com/JulienMatar/foodies/commits?author=PeterNehme-git) | [pull requests](https://github.com/JulienMatar/foodies/pulls?q=is%3Apr+author%3APeterNehme-git) |
| Freddy Rayess | [@fredyrayess](https://github.com/fredyrayess) | [commits](https://github.com/JulienMatar/foodies/commits?author=fredyrayess) | [pull requests](https://github.com/JulienMatar/foodies/pulls?q=is%3Apr+author%3Afredyrayess) |

## Run it on your computer

1. `npm install`
2. In DBeaver (or psql), create a database named `foodies`.
3. Copy `.env.example` to `.env`, then fill in your PostgreSQL user and password and a long random `JWT_SECRET`.
   Optional: `OPENAI_API_KEY` for Ask Teta with AI, and the `GOOGLE_*` values for Google sign-in (see `.env.example`).
4. `npm run db:setup` creates the tables and the sample data (it runs `db/schema.sql` then `db/seed.sql`).
   **Warning:** it deletes the tables first, so all their data.
5. `npm run dev`, then open http://localhost:4040.

| Command | What it does |
|---|---|
| `npm start` | starts the server (`npm run dev` also restarts it when a file changes) |
| `npm run db:setup` | creates the tables and the sample data |
| `npm run set-admin` | sets the admin's email and password, typed in the terminal (see [Admin account](#admin-account)) |
| `npm test` | runs the 78 automated tests |

**Sample accounts, on your computer only** (from `db/seed.sql`):
`admin@foodies.test / Admin123!` (admin), `maya@foodies.test / Password123!` and `tom@foodies.test / Password123!` (users).
These passwords are public: never keep them on the live site.

## Project structure

A request goes through `app.js` → `routes/` → `middlewares/` (checks) → `controller/` → `modules/` (SQL) → JSON back to the page.

| Folder | Role |
|---|---|
| `routes/` | which URL goes to which controller, and which middlewares run first |
| `middlewares/` | security headers, rate limits, caching, login / admin checks, input validation, JSON errors |
| `controller/` | reads the request, calls the module, picks the status code |
| `modules/` | the SQL queries (`db.js` is the shared connection pool) |
| `utils/` | `helper1` login cookie (JWT), `helper2` weather, `helper3` exchange rates, `helper4` Ask Teta with OpenAI, `helper5` Ask Teta without AI |
| `db/` | `schema.sql` (9 tables), `seed.sql`, `setup.js`, `set-admin.js`, `foodies.dbml` (the ER diagram for https://dbdiagram.io) |
| `view/` | the website: one HTML page and one script per page; shared code in `js/ui.js` and `js/api.js` |
| `test/` | the automated tests |
| `project_design/` | the ER diagram and the endpoint list (PDF and PNG) |

## API

36 endpoints, all JSON. Errors are always `{ "error": "message" }`.
The full list, with bodies and access rules, is in [`project_design/Foodies_Endpoints.pdf`](project_design/Foodies_Endpoints.pdf)
(made from `Foodies_Endpoints.html`: open it in Chrome and print to PDF to update it).
The database design is in [`project_design/Foodies_ER_Diagram.pdf`](project_design/Foodies_ER_Diagram.pdf).

Access: **Public** = no login · **User** = logged in · **Owner** = the author of the review · **Admin** = admin role.

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `/login`, `/logout` · `GET /api/auth/me` · Google: `GET /api/auth/google`, `/google/callback`, `/google/status` |
| Dishes | `GET /api/dishes?search=&category=&vegetarian=&vegan=&gluten_free=&without=` · `GET /api/dishes/:id` · Admin: `POST`, `PUT /:id`, `DELETE /:id` |
| Restaurants | `GET /api/restaurants?dish=&region=&style=&sort=&near=` · `GET /api/restaurants/:id` · Admin: `POST`, `PUT /:id`, `DELETE /:id` |
| Menu (admin) | `POST /api/restaurants/:id/dishes` · `PUT` and `DELETE /api/restaurants/:id/dishes/:dishId` |
| Reviews | `GET /api/restaurants/:id/reviews` (public) · `POST` (user) · `PUT /api/reviews/:id` (owner) · `DELETE /api/reviews/:id` (owner or admin) |
| Favorites (user) | `GET /api/favorites` · `POST` and `DELETE /api/favorites/:dishId` |
| Lookups and utilities | `GET /api/regions`, `/categories`, `/dish-of-the-day`, `/rates`, `/health` |
| Ask Teta | `POST /api/chat` (6 per minute) · `GET /api/chat/status` |
| Admin dashboard | `GET /api/admin/stats` · `GET /api/admin/chat-logs?page=&limit=` |

## Ask Teta: how the chatbot works

1. The page sends `POST /api/chat { question, history }` (the last 6 messages, so Teta follows the conversation).
2. The server loads every dish, restaurant, menu and price from the database (`modules/chat.module.js`, kept 5 minutes in memory).
3. `utils/helper4.js` sends Teta's rules, that catalog and the question to OpenAI (model `gpt-4.1-mini`), and asks for JSON
   that follows a schema. The model gets no web search: our database is its only source of facts, and when the answer is
   not there she says she doesn't know yet. Ids it makes up are thrown away, and prices always come from our database.
4. Without a key, if OpenAI is down, or after `CHAT_DAILY_LIMIT` (300) questions in a day, `utils/helper5.js` answers with rules.
5. Every question and answer is saved in `chat_logs`, which admins read on `admin.html`.

The key stays on the server, and each visitor can ask 6 questions per minute, so nobody can run up the bill.

## Security

| Risk | What we do | Where |
|---|---|---|
| SQL injection | every value goes in `$1, $2...` placeholders, never in the SQL text; sort orders come from a fixed list | `modules/` |
| Stolen passwords | bcrypt hashes (cost 10), never the password; the same message for a wrong email and a wrong password | `auth.controller.js` |
| Password guessing | 10 sign-in / sign-up tries per 15 minutes per visitor | `middlewares/rateLimit.js` |
| XSS | the login token is in an httpOnly cookie; the pages escape database text; a Content-Security-Policy allows only our own scripts, and only Google Maps in an `<iframe>` | `helper1.js`, `ui.js`, `security.js` |
| CSRF | `SameSite=Lax` cookie, JSON-only API, `state` check on Google sign-in | `helper1.js`, `auth.controller.js` |
| Clickjacking | `frame-ancestors 'none'` and `X-Frame-Options: DENY` | `security.js` |
| Too much access | `requireUser` (401), `requireAdmin` (403, reads the role again in the database), owner checks on reviews | `middlewares/auth.js` |
| Bad input | a validation middleware on every route that takes input, and CHECK rules in the database | `middlewares/validate*.js`, `schema.sql` |
| Flooding | 600 API calls per 15 minutes per visitor, 20 kB max request body, 6 chat questions per minute | `rateLimit.js`, `app.js` |
| Leaking details | errors without stack traces, no `X-Powered-By`, secrets only in `.env` (not in git), HTTPS-only cookies and HSTS online, a verified SSL connection to the database | `errorHandler.js`, `app.js`, `db.js` |

## Caching

| What | How long |
|---|---|
| Photos | 7 days in the browser |
| HTML, CSS, JS | checked each time; `304 Not Modified` (no body) when nothing changed |
| Regions, categories / dishes | 1 hour / 1 minute in the browser |
| Favorites, accounts, chat, admin | never (different for every user) |
| Weather / exchange rates / Teta's catalog | 30 minutes / 1 hour / 5 minutes in the server's memory |

## Tests

`npm test` runs 78 tests with Node's built-in test runner (nothing to install). They call every endpoint the way the website does:
filters and sorting, accounts, the owner rules on reviews, admin actions, the dashboard, Ask Teta (with a fake OpenAI, so no key and no cost),
the rate limits, the error answers, the security headers and `npm run set-admin`.

Each test file creates its own empty database (`foodies_test_...`) and deletes it at the end, so the real `foodies` database is never touched.
The tests refuse to run when `DATABASE_URL` is set, so they can't reach the live database by mistake.

## Deployment (Render + Neon)

The website runs on Render, as a normal Node server like on our computers, and the database on Neon (free PostgreSQL).

1. **Neon:** create a project (region Frankfurt) and copy its connection string. In it, change `sslmode=require` to `sslmode=verify-full`.
2. **Create the tables in Neon**, from our computer (PowerShell, in the project folder). Then close that terminal,
   so the next `npm run dev` uses the local database again:
   ```powershell
   $env:DATABASE_URL="postgresql://..."; npm run db:setup
   ```
3. **Set our own admin in Neon** (in the same terminal, before closing it): `npm run set-admin`.
4. **Render:** New → Blueprint → this repository. `render.yaml` describes the service. Type in the secrets:
   `DATABASE_URL`, `OPENAI_API_KEY`, and for Google sign-in `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and
   `GOOGLE_REDIRECT_URI` = `https://<our-site>/api/auth/google/callback` (the same address goes in the Google Cloud console).
   Render generates `JWT_SECRET` itself.
5. **Check** `https://<our-site>/api/health` (`"database": "ok"`) and `/api/chat/status` (`"ai": true`), sign in, and try the site on a phone.

Online (`NODE_ENV=production`), cookies are HTTPS-only, HSTS is on, and Express trusts Render's proxy so the rate limits see each visitor.
The free plans of Render and Neon sleep when nobody visits: open the site a minute before a demo.

### Admin account

The sample admin's password is public, so the live site needs its own. With `DATABASE_URL` set to the Neon string (step 2 above):

```powershell
npm run set-admin
```

It asks for the admin's name, email and password (8 characters or more, shown as `*`), saves the password as a bcrypt hash,
and deletes the sample admin `admin@foodies.test`: someone who signed in with it loses admin access at once.
It can also delete the sample users maya and tom. Run it again any time to change the password.

## Pictures and credits

The scenes of Lebanon are 19th-century prints in the public domain (`view/img/prints/`), blended into the page but never repainted.
The city and dish photos are from Wikimedia Commons under free licenses (`view/img/photos/`).
Authors and licenses are in `view/js/credits.js`, shown under each photo and in the footer: **keep them when you change a photo**
(CC BY and CC BY-SA require them). The city stories and traditions are in `view/js/heritage.js`.
