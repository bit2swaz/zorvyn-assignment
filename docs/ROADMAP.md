# Development Roadmap: Finance Backend
**Execution Methodology:** TDD (Red-Green-Refactor). 
**Reference Guide:** `docs/SSOT.md`.

**Current Status (2026-04-01):** All roadmap phases are complete and implemented in the codebase.

**Final Verification Snapshot:**
- `npm run build` passes.
- `npm run seed` populates 3 users and 54 financial records.
- `npm test` passes with 36 tests across 7 suites.
- Swagger UI is mounted at `GET /api/v1/api-docs`.
- Raw OpenAPI JSON is exposed at `GET /api/v1/openapi.json`.

This roadmap contains sequenced phases. For each mini-phase, copy the "Master Prompt" and paste it into your AI IDE. Wait for the AI to complete the implementation and run the prescribed verification checks before moving to the next prompt.

The prompts below are preserved as the implementation record for how the project was delivered phase-by-phase.

---

## Phase 1: Project Initialization & Infrastructure
**Goal:** Take an empty repository, set up TypeScript, Express, Prisma, Testing frameworks, and Code Quality tools.

### Mini-Phase 1.1: Core Scaffolding & Dependencies
**Master Prompt 1:**
> "Read docs/SSOT.md. We are starting Phase 1.1. Initialize a new Node.js project. Install TypeScript, Express, Prisma, Zod, jsonwebtoken, bcryptjs, helmet, cors, express-rate-limit, swagger-ui-express, swagger-jsdoc. Also install dev dependencies: typescript, ts-node, @types/node, @types/express, jest, supertest, ts-jest, eslint, prettier, and associated types. Set up `tsconfig.json`, `.eslintrc.js`, and `.prettierrc` to standard strict rules. Create the exact folder structure defined in the SSOT Section 2. Set up a basic `src/server.ts` and `src/app.ts` with basic Helmet and CORS middleware. Do not write feature logic yet. use context7"

**Verification Check:**
- Run `npm run build` or `npx tsc` — it should compile without errors.
- Ensure ESLint/Prettier configs exist in the root.

### Mini-Phase 1.2: Database Modeling & Prisma Init
**Master Prompt 2:**
> "Read docs/SSOT.md (Section 3). Initialize Prisma for PostgreSQL (`npx prisma init`). Replace the generated `schema.prisma` content EXACTLY with the schema defined in Section 3 of the SSOT. Generate the Prisma Client. Also, configure `src/config/env.ts` using Zod to strictly validate `DATABASE_URL`, `PORT`, and `JWT_SECRET` from `.env`. use context7"

**Verification Check:**
- Add a valid PostgreSQL URL to `.env`.
- Run `npx prisma db push` — tables (`User`, `FinancialRecord`) should appear in your database.

---

## Phase 2: Core Utilities & Middleware (TDD)
**Goal:** Build the global error handlers, response formatters, and Zod validation middleware via Test-Driven Development.

### Mini-Phase 2.1: Global Error & Standard Response Wrapper
**Master Prompt 3:**
> "We are executing Phase 2.1 using TDD. First, write unit tests in `tests/middleware.test.ts` to test a global error handler and an async wrapper/response formatter that strictly outputs the JSON shapes defined in SSOT Section 6 (Success and Error standards). These tests will initially fail. Next, implement `src/utils/response.ts` (formatter), `src/utils/asyncHandler.ts`, and `src/middlewares/errorHandler.ts` to make the tests pass. Mount the error handler in `src/app.ts`. Ensure HTTP codes are mapped correctly. use context7"

**Verification Check:**
- Run `npm test` — The middleware and formatter tests must pass.

### Mini-Phase 2.2: Zod Validation Hook
**Master Prompt 4:**
> "Following TDD for Phase 2.2: First, write a test in `tests/validation.test.ts` for a generic `validateResource` middleware. It should accept a Zod schema and test for HTTP 400 Bad Request on invalid payloads, and allow `next()` on valid ones. Then, implement `src/middlewares/validateResource.ts`. Ensure the validation errors map beautifully into the `"error"` array of our Standard Response Format. use context7"

**Verification Check:**
- Run `npm test` — Validation middleware correctly traps bad requests and returns 400.

---

## Phase 3: Auth & User Management (TDD & RBAC)
**Goal:** Secure the API, generate JWTs, enforce roles, and manage user lifecycles.

### Mini-Phase 3.1: Authentication & RBAC Middlewares
**Master Prompt 5:**
> "Phase 3.1 via TDD. Read SSOT Section 4 and 5.1. 
> 1. Write integration tests in `tests/auth.test.ts` for `POST /api/v1/auth/register` (creates VIEWER) and `POST /api/v1/auth/login`. Test valid/invalid creds, duplicate emails, and importantly, ensure INACTIVE users cannot log in. Also, write tests simulating accessing a protected route to verify Auth Guard and Role Guard logic.
> 2. Implement `src/schemas/auth.schema.ts`.
> 3. Implement `src/middlewares/requireAuth.ts` and `src/middlewares/requireRole.ts` (ensuring `req.user.status === 'INACTIVE'` throws 401).
> 4. Implement `src/services/auth.service.ts` (use bcrypt & jwt) and `src/controllers/auth.controller.ts`. Mount in `routes/auth.routes.ts` and `app.ts`. Make the tests pass. use context7"

**Verification Check:**
- Run `npm test tests/auth.test.ts` — Authentication, Registration, and JWT rejection rules must pass.

### Mini-Phase 3.2: User Management (Admin Only)
**Master Prompt 6:**
> "Phase 3.2 via TDD. Read SSOT Section 5.2.
> 1. Write tests in `tests/users.test.ts`. Test that ANALYST and VIEWER roles receive HTTP 403 Forbidden for all `/api/v1/users` routes. Test that an ADMIN can GET all users, POST a new user directly, PATCH user role, and PATCH user status.
> 2. Create the respective Zod schemas in `user.schema.ts`.
> 3. Implement `user.service.ts` and `user.controller.ts`. Ensure controllers simply parse and pass to the service. Mount the routes protected by `requireAuth` and `requireRole(['ADMIN'])`. Make the tests pass. use context7"

**Verification Check:**
- Run `npm test tests/users.test.ts` — Admin actions pass, lower roles fail with 403.

---

## Phase 4: Financial Records & Complex Querying
**Goal:** Implement CRUD with robust pagination, filtering, search, and soft-delete.

### Mini-Phase 4.1: Record Creation & Reading (With Filters)
**Master Prompt 7:**
> "Phase 4.1 via TDD. Read SSOT Section 5.3. 
> 1. Write tests in `tests/records.test.ts`. Test creating records (Admin only). Test fetching records (Admin/Analyst only - Viewers get 403). Ensure pagination logic returns the `meta` key (page, limit, total). Ensure `startDate`, `endDate`, `category` and `type` filters work. Test that search `q` matches case-insensitively on `notes`/`category`. Test that `deletedAt != null` rows are NEVER returned. 
> 2. Implement Zod schemas (`record.schema.ts`).
> 3. Implement `record.service.ts` and `record.controller.ts`. For Decimal handling, cleanly convert to Numbers or Strings in the Service layer before returning. Make tests pass. use context7"

**Verification Check:**
- Run tests. Pagination (`meta`), filtering, search, and Decimal coercion must function cleanly.

### Mini-Phase 4.2: Updates & Soft Delete
**Master Prompt 8:**
> "Phase 4.2 via TDD. Continue in `tests/records.test.ts`.
> 1. Write tests for `PUT /records/:id` (Full update) and `DELETE /records/:id` (Soft Delete). Assert that deleting DOES NOT remove the row from the DB, but instead sets `deletedAt`. Assert that a subsequent GET request to that ID returns a 404 (because soft-deleted rows are excluded). 
> 2. Implement the PUT and DELETE logic in the Record Service/Controller. Make tests pass. use context7"

**Verification Check:**
- Verify standard delete queries aren't executing. Prisma should be executing `update({ data: { deletedAt: new Date() } })`. 

---

## Phase 5: Dashboard Analytics Engine
**Goal:** Process math directly on the database using Prisma Aggregations.

### Mini-Phase 5.1: The Aggregation Engine
**Master Prompt 9:**
> "Phase 5 via TDD. Read SSOT Section 5.4 carefully.
> 1. Write tests in `tests/dashboard.test.ts` to mock several transactions and then fetch `GET /api/v1/dashboard/summary`. Assert the shape of the response contains `totalIncome`, `totalExpenses`, `netBalance`, `categoryTotals`, `recentActivity`, and `trends`. 
> 2. Implement `dashboard.service.ts` and `dashboard.controller.ts`. 
> STRICT RULE: Do not use `prisma.financialRecord.findMany()` to fetch all rows and calculate manually. You must use `prisma.financialRecord.aggregate` for sums, `groupBy` for category subtotals, and handle the `trends` grouping efficiently. Calculate net balance at the DB or Service level. Mount routes accessible to Admin, Analyst, and Viewer. use context7"

**Verification Check:**
- The math tests must pass reliably without causing heap out-of-memory errors on large datasets (because calculations are deferred to PostgreSQL).

---

## Phase 6: Deliverables & Polish
**Goal:** Automate seeding, configure Swagger docs, generate README, and finalize system.

**Delivered Outcome:**
- Added `prisma/seed.ts` with 3 seeded users and 54 realistic records across 3 months.
- Added Prisma migration tracking in `prisma/migrations`.
- Added Swagger generation and mounted UI at `GET /api/v1/api-docs`.
- Added a raw OpenAPI spec route at `GET /api/v1/openapi.json` for public documentation tooling.
- Added global and auth-specific rate limiting.
- Rewrote `README.md` with setup, seeding, TDD, assumptions, and tradeoffs.
- Final verification completed and committed as `feat: add polish deliverables`.

### Mini-Phase 6.1: Seed Script & Automated Documentation
**Master Prompt 10:**
> "Read SSOT Section 7. We are in the final polish phase. 
> 1. Write `prisma/seed.ts` that truncates tables, generates 1 ADMIN, 1 ANALYST, 1 VIEWER (using bcrypt to hash password 'Password123!'), and creates at least 50 realistic FinancialRecords spanning 3 months.
> 2. Add JSDoc annotations to all Controllers to auto-generate Swagger docs via `swagger-jsdoc`. Mount the Swagger UI on `GET /api/v1/api-docs`.
> 3. Add `express-rate-limit` middleware directly to `app.ts` (Global 100/15m limit, Auth 10/15m limit). use context7"

**Verification Check:**
- Run `npm run seed` (after adding command to package.json) -> Data populates.
- Start server `npm run dev` and navigate to `http://localhost:PORT/api/v1/api-docs` -> Swagger UI renders correctly.

### Mini-Phase 6.2: README & Clean-up
**Master Prompt 11:**
> "Read SSOT Section 7 completely. Generate the ultimate `README.md` file. Include Setup instructions, Seeding instructions, an explanation of the TDD approach used, 'Assumptions Made' section (Viewer vs Analyst logic, status handling), and a 'Tradeoffs Considered' section (Monolith vs Microservices). Ensure the tone matches a senior intern submission. Clean up any leftover code or console.logs. use context7"

**Verification Check:**
- Check formatting of `README.md`.
- Run entire test suite `npm run test` one final time to ensure 100% Green passing rate. Project is complete.