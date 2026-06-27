---
phase: 10-real-pilot-flow-rebuild
plan: "02"
subsystem: catalog-mobile-web
tags:
  - product-catalog
  - duplicate-prevention
  - draft-review
  - mobile-discovery
  - command-center
  - audit
requires:
  - phase: 10-real-pilot-flow-rebuild
    plan: "01"
    provides: Authorized prepare-turn package, mobile central hydration, and visible central/cache sync taxonomy.
  - phase: 08-audit-roles-and-shift-close
    provides: Store-scoped authorization, sanitized audit events, and leadership audit scope.
  - phase: 09-impeccable-hardening-and-v1-readiness
    provides: Real mobile/web shells, release-quality copy expectations, and Command Center style constraints.
provides:
  - Strict product search, reuse, draft creation, review, and acknowledgement contracts.
  - Store-scoped central product catalog persistence with duplicate and similar-product protection.
  - Authorized API routes for product search, draft creation, and lead review.
  - Mobile product discovery/create flow that prefers central reuse and does not force lot registration.
  - Web Command Center visibility for pending product drafts.
affects:
  - 10-03-central-lot-lifecycle
  - 10-04-terminal-resolution-sync
  - 10-05-capture-backed-command-center
  - 10-06-pilot-uat
tech-stack:
  added: []
  patterns:
    - Store/product identity is normalized centrally and carried to local mobile cache with visible source/review/sync state.
    - Similar catalog candidates must be acknowledged before a new operational product draft is created.
    - Product draft audit events are sanitized and projected into leadership review surfaces without exposing privileged request payloads.
key-files:
  created:
    - packages/database/drizzle/0007_phase_10_product_catalog_keys.sql
    - .planning/phases/10-real-pilot-flow-rebuild/10-02-SUMMARY.md
  modified:
    - packages/contracts/src/capture.ts
    - packages/contracts/src/audit.ts
    - packages/contracts/src/command-center.ts
    - packages/database/src/schema.ts
    - packages/database/src/capture-repository.ts
    - packages/database/src/audit-repository.ts
    - apps/api/src/index.ts
    - apps/api/src/command-center.ts
    - apps/mobile/src/capture/repository.ts
    - apps/mobile/src/capture/sqlite-repository.ts
    - apps/mobile/src/capture/memory-repository.ts
    - apps/mobile/src/capture/ProductDiscoveryScreen.tsx
    - apps/mobile/src/capture/ProductFormScreen.tsx
    - apps/mobile/src/capture/CaptureApp.tsx
    - apps/web/src/command-center/CommandCenter.tsx
key-decisions:
  - "Product search, reuse, and draft creation are one operational path; local create remains only as fallback when central draft methods are unavailable."
  - "Duplicate prevention is central and store-scoped by normalized product key plus GTIN where present."
  - "Mobile can confirm a product without opening a lot immediately; lot registration remains an explicit next step."
  - "Draft product state is visible on mobile and web as pending central review instead of hidden backend-only status."
patterns-established:
  - "CaptureRepository exposes optional central product methods so memory, SQLite, and future HTTP-backed repositories can share UI behavior without forcing a network-only test setup."
  - "SQLite product rows keep categoryName, centralProductId, catalogSource, reviewStatus, centralSyncState, draftId, review message, and similar count."
  - "Command Center projection fields stay explicit arrays; adding product drafts required contract, API, web, fixture, and test updates together."
requirements-completed:
  - CAT-01
  - CAT-03
  - RSK-03
  - SYN-01
  - SYN-02
  - SYN-03
  - AUD-01
  - AUD-02
  - UI-02
  - UI-03
  - UI-04
duration: 150min
completed: 2026-06-26
---

# Phase 10 Plan 02: Product Catalog, Draft Review, and Unified Create/Reuse Flow Summary

**Central product truth now comes before lot work: operators search/reuse/create drafts in one flow, and leadership can see product review work.**

## Performance

- **Duration:** 150 min
- **Started:** 2026-06-26T19:55:00-03:00
- **Completed:** 2026-06-26T22:29:05-03:00
- **Tasks:** 3
- **Files modified:** 34

## Accomplishments

- Added strict shared contracts for product search, reusable central products, similar candidates, product draft creation, draft review state, duplicate reason, and central acknowledgement.
- Added central product catalog storage with normalized-key uniqueness, draft table usage, similar-candidate detection, idempotent duplicate handling, lead-only review, and sanitized product audit events.
- Added authorized API routes for product search, product draft create, and product draft review; client requests cannot provide store, role, or capability authority.
- Rebuilt mobile discovery/create so operators search by name/code/category, reuse existing central products, see similar warnings, create an operational draft only when safe, and confirm a product without forced lot registration.
- Added local memory and SQLite support for central/draft product state so offline cache and component tests keep the same visible truth.
- Added Command Center product-draft projection and web funnel section for pending review work, backed by sanitized `product.draft_created` audit events.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add central product search, duplicate, and draft contracts** - `2f88546` (`feat`)
2. **Task 2: Persist and authorize central product draft workflow** - `fa2e303` (`feat`)
3. **Task 3: Rebuild mobile discovery/create and web review visibility** - `e1de6a2` (`feat`)

**Plan metadata:** this summary commit.

## Files Created/Modified

- `packages/contracts/src/capture.ts` - Product search, draft create/review, duplicate, and acknowledgement schemas.
- `packages/contracts/src/audit.ts` - Added `product` as an audit target type.
- `packages/contracts/src/command-center.ts` - Added pending product draft projection schema.
- `packages/database/drizzle/0007_phase_10_product_catalog_keys.sql` - Product normalized key migration and store-scoped uniqueness.
- `packages/database/src/schema.ts` - Central product normalized key schema support.
- `packages/database/src/capture-repository.ts` - Product search/reuse/create/review repository and in-memory implementation.
- `packages/database/src/audit-repository.ts` - Database audit target union now includes products.
- `apps/api/src/index.ts` - Authorized product search/create/review routes.
- `apps/api/src/command-center.ts` - Product draft audit projection into Command Center.
- `apps/mobile/src/capture/repository.ts` - Optional central product repository methods and mapping helpers.
- `apps/mobile/src/capture/memory-repository.ts` - In-memory search/draft implementation for component tests.
- `apps/mobile/src/capture/sqlite-repository.ts` - Local product state persistence and central/draft product search/draft behavior.
- `apps/mobile/src/capture/sqlite-migrations.ts` - ALTER helpers for local product catalog columns.
- `apps/mobile/src/capture/ProductDiscoveryScreen.tsx` - Unified central search/reuse/similar/draft discovery surface.
- `apps/mobile/src/capture/ProductFormScreen.tsx` - Operational draft creation and similar-candidate acknowledgement.
- `apps/mobile/src/capture/CaptureApp.tsx` - Confirmed product route separates product confirmation from optional lot registration.
- `apps/web/src/command-center/CommandCenter.tsx` - Pending product draft funnel section.

## Decisions Made

- Product creation is a draft workflow when central methods are available; direct local product creation remains a compatibility fallback only.
- Similar-product candidates must be shown before draft creation. Creating the draft after seeing them passes their central ids back as acknowledgement.
- A pending product draft is not an approved catalog item; the mobile and web surfaces say it is pending central review and keep risk conservative.
- Admin membership is not enough for operational product review when no lead membership is present; review uses the existing lead-capable `shift.close` capability boundary.
- Command Center uses sanitized audit event metadata for pending product draft visibility rather than reading privileged product request payloads.

## Deviations from Plan

### Auto-fixed Issues

**1. Product route placement**
- **Found during:** Task 2 (Persist and authorize central product draft workflow)
- **Issue:** The plan listed `apps/api/src/capture.ts`, but the existing API route wiring is centralized in `apps/api/src/index.ts`.
- **Fix:** Implemented `/capture/products/search`, `/capture/products/drafts`, and `/capture/products/drafts/:draftId/review` in `index.ts` to reuse existing auth, capability, membership, and denial helpers.
- **Files modified:** `apps/api/src/index.ts`, `apps/api/src/capture.test.ts`
- **Verification:** `pnpm.cmd vitest run --config vitest.config.ts --project api -- capture authorization`
- **Committed in:** `fa2e303`

**2. Contract expansion for web product draft visibility**
- **Found during:** Task 3 (Rebuild mobile discovery/create and web review visibility)
- **Issue:** Command Center had no product-draft projection field and audit contracts did not accept `product` as a target type, even though product audit rows were required.
- **Fix:** Added `pendingProductDrafts` to the Command Center projection and `product` to audit target types, then updated API, web, fixtures, and tests together.
- **Files modified:** `packages/contracts/src/audit.ts`, `packages/contracts/src/command-center.ts`, `packages/database/src/audit-repository.ts`, `apps/api/src/command-center.ts`, `apps/web/src/command-center/CommandCenter.tsx`
- **Verification:** `pnpm.cmd --filter @validade-zero/contracts test -- command-center audit` and `pnpm.cmd vitest run --config vitest.config.ts --project web -- command-center`
- **Committed in:** `e1de6a2`

**3. SQLite product cache migration helper**
- **Found during:** Task 3 (Rebuild mobile discovery/create and web review visibility)
- **Issue:** Existing local installations need `capture_products` ALTER columns for central product id, source, review status, draft id, and review copy.
- **Fix:** Added `ensureProductCatalogColumns` and invoked it from SQLite initialization while keeping new installs on the full table definition.
- **Files modified:** `apps/mobile/src/capture/sqlite-migrations.ts`, `apps/mobile/src/capture/sqlite-repository.ts`
- **Verification:** `pnpm.cmd --filter @validade-zero/mobile typecheck` and `pnpm.cmd --filter @validade-zero/mobile test -- product-lookup mobile-product-polish`
- **Committed in:** `e1de6a2`

--- 

**Total deviations:** 3 auto-fixed (1 route placement, 1 contract projection expansion, 1 local migration support)
**Impact on plan:** All fixes preserved the planned behavior and made product draft state visible across contracts, mobile, API, and web.

## Issues Encountered

- `prettier --write` cannot be pointed at the SQL migration directly because the repo has no SQL parser configured for Prettier. The broad repo `format:check` still passes.
- The local git hook attempted to auto-push Task 2 and Task 3 commits, but GitHub was unreachable from this environment. The commits remain local.

## Verification

- `pnpm.cmd --filter @validade-zero/contracts test -- capture`
- `pnpm.cmd --filter @validade-zero/contracts typecheck`
- `pnpm.cmd --filter @validade-zero/database test -- repositories`
- `pnpm.cmd --filter @validade-zero/database db:check`
- `pnpm.cmd --filter @validade-zero/database typecheck`
- `pnpm.cmd vitest run --config vitest.config.ts --project api -- capture authorization`
- `pnpm.cmd vitest run --config vitest.config.ts --project api -- command-center capture`
- `pnpm.cmd --filter @validade-zero/mobile test -- product-lookup mobile-product-polish`
- `pnpm.cmd --filter @validade-zero/mobile typecheck`
- `pnpm.cmd vitest run --config vitest.config.ts --project web -- command-center`
- `pnpm.cmd --filter @validade-zero/web typecheck`
- `pnpm.cmd --filter @validade-zero/contracts test -- command-center audit`
- `pnpm.cmd lint`
- `pnpm.cmd format:check`
- `pnpm.cmd check`

## User Setup Required

None.

## Next Phase Readiness

Ready for `10-03-PLAN.md`. The next plan can depend on central product identity, draft/review state, and mobile/web visibility before introducing central lot lifecycle and second-device lot/task projection.

---

*Phase: 10-real-pilot-flow-rebuild*
*Completed: 2026-06-26*
