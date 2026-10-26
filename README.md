# expense-tracker-backend

Backend/API for the Expense Tracker app, built with NestJS, Prisma and PostgreSQL.

## Related repositories

- [expense-tracker-web](https://github.com/jaypatel-simform/expense-tracker-web) - web frontend

## Prerequisites

- Node.js 20+ and npm
- PostgreSQL 14+ (or Docker, to run the bundled `docker-compose.yml`)

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL (skip if you already have one)
docker compose up -d

# 3. Configure the environment
cp .env.example .env      # then edit values as needed

# 4. Create the tables and seed the default categories
npx prisma migrate deploy # or `npx prisma migrate dev` while developing
npx prisma db seed

# 5. Run the API (http://localhost:3000/api)
npm run start:dev
```

`npm install` also generates the Prisma client on install; run `npx prisma generate` if you change `prisma/schema.prisma`.

The seed is idempotent: it creates the default categories (Food, Transport, Rent, Bills, Shopping, Health, Entertainment, Other) only if missing, so it is safe to run more than once.

### Environment variables

| Variable         | Required | Default                 | Description                                  |
| ---------------- | -------- | ----------------------- | -------------------------------------------- |
| `DATABASE_URL`   | yes      | -                       | PostgreSQL connection string                 |
| `JWT_SECRET`     | yes      | -                       | Secret used to sign JWTs                     |
| `JWT_EXPIRES_IN` | no       | `1d`                    | Token lifetime (e.g. `15m`, `1d`)            |
| `PORT`           | no       | `3000`                  | HTTP port                                    |
| `CORS_ORIGIN`    | no       | `http://localhost:5173` | Allowed web origin(s), comma separated       |

Variables are validated at startup; the app refuses to boot if a required one is missing.

## Scripts

| Command               | Purpose                                      |
| --------------------- | -------------------------------------------- |
| `npm run start:dev`   | Start in watch mode                          |
| `npm run build`       | Compile to `dist/`                           |
| `npm run start:prod`  | Run the compiled app                         |
| `npm test`            | Unit tests (Prisma mocked, no DB needed)     |
| `npm run test:e2e`    | HTTP tests for auth guard/validation (no DB) |
| `npm run lint`        | ESLint                                       |

## API

All routes are prefixed with `/api`. Everything except signup and login requires `Authorization: Bearer <token>`. Each user only sees their own data; other users' records return 404.

| Method & path                          | Description                                                           |
| -------------------------------------- | --------------------------------------------------------------------- |
| `POST /auth/signup`                    | Create an account. Body: `email`, `password` (min 8), `name?`. Returns `{ accessToken, user }`. 409 on duplicate email |
| `POST /auth/login`                     | Returns `{ accessToken, user }`. 401 on bad credentials               |
| `POST /auth/logout`                    | 204. See the note below                                               |
| `GET /users/me`, `PATCH /users/me`     | Profile: `name`, `defaultCurrency` (3-letter uppercase code, e.g. `USD`) |
| `GET/POST /categories`                 | List (defaults + your own) / create                                   |
| `GET/PATCH/DELETE /categories/:id`     | Default categories are read-only (403). Deleting a category that has expenses returns 409. Duplicate names return 409 |
| `GET/POST /expenses`                   | List / create. Create body: `amount`, `date`, `categoryId`, `paymentMethod` (`CASH`, `CARD`, `UPI`, `BANK_TRANSFER`, `OTHER`), `note?` |
| `GET/PATCH/DELETE /expenses/:id`       | Read / update / delete one expense                                    |
| `GET/POST /income`                     | List / create. Create body: `amount`, `date`, `source?`, `note?`      |
| `GET/PATCH/DELETE /income/:id`         | Read / update / delete one income entry                               |
| `GET /dashboard/summary?month=YYYY-MM` | `{ month, spent, income, balance }` (balance = income - spent)        |
| `GET /dashboard/by-category?month=YYYY-MM` | `[{ categoryId, name, total, percentage }]`                       |
| `GET /dashboard/trend?months=6&to=YYYY-MM` | `[{ month, spent, income }]`, zero-filled, oldest first           |
| `GET /dashboard/recent?limit=10`       | Latest expenses and income merged, each with `type: 'expense' \| 'income'` |

List endpoints (`/expenses`, `/income`) accept `page` (default 1), `limit` (default 20, max 100), `from` and `to` (ISO dates; a date-only `to` includes that whole day). `/expenses` also accepts `categoryId` and `search` (case-insensitive match on the note). They return `{ data, meta: { page, limit, total, totalPages } }`, newest first.

`month` defaults to the current month. Months are bucketed in UTC. Monetary amounts are returned as JSON numbers.

### Logout

JWTs are stateless, so the server keeps nothing to revoke. `POST /auth/logout` simply acknowledges the call (204); the client is responsible for discarding its token. The token stays technically valid until it expires (`JWT_EXPIRES_IN`).

## Project layout

```
prisma/        schema, migrations, seed
src/auth       signup/login/logout, JWT strategy, global auth guard, @Public()
src/users      profile
src/categories, src/expenses, src/income
src/dashboard  aggregation endpoints
src/common     pagination, date range and month helpers
```

## Verification status

Unit tests and the guard/validation HTTP tests run without a database (Prisma is mocked). The SQL in `prisma/migrations` was generated from the schema with `prisma migrate diff`, and was not applied against a live PostgreSQL instance in the environment where this was written, so run the setup steps above locally to confirm.
