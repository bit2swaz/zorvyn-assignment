# Zorvyn Finance Backend

Production-style finance backend built with Node.js, TypeScript, Express, Prisma, PostgreSQL, Zod, JWT authentication, RBAC, rate limiting, Swagger docs, and integration tests.

## Overview

This project implements the Zorvyn intern assignment as a modular monolith with strict separation of concerns:

- Routes map HTTP endpoints to controllers.
- Controllers parse request/response concerns only.
- Services hold business rules and database logic.
- Middlewares centralize auth, RBAC, validation, rate limiting, and error handling.

## Stack

- Node.js + TypeScript
- Express.js
- Prisma + PostgreSQL
- Zod
- bcryptjs + jsonwebtoken
- Jest + Supertest
- swagger-jsdoc + swagger-ui-express
- express-rate-limit

## Setup

1. Install dependencies:

	`npm install`

2. Create your environment file:

	`cp .env.example .env`

3. Update `.env` with a valid PostgreSQL connection string and a secure JWT secret.

4. Sync the schema:

	`npx prisma generate`

	`npx prisma db push`

5. Seed sample data:

	`npm run seed`

6. Start the API:

	`npm run dev`

7. Open Swagger UI:

	`http://localhost:3000/api/v1/api-docs`

## Useful Scripts

- `npm run dev` — start the development server
- `npm run build` — compile TypeScript
- `npm test` — run the full Jest suite
- `npm run seed` — seed the database with demo users and records

## Seeded Users

The seed script creates these users with password `Password123!`:

- `admin@zorvyn.local` — `ADMIN`
- `analyst@zorvyn.local` — `ANALYST`
- `viewer@zorvyn.local` — `VIEWER`

It also creates 54 realistic financial records spanning January to March 2026.

## API Endpoints

### Authentication

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`

### Users (ADMIN only)

- `GET /api/v1/users`
- `POST /api/v1/users`
- `PATCH /api/v1/users/:id/role`
- `PATCH /api/v1/users/:id/status`

### Financial Records

- `POST /api/v1/records` — `ADMIN`
- `GET /api/v1/records` — `ADMIN`, `ANALYST`
- `GET /api/v1/records/:id` — `ADMIN`, `ANALYST`
- `PUT /api/v1/records/:id` — `ADMIN`
- `DELETE /api/v1/records/:id` — `ADMIN` (soft delete)

### Dashboard

- `GET /api/v1/dashboard/summary` — `ADMIN`, `ANALYST`, `VIEWER`

### Docs

- `GET /api/v1/api-docs`

## TDD Approach

Each roadmap phase was implemented using a red-green-refactor loop:

- write focused failing tests first
- implement only enough code to satisfy the behavior
- rerun the focused suite
- run the broader regression suite and build after the phase stabilizes

This kept the behavior explicit for RBAC, validation, soft delete semantics, pagination, filtering, and dashboard aggregation logic.

## Assumptions Made

- Signup always creates a `VIEWER` account by default.
- `INACTIVE` users are treated as locked out and receive `401` from protected routes.
- Monetary values are returned as strings to preserve financial precision across the API boundary.
- A single currency is assumed system-wide because the assignment does not define multi-currency requirements.
- Dashboard trends are grouped monthly, which satisfies the SSOT requirement for grouped income vs expense trends while staying efficient in PostgreSQL.
- Soft-deleted financial records remain in the database and are excluded from reads and aggregations.

## Tradeoffs Considered

### Monolith vs Microservices

I chose a modular monolith:

- simpler deployment and local setup
- less coordination overhead for a scoped assignment
- easier end-to-end testing with one API boundary
- still preserves maintainability via route/controller/service separation

Microservices would add operational complexity without meaningful payoff for the assignment size.

### Prisma Aggregation Strategy

For dashboard metrics, the implementation avoids pulling all records into Node.js memory:

- `aggregate` handles total income and total expenses
- `groupBy` handles category totals
- raw SQL handles monthly trend bucketing efficiently in PostgreSQL

This keeps the heavy math in the database where it scales better.

## Documentation & Security Notes

- Swagger docs are generated from controller JSDoc annotations.
- Global rate limiting is set to `100 requests / 15 minutes`.
- Auth endpoints are additionally rate-limited to `10 requests / 15 minutes`.
- Protected routes use bearer-token authentication.

## Final Verification Checklist

- `npm run seed`
- `npm test`
- `npm run build`
- open `http://localhost:3000/api/v1/api-docs`