# expense-tracker-backend

REST API for the Expense Tracker app. Built with **NestJS + Prisma + PostgreSQL**.

Frontend: [expense-tracker-web](https://github.com/jaypatel-simform/expense-tracker-web)

## MVP features

- Register / login with email + password (JWT). All data is scoped to the logged-in user.
- Expenses CRUD (amount, description, date, category, optional note) with date-range / category filters and pagination.
- Categories: 8 defaults created on registration; add / delete your own (a category with expenses can't be deleted).
- Reports: summary by category for a date range, and monthly totals.

## Getting started

```bash
cp .env.example .env          # edit JWT_SECRET
docker compose up -d          # PostgreSQL on :5432
npm install                   # also runs `prisma generate`
npx prisma migrate dev --name init   # creates the schema (+ prisma/migrations)
npm run start:dev
```

- API base: `http://localhost:3000/api`
- Swagger docs: `http://localhost:3000/docs`

> The initial Prisma migration is not committed yet - run `npx prisma migrate dev --name init` once and commit the generated `prisma/migrations` folder. In production use `npm run prisma:deploy`.

## Endpoints

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/auth/register` | `{ name, email, password }` -> `{ accessToken, user }` |
| POST | `/api/auth/login` | `{ email, password }` -> `{ accessToken, user }` |
| GET | `/api/auth/me` | current user |
| GET | `/api/categories` | |
| POST | `/api/categories` | `{ name }` |
| DELETE | `/api/categories/:id` | 409 if it has expenses |
| GET | `/api/expenses` | `from`, `to`, `categoryId`, `page`, `limit` |
| POST | `/api/expenses` | `{ amount, description, date, categoryId, note? }` |
| GET/PATCH/DELETE | `/api/expenses/:id` | |
| GET | `/api/reports/summary` | `from`, `to` (default: current month) |
| GET | `/api/reports/monthly` | `months` (default 6) |

All routes except `/auth/register` and `/auth/login` need `Authorization: Bearer <token>`.

## Environment

| Var | Description |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `JWT_SECRET` | secret used to sign tokens |
| `JWT_EXPIRES_IN` | token lifetime, default `7d` |
| `PORT` | default `3000` |
| `CORS_ORIGIN` | comma-separated allowed origins, default `http://localhost:5173` |
