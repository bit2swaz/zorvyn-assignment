# Zorvyn Finance Backend

Production-style finance backend built with Node.js, TypeScript, Express, Prisma, PostgreSQL, Zod, JWT authentication, RBAC, rate limiting, Swagger docs, and integration tests.

The implementation intentionally stays as a modular monolith: it avoids unnecessary complexity for the assignment scope, while still adding thoughtful extras like JWT auth, search, pagination, soft delete, rate limiting, seeded data, Swagger, integration tests, and a Postman collection for reviewer walkthroughs.

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

	`npx prisma migrate dev --name init`

5. Seed sample data:

	`npm run seed`

6. Start the API:

	`npm run dev`

7. Open Swagger UI:

	`http://localhost:3000/api/v1/api-docs`

8. Raw OpenAPI spec:

	`http://localhost:3000/api/v1/openapi.json`

## Useful Scripts

- `npm run dev` — start the development server
- `npm run build` — compile TypeScript
- `npm test` — run the full Jest suite
- `npm run seed` — seed the database with demo users and records

## Reviewer Walkthrough

This repository is intentionally prepared for local review instead of requiring a paid live deployment.

- run the API locally with seeded data
- explore the endpoints in Swagger at `/api/v1/api-docs`
- import [postman_collection.json](postman_collection.json) into Postman for a guided request flow
- use the seeded users documented below for quick role-based testing

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
- `GET /api/v1/openapi.json`

## Review Assets

- [postman_collection.json](postman_collection.json) — ready-to-import Postman collection for local testing
- Shared Postman collection — https://postman.co/workspace/My-Workspace~dc9e0167-322a-4c56-899c-2b61e23c267e/collection/45848063-d2f9565a-3d70-4f56-a6bd-0b3e9b7c1d46?action=share&creator=45848063
- GitHub Pages API docs — `https://bit2swaz.github.io/zorvyn-assignment/` (after the Pages workflow runs)
- Swagger UI — available locally at `http://localhost:3000/api/v1/api-docs`
- Raw OpenAPI JSON — available locally at `http://localhost:3000/api/v1/openapi.json`

The GitHub Pages site is a static documentation view of the OpenAPI spec. Interactive requests still assume a local backend because this submission does not include a live hosted API.

## Example Requests & Responses

### Register a viewer account

Request:

```http
POST /api/v1/auth/register
Content-Type: application/json

{
	"name": "Alice Viewer",
	"email": "alice.viewer@example.com",
	"password": "Password123!"
}
```

Response:

```json
{
	"success": true,
	"message": "Operation successful",
	"data": {
		"id": "uuid",
		"name": "Alice Viewer",
		"email": "alice.viewer@example.com",
		"role": "VIEWER",
		"status": "ACTIVE",
		"createdAt": "2026-04-01T00:00:00.000Z",
		"updatedAt": "2026-04-01T00:00:00.000Z"
	}
}
```

### Create a financial record as admin

Request:

```http
POST /api/v1/records
Authorization: Bearer <jwt>
Content-Type: application/json

{
	"amount": 1250.75,
	"type": "INCOME",
	"category": "salary",
	"date": "2026-02-01T00:00:00.000Z",
	"notes": "Monthly salary"
}
```

Response:

```json
{
	"success": true,
	"message": "Operation successful",
	"data": {
		"id": "uuid",
		"amount": "1250.75",
		"type": "INCOME",
		"category": "salary",
		"date": "2026-02-01T00:00:00.000Z",
		"notes": "Monthly salary",
		"createdAt": "2026-04-01T00:00:00.000Z",
		"updatedAt": "2026-04-01T00:00:00.000Z",
		"deletedAt": null,
		"userId": "uuid"
	}
}
```

### List filtered records with pagination

Request:

```http
GET /api/v1/records?page=1&limit=2&type=EXPENSE&q=travel
Authorization: Bearer <jwt>
```

Response:

```json
{
	"success": true,
	"message": "Operation successful",
	"data": [
		{
			"id": "uuid",
			"amount": "150.00",
			"type": "EXPENSE",
			"category": "travel",
			"date": "2026-02-16T00:00:00.000Z",
			"notes": "Airport taxi",
			"createdAt": "2026-04-01T00:00:00.000Z",
			"updatedAt": "2026-04-01T00:00:00.000Z",
			"deletedAt": null,
			"userId": "uuid"
		}
	],
	"meta": {
		"page": 1,
		"limit": 2,
		"total": 1
	}
}
```

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
- avoids unnecessary complexity while still demonstrating thoughtful backend design

Microservices would add operational complexity without meaningful payoff for the assignment size.

### Prisma Aggregation Strategy

For dashboard metrics, the implementation avoids pulling all records into Node.js memory:

- `aggregate` handles total income and total expenses
- `groupBy` handles category totals
- raw SQL handles monthly trend bucketing efficiently in PostgreSQL

This keeps the heavy math in the database where it scales better.

## Documentation & Security Notes

- Swagger docs are generated from controller JSDoc annotations.
- Raw OpenAPI JSON is available at `GET /api/v1/openapi.json` for local tooling imports.
- Global rate limiting is set to `100 requests / 15 minutes`.
- Auth endpoints are additionally rate-limited to `10 requests / 15 minutes`.
- Protected routes use bearer-token authentication.

## Submission Notes

- No live backend deployment is included.
- This is intentional to keep the assignment focused on backend design and avoid unnecessary operational complexity or paid hosting requirements.
- The recommended reviewer flow is: `npm install` → `npx prisma migrate dev` → `npm run seed` → `npm run dev` → review via Swagger or Postman.

## Final Verification Checklist

- `npm run seed`
- `npm test`
- `npm run build`
- `npx prisma migrate status`
- open `http://localhost:3000/api/v1/api-docs`