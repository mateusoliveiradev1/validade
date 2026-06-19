# Walking Skeleton - Validade Zero

**Phase:** 1
**Generated:** 2026-06-18T23:50:34-03:00

## Capability Proven End-to-End

A developer can install the monorepo, run mobile/web/API smoke surfaces, exercise a safe API probe through shared contracts and fake adapters, and prove all baseline quality and security gates from one documented command set.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Monorepo | pnpm workspaces plus Turborepo | Matches project stack and gives cacheable, typed command orchestration. |
| Mobile | Expo in `apps/mobile` | Keeps the phone-first path ready for camera, push, and offline work. |
| Web | React + Vite in `apps/web` | Lightweight static admin/support surface for later leadership flows. |
| API | Hono on Cloudflare Workers in `apps/api` | Typed edge API that can run locally through Wrangler and later deploy on free Cloudflare infrastructure. |
| Data layer | Provider interfaces in `packages/adapters`, fake/local adapter in Phase 1, Neon/Drizzle contract prepared | Honors D-17: no mandatory live credentials in this phase while preserving the later database direction. |
| Auth | Adapter boundary only | Neon Auth is replaceable and not required before role/auth phases. |
| Directory layout | `apps/*` for deployables, `packages/*` for contracts/config/domain/test/adapters | Matches modular monolith constraints and avoids premature microservices. |
| Security baseline | Public-repo-safe env, fixtures, secret checks, dependency audit, CodeQL/dependency review docs | Directly supports FND-04 and AUD-04. |

## Stack Touched in Phase 1

- [ ] Project scaffold: pnpm workspace, Turbo task graph, TypeScript, lint, format, test runners.
- [ ] Routing: web and mobile smoke surfaces plus API health/probe routes.
- [ ] Persistence boundary: fake/local adapter proves read/write semantics without live provider credentials.
- [ ] UI interaction: web/mobile smoke can trigger or display the safe API probe.
- [ ] Deployment/run contract: documented local full-stack commands and CI baseline.

## Out of Scope (Deferred to Later Slices)

- Real Neon project creation, live migrations, RLS, or branch database provisioning.
- Real Cloudflare Workers deploy, R2 bucket creation, Cron triggers, or dashboard tokens.
- Neon Auth, roles, sessions, and permission enforcement.
- Product catalog, lots, risk windows, tasks, markdown/rebaixa, push escalation, offline sync, and audit persistence.
- Real store/user/product/evidence data.

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without changing the foundation contract:

- Phase 2: domain and risk core inside the protected domain boundary.
- Phase 3: mobile lot capture using shared contracts and future persistence.
- Phase 4: "Hoje" task workflow using the API and mobile surfaces.
- Phase 5: push and escalation through provider adapters plus persistent tasks.
- Phase 6: markdown/rebaixa workflow and evidence boundary.
- Phase 7: offline sync and idempotent outbox.
- Phase 8: audit, roles, and shift close.
- Phase 9: Impeccable hardening and v1 readiness.
