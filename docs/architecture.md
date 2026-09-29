# Architecture freeze

## Style

Modular monolith:

```
React SPA (Vite) → Fastify REST → Application services → Domain → Repositories → SQLite (dev)
```

PostgreSQL is a later production adapter behind the same repository interfaces.

## Boundaries

- **Domain** (`domain/`): pure TypeScript. No React, Fastify, HTTP, or SQL.
- **Application** (`server/services/`): workflows, transactions, authorization checks.
- **HTTP** (`server/routes/`): cookies, Zod DTOs, status codes.
- **UI** (`src/`): presentation, no fee arithmetic.

## Money

Integer **millieme** (1 EGP = 1000 millieme). No IEEE floating-point in fee math.

## Case states

`DRAFT → SUBMITTED → CALCULATING → CALCULATED → PENDING_REVIEW → APPROVED → ISSUED`  
or `PENDING_REVIEW → RETURNED → DRAFT`.

## Roles → permissions

Conceptual roles from the spec (`estimator`, `supervisor`, `legal_reviewer`, `project_manager`, `leader`) plus `system_admin`.  
Authorization is permission-based (`case:create`, `calculation:approve`, …).

## Auth

HttpOnly session cookie (JWT via JOSE). Browser role fields are ignored.

## Demo vs production

`APP_MODE=demo` seeds users, catalog, and a marked-unverified rule pack. Collection KPIs are labeled demo until a real source exists.
