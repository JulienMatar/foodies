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
3. Copy `.env.example` to `.env` and put your own PostgreSQL user and password in it.
4. Start the server:
   ```bash
   npm start
   ```
   The API runs on `http://localhost:4040/api`.

## Project structure

| Folder | Role |
|---|---|
| `routes/` | which URL goes to which controller, and which middlewares run first |
| `middlewares/` | logger, input validation, JSON error handler |
| `controller/` | reads the request, calls the module, picks the status code |
| `modules/` | the SQL queries (`db.js` is the shared connection pool) |
| `db/` | `schema.sql` and `seed.sql` |
| `project_design/` | ER diagram and the list of all planned endpoints |

## Endpoints available now

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/dishes` | all dishes |
| GET | `/api/dishes/:id` | one dish |
| POST | `/api/dishes` | create a dish `{ name_en, name_ar, description, category_id, is_vegetarian, weather }` |
| PUT | `/api/dishes/:id` | replace a dish (same body) |
| DELETE | `/api/dishes/:id` | delete a dish |
| GET | `/api/restaurants` | all restaurants |
| GET | `/api/restaurants/:id` | one restaurant |
| POST | `/api/restaurants` | create a restaurant `{ name, region_id, address, phone, lat, lng, price_level, style }` |
| PUT | `/api/restaurants/:id` | replace a restaurant (same body) |
| DELETE | `/api/restaurants/:id` | delete a restaurant |
| GET | `/api/regions` | list regions |
| GET | `/api/categories` | list dish categories |

Errors are always JSON: `{ "error": "message" }`.
The full planned API (32 endpoints) is in `project_design/Foodies_Endpoints.pdf`.
