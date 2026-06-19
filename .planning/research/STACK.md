# Stack Research: Validade Zero

## Recommendation

Use a zero-cost pilot stack centered on **Neon Postgres + Cloudflare + Expo**, with provider adapters around every beta or external service.

| Layer | Choice | Confidence | Why |
|---|---|---:|---|
| Monorepo | pnpm workspaces + Turborepo | High | Fast local workflows, clear package boundaries, cacheable tasks. |
| Mobile | Expo + React Native | High | Best fit for camera, push, offline queue, and corridor use on phones. |
| Web admin | React + Vite | High | Leaner than SSR for an internal operational panel; deploys as static assets. |
| API | Hono on Cloudflare Workers | High | Small, fast, typed, zero-cost-friendly API edge layer. |
| Database | Neon Postgres | High | Real Postgres, branching for CI/E2E, free plan is permanent, scale-to-zero wakeups. |
| ORM/migrations | Drizzle | High | Type-safe SQL-first model, migration control, strong with Postgres. |
| Contracts | Zod + Hono RPC | Medium-high | Runtime validation and end-to-end typed client/server contracts. |
| Auth | Neon Auth behind AuthProvider adapter | Medium | Free and database-native, but currently beta; keep replaceable. |
| Storage | Cloudflare R2 | High | 10 GB-month free tier and free egress for evidence photos. |
| Scheduler | Cloudflare Cron Triggers | High | Alert engine should wake independently from database activity. |
| Push | Expo Push Notifications | High | Free push gateway and simplest Expo integration. |
| Offline | Expo SQLite + outbox sync | High | Avoids data loss during poor store connectivity. |
| CI/Security | GitHub Actions, CodeQL, Dependabot, secret scanning | High | Free for public repositories and matches public-repo security goal. |

## Neon vs Supabase

**Neon is preferred for this project** because database branching is central to TDD/E2E and the free plan includes many projects/branches. Neon Free includes 100 CU-hours per project, 0.5 GB storage, 5 GB egress, 10 branches per project, and scale-to-zero after 5 minutes. If free monthly limits are exhausted, compute is suspended until the next billing month. Source: https://neon.com/pricing and https://neon.com/docs/introduction/scale-to-zero

**Supabase remains a strong alternative** because it bundles mature Auth, Storage, Edge Functions, Realtime, and RLS ergonomics. Its Free plan includes two projects, 500 MB database size, 1 GB storage, 500k Edge Function invocations, 50k MAU, 2M realtime messages, and 200 realtime peak connections. Source: https://supabase.com/docs/guides/platform/billing-on-supabase

**Decision:** use Neon for database-first architecture, but avoid binding domain logic to Neon-specific beta APIs. Cloudflare fills the missing pieces: API, cron, and storage.

## Free Cost Model

- Neon Free: database, branching, Data API, Auth quota. Main risks: 100 CU-hour cap, 0.5 GB storage, no SLA on Free.
- Cloudflare Workers Free: 100k requests/day, 10 ms CPU per invocation; good for lightweight API and cron dispatch. Source: https://developers.cloudflare.com/workers/platform/pricing/
- Cloudflare R2 Free: 10 GB-month, 1M Class A ops/month, 10M Class B ops/month, free egress. Source: https://developers.cloudflare.com/r2/pricing/
- Expo Push: free notification service, but delivery is not guaranteed by OS push systems. Source: https://docs.expo.dev/push-notifications/overview/
- GitHub public repo: Actions/CodeQL/security features are available without recurring infra cost, but workflow minute details should be verified before heavy CI.

## Type Safety Strategy

1. Database schema lives in Drizzle migrations.
2. Generated DB types are consumed by repositories only.
3. Domain models are separate from persistence rows.
4. All inbound API payloads validate through Zod.
5. Hono RPC exposes typed API clients to mobile and web.
6. Domain commands use discriminated unions for impossible states.
7. any, unsafe casts, and nullable shortcuts are lint-blocked except with justification.

## Testing Stack

- Unit and property-style tests for domain rules: Vitest.
- Integration tests for API/use cases: Vitest + local/branch database.
- Database tests: SQL assertions for constraints, indexes, RLS-like authorization filters; pgTAP can be evaluated if supported in target Neon environment.
- Web E2E: Playwright.
- Mobile E2E: Maestro.
- Mutation testing: StrykerJS on critical domain packages.
- Static quality: TypeScript strict, ESLint type-aware rules, dependency boundary checks.
- Security: secret scanning, dependency audit, CodeQL, threat-model docs, OWASP ASVS/MASVS checklists.

## What Not To Use Initially

- Do not use microservices; use a modular monolith.
- Do not make Vercel the primary host; Cloudflare is a better fit because Workers, Pages, R2, and Cron work together in the free-cost architecture.
- Do not store photos in Postgres; store object keys in Postgres and binaries in R2.
- Do not rely on push alone; use push + in-app task queue + escalation + closing checklist.
- Do not let mobile/web talk directly to privileged database credentials.
- Do not over-share UI components across React Native and web; share tokens, copy, schemas, and business rules first.

## Source Notes

- Neon pricing: https://neon.com/pricing
- Neon scale to zero: https://neon.com/docs/introduction/scale-to-zero
- Neon Data API: https://neon.com/docs/data-api/overview
- Neon Auth: https://neon.com/docs/auth/overview
- Cloudflare Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/
- Supabase billing comparison: https://supabase.com/docs/guides/platform/billing-on-supabase
- Expo push: https://docs.expo.dev/push-notifications/overview/
- pnpm workspaces: https://pnpm.io/workspaces
- Turborepo docs: https://turbo.build/repo/docs
- TypeScript TSConfig: https://www.typescriptlang.org/tsconfig/
- Zod docs: https://zod.dev/

