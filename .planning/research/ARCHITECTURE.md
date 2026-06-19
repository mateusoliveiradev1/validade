# Architecture Research: Validade Zero

## Architecture Style

Use a **modular monolith in a pnpm/Turborepo workspace**. The system should have strict package boundaries and strong contracts, but deploy as a small number of runtime surfaces:

- Mobile app
- Web admin
- Cloudflare Worker API
- Neon Postgres
- R2 evidence storage
- Expo push pipeline

This avoids premature microservices while still allowing clean domain isolation.

## Proposed Workspace

    apps/
      mobile/                 Expo React Native app
      web/                    React/Vite admin app
      api/                    Hono Cloudflare Worker
    packages/
      domain/                 pure DDD entities, value objects, rules
      application/            use cases and ports
      contracts/              Zod schemas, Hono RPC types, shared DTOs
      database/               Drizzle schema, migrations, repositories
      design-system/          tokens, copy, primitives, accessibility rules
      testing/                factories, fixtures, test helpers
      config/                 tsconfig, eslint, vitest, playwright config
    infra/
      cloudflare/             worker/r2/cron configuration
    docs/
      specs/                  SDD specs
      adr/                    architectural decisions
      threat-model/           security analysis

## Bounded Contexts

### Catalog

Products, categories, suppliers, product codes, rule profiles.

### Lot and Location

Lots, quantities, locations, last physical presence, movement history.

### Risk Engine

Validity windows, quality windows, task generation, severity, escalation.

### Task Workflow

Assignment, status transitions, resolution, reopen rules, shift close.

### Markdown/Rebaixa

Request, approval, application, shelf confirmation, evidence.

### Evidence and Audit

Photos, event log, immutable critical action history.

### Identity and Authorization

Users, roles, store/sector membership, permissions.

### Sync

Offline command queue, idempotency keys, conflict handling.

## Core Data Flow

1. Collaborator registers or imports product/lot.
2. Lot receives rule profile based on category/product.
3. Risk engine computes current state and task needs.
4. Cloudflare Cron triggers alert generation and push dispatch.
5. Collaborator receives push and sees task in mobile "Hoje".
6. Action is recorded locally first, then synced as an idempotent command.
7. API validates command, applies domain rules, writes events/state.
8. Evidence photo goes to R2; object key is stored in Postgres.
9. Audit log captures user, time, location, device/session, and action.

## Push Pipeline

Push should be redundant:

- Scheduled backend generation.
- Remote push via Expo.
- Local reminders for accepted tasks where possible.
- In-app task inbox.
- Escalation to lead if unresolved.
- Shift close gate showing pending critical risk.

## Offline Strategy

- Local SQLite stores active tasks, product/lot snippets, and pending commands.
- Every mutation is a command with an idempotency key.
- Sync applies commands in order.
- Conflicts are explicit: e.g. "lot already withdrawn", "task reassigned", "quantity changed".
- The UI must never present unsynced critical actions as fully confirmed.

## Security Architecture

- Public repo contains no secrets and no production data.
- All credentials live in GitHub/Cloudflare/Expo/Neon secret stores.
- API validates auth, role, store, sector, and action permission.
- Database authorization is defense-in-depth, not the only line of defense.
- Critical actions are append-only in audit tables.
- Evidence URLs are signed or proxied; buckets are not broadly public.
- Threat model is maintained before implementation phases.

## Build Order Implications

1. Workspace/tooling and domain package.
2. Database schema and migrations.
3. API command/query contracts.
4. Mobile task workflow with mock/local backend.
5. Neon/Cloudflare integration.
6. Push pipeline.
7. Web admin.
8. Evidence storage and audit.
9. E2E hardening and visual polish.

## Architecture Risks

- Neon Auth/Data API beta status requires adapters.
- Cloudflare Workers CPU free limit requires lightweight handlers.
- Offline sync can become complex; keep command vocabulary small early.
- Sharing UI across native and web can reduce quality; share tokens and logic first.

