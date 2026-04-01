# Zorvyn Intern Assignment: System Architecture & SSOT
**Project:** Finance Data Processing and Access Control Backend

## 1. System Overview & Evaluation Focus
This document serves as the absolute source of truth for generating a production-grade backend. Based on the assignment requirements, the system must prioritize:
1.  **Correctness, Clarity, Maintainability:** Clean code and structured logic over monolithic files.
2.  **Separation of Concerns (Evaluation Criteria 1):** Strict adherence to a Route -> Controller -> Service -> Model architecture.
3.  **Logical Thinking & Access Control (Criteria 2 & 4):** Bulletproof Role-Based Access Control (RBAC) and validation middleware.
4.  **All Optional Enhancements:** Implementing Token Auth, Pagination, Search, Soft Deletes, Rate Limiting, Integration Tests, and automated API Docs.

**Implementation Status (2026-04-01):** This specification has been fully implemented in the current codebase.

### Tech Stack Selection (Addressing "Flexibility" Requirement)
- **Language/Framework:** Node.js, TypeScript, Express.js. (Chosen for strong typing, high readability, and standard REST modeling).
- **Database/ORM:** PostgreSQL & Prisma. (Chosen for relational data integrity, financial accuracy via Decimal types, and type-safe data modeling).
- **Validation:** Zod (for input/schema validation).
- **Security:** bcryptjs (hashing), jsonwebtoken (JWT tokens), express-rate-limit.
- **Testing:** Jest, Supertest (TDD / API Integration testing).

---

## 2. Directory Structure & Separation of Concerns
Code **must not** be grouped together. It must be isolated by functional domain.

```text
/
├── prisma/            # schema.prisma, migrations, and seed.ts (Mock data generation)
├── src/
│   ├── config/        # Environment configurations (ENV loading via Zod)
│   ├── controllers/   # Only parses HTTP req/res -> calls Service -> returns formatted standard response
│   ├── services/      # Core business rules, database transactions, aggregations (No Express types here)
│   ├── routes/        # Maps URLs to Controllers and attaches Middlewares
│   ├── middlewares/   # JWT Auth Guard, RBAC Guard, Zod Validator, Rate Limiters, Global Error Catch
│   ├── schemas/       # Zod definition files (e.g., user.schema.ts, record.schema.ts)
│   ├── types/         # TypeScript definitions (e.g., req.user payload)
│   ├── utils/         # Reusable helpers (Response formatters, Async wrappers, Decimal converters)
│   └── server.ts      # Express App initialization, routing base (/api/v1), and DB connection
├── tests/             # Automated test suites for business logic and API endpoints
├── .env.example       # Template for environment variables
└── README.md          # Exhaustive setup, assumptions, and tradeoffs document
```

---

## 3. Database & Data Modeling (Requirement #2 & Criteria 5)
Use Prisma to generate this exact schema. 

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// User & Role Management (Core Req #1)
enum Role {
  VIEWER
  ANALYST
  ADMIN
}

enum Status {
  ACTIVE
  INACTIVE
}

enum TransactionType {
  INCOME
  EXPENSE
}

model User {
  id           String   @id @default(uuid())
  name         String
  email        String   @unique
  passwordHash String
  role         Role     @default(VIEWER)
  status       Status   @default(ACTIVE)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  records      FinancialRecord[]
}

// Financial Records Management (Core Req #2)
model FinancialRecord {
  id          String          @id @default(uuid())
  amount      Decimal         // Exact numerical precision for finance
  type        TransactionType // income or expense
  category    String          // e.g., 'salary', 'groceries', 'servers'
  date        DateTime
  notes       String?         // Optional description
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  deletedAt   DateTime?       // Required for Optional "Soft Delete"

  userId      String
  createdBy   User            @relation(fields: [userId], references: [id])
}
```

---

## 4. Role-Based Access Control Logic (Core Req #1 & #4)

### The `User Status` Rule
- If `user.status === 'INACTIVE'`, the Auth Guard middleware MUST return `401 Unauthorized` for all requests. They are locked out.

### The RBAC Matrix
1. **VIEWER:**
   - Can ONLY access `/api/v1/dashboard/summary`.
   - Cannot view individual records. Cannot create/modify/delete. Cannot manage users.
2. **ANALYST:**
   - Can read and filter individual records. Can view insights/dashboard.
   - Cannot create, edit, or delete records. Cannot manage users.
3. **ADMIN:**
   - Can create, view, update, delete (soft delete) records.
   - Can fully manage users (Create, Assign roles, Toggle Active/Inactive status).

---

## 5. Required API Specification (RESTful Endpoints)
All routes must be prefixed with `/api/v1`.

### 5.1. Authentication
- `POST /auth/register`: Public. Body: `name, email, password`. Default role is `VIEWER`.
- `POST /auth/login`: Public. Body: `email, password`. Returns JWT.

### 5.2. User Management (Access: ADMIN ONLY)
- `POST /users`: Create a user directly (assigning role and status).
- `GET /users`: List all users.
- `PATCH /users/:id/role`: Update `role` field.
- `PATCH /users/:id/status`: Update `status` field (ACTIVE/INACTIVE).

### 5.3. Financial Records Management
- `POST /records`: Create record. (Access: **Admin**).
- `GET /records`: View records. (Access: **Admin, Analyst**).
  - *Must support filters (Query Params):* `startDate`, `endDate`, `category`, `type`.
  - *Must support pagination (Optional Req):* `page`, `limit`.
  - *Must support search (Optional Req):* `q` query string matching `category` or `notes` case-insensitively.
  - *Data constraint:* ALWAYS exclude rows where `deletedAt != null`.
- `GET /records/:id`: Get specific record. Filter out deleted. (Access: **Admin, Analyst**).
- `PUT /records/:id`: Full update. (Access: **Admin**).
- `DELETE /records/:id`: Soft delete implementation (`deletedAt = now()`). (Access: **Admin**).

### 5.4. Dashboard Summary Analytics (Core Req #3)
- `GET /dashboard/summary`: (Access: **Admin, Analyst, Viewer**).
  - Must return the following aggregate data:
    1. `totalIncome` (Sum of income records)
    2. `totalExpenses` (Sum of expense records)
    3. `netBalance` (Income - Expense)
    4. `categoryTotals` (Aggregated sum per category)
    5. `recentActivity` (Last 5 records ordered by date desc)
    6. `trends` (Monthly/weekly grouped sums of income vs expense)
  - **Engineering Rule:** Do NOT use `findAll` to pull rows into Node.js arrays and manually loop over them. You must utilize database-level tools (`prisma.financialRecord.aggregate`, `groupBy`, or raw SQL).

---

## 6. Standardized Response & Error Handling (Core Req #5)

**Every controller must output this exact JSON envelope for standard parsing:**

*Success Standard (HTTP 200, 201)*
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { "key": "value" }, 
  "meta": { "page": 1, "limit": 10, "total": 42 } // Meta ONLY exists for paginated arrays
}
```

*Error Standard (HTTP 400, 401, 403, 404, 429, 500)*
```json
{
  "success": false,
  "message": "Resource not found or invalid input",
  "error": [ 
     { "field": "amount", "message": "Amount must be a positive number" } // Included for Zod validations
  ]
}
```
*HTTP Codes mapped appropriately:* 400 (Bad Request/Validation), 401 (Unauthenticated/Inactive), 403 (RBAC Forbidden), 404 (Not Found), 500 (Server Error Catch-All).

---

## 7. Deliverables & Documentation Checklist (Criteria 7 & 8)
Before final submission, these steps must be fully complete:
1. **Automated Setup:** Generate a `prisma/seed.ts` file that uses bcryptjs to generate 1 Admin, 1 Analyst, 1 Viewer, and randomly generates 50+ financial records spanning multiple months and categories.
2. **API Documentation:** Use JSDoc annotations to automatically generate swagger UI at `/api/v1/api-docs`.
  - Expose the raw OpenAPI document at `/api/v1/openapi.json` for external Swagger tooling or public documentation portals.
3. **Automated Testing:** Implement Integration Tests for Authorization failures, Zod Validation, CRUD rules, and Dashboard Calculations.
4. **README.md file containing:**
  - Clear project overview and Setup steps (`npm install`, `.env` creation, `npx prisma migrate dev`, `npm run seed`, `npm run dev`).
   - Explanation of API Endpoints.
   - **"Assumptions Made":** Document choices like standardizing a single currency, assuming default "VIEWER" role on signup, etc.
   - **"Tradeoffs Considered":** Document choosing Express/Prisma monolithic over Microservices to honor the prompt's request against "unnecessary complexity".

**Delivered in current implementation:**
- Prisma migration history is tracked in `prisma/migrations`.
- Global rate limiting of `100 requests / 15 minutes`.
- Auth route rate limiting of `10 requests / 15 minutes`.
- Swagger docs generated from controller JSDoc annotations.
- Raw OpenAPI JSON is exposed at `/api/v1/openapi.json`.
- Seeded sample users and records for local verification.