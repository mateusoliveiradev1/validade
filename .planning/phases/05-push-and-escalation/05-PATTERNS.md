# Phase 05: Push and Escalation - Pattern Map

**Mapped:** 2026-06-20
**Status:** Ready for planning

## Purpose

This map anchors Phase 5 execution to the current codebase so push reminders and escalation extend the Phase 4 "Hoje" task workflow without inventing a parallel notification app or claiming remote guarantees that the repo cannot yet support.

## Existing Patterns to Reuse

| Need | Existing file | Pattern to reuse |
|---|---|---|
| Pure operational rules | `packages/domain/src/tasks.ts` | `as const` vocabulary arrays, exported union types, pure helper functions, and no infrastructure imports. |
| Runtime contracts | `packages/contracts/src/tasks.ts` | Strict Zod schemas, discriminated unions, reusable required text/id/date schemas, and inferred exported types. |
| Repository port | `apps/mobile/src/capture/repository.ts` | Explicit operations, parse helpers at boundaries, deterministic dependencies, and narrow input/result types. |
| Memory adapter | `apps/mobile/src/capture/memory-repository.ts` | Maps, deterministic clock/id injection, and behavior mirroring SQLite for component tests. |
| SQLite adapter | `apps/mobile/src/capture/sqlite-repository.ts` | Idempotent `CREATE TABLE IF NOT EXISTS`, indexes, parameterized writes, transaction for multi-step task writes, and mapping rows through contracts. |
| Mobile shell routing | `apps/mobile/src/capture/CaptureApp.tsx` | Simple local state navigation; add push-open task routing without introducing a router. |
| Hoje task screen | `apps/mobile/src/capture/TodayScreen.tsx` | Safety header first, stable task list, status notices, operational sections, and task row anatomy. |
| Task resolution flow | `apps/mobile/src/capture/TaskResolutionPanel.tsx` | Explicit action selection, inline blockers, reinforced confirmation, and task remains open until compatible resolution. |
| Mobile primitives | `apps/mobile/src/capture/capture-ui.tsx` | `PrimaryAction`, `SecondaryAction`, `SelectionRow`, `StatusNotice`, `Field`, 48dp targets, text labels, and accessible roles. |
| Tokens | `apps/mobile/src/capture/capture-theme.ts` | Semantic colors, 8px radius ceiling, spacing tokens, and critical/warning/accent treatments. |
| Operational copy | `apps/mobile/src/capture/today-copy.ts` | Centralize visible Portuguese-BR copy away from domain enums; keep code identifiers in English. |
| API app | `apps/api/src/index.ts` | Small Hono routes plus provider registry injection; validate output through contracts and avoid leaking secrets. |
| Provider registry | `packages/adapters/src/index.ts` | Adapter interfaces with local in-memory implementation, deterministic `now`, and contract-validated payloads. |
| API tests | `apps/api/src/index.test.ts` | `app.request()` tests that assert status/body and absence of secret-like output. |
| Mobile tests | `apps/mobile/src/capture/today-screen.test.tsx`, `apps/mobile/src/App.test.tsx` | React Test Renderer with `react-native` and Expo module mocks, fictitious fixtures, and source-visible copy assertions. |
| Native smoke | `.maestro/smoke.yaml` | Keep stable assertions short: app launches to `Hoje`, safety verdict, refresh action, and registration path. |

## Files Expected to Change

### Domain and contracts

- `packages/domain/src/alerts.ts` - pure cadence, off-shift eligibility, audience, escalation, retry/backoff disposition, and privacy-safe content helpers.
- `packages/domain/src/alerts.test.ts` - tests for D-01 through D-08 policy decisions.
- `packages/domain/src/index.ts` - export alert vocabulary.
- `packages/contracts/src/alerts.ts` - Zod schemas for alert state, device registration, dispatch command, delivery result, and push-open intent.
- `packages/contracts/src/alerts.test.ts` - strict validation coverage for alert records and provider payloads.
- `packages/contracts/src/index.ts` - export alert contracts.

### Mobile repository, channel, and tests

- `apps/mobile/package.json` - add `expo-notifications` and `expo-constants` with Expo-compatible versions.
- `apps/mobile/app.json` - add the `expo-notifications` config plugin; keep existing SQLite/camera/date-picker plugins.
- `apps/mobile/src/capture/alert-channel.ts` - mockable Expo notification permission/token/schedule/response-listener adapter.
- `apps/mobile/src/capture/alert-state.ts` - local alert state helpers if useful outside repository adapters.
- `apps/mobile/src/capture/repository.ts` - extend repository port with alert state, device registration, escalation acknowledgement, and push-open lookup operations.
- `apps/mobile/src/capture/memory-repository.ts` - deterministic alert state behavior for tests.
- `apps/mobile/src/capture/sqlite-repository.ts` - `task_alert_states`, `device_alert_channels`, `alert_attempts`, and `escalation_receipts` tables plus indexes.
- `apps/mobile/src/capture/alert-state.test.ts` / `push-channel.test.ts` - cadence, adapter, and repository tests using fake tokens only.

### Mobile UI

- `apps/mobile/src/capture/TodayScreen.tsx` - add `PushPermissionCard`, `AlertChannelNotice`, and `TaskAlertStatus` without changing the safety verdict as primary focal point.
- `apps/mobile/src/capture/TaskResolutionPanel.tsx` - preserve task resolution semantics; do not add lock-screen completion.
- `apps/mobile/src/capture/CaptureApp.tsx` - wire notification response/open intent to current task or stale/resolved fallback banner.
- `apps/mobile/src/capture/today-copy.ts` - add approved Phase 5 copy from `05-UI-SPEC.md`, using existing ASCII copy style where source code already does.
- `apps/mobile/src/capture/push-alerts.test.tsx` - permission card, denied/unavailable/failure, task alert row, stale fallback, and leadership acknowledgement assertions.
- `apps/mobile/src/App.test.tsx` - smoke-level assertion that Phase 5 alert channel state appears on the Hoje-first entry.

### API / provider seam

- `packages/adapters/src/index.ts` or `packages/adapters/src/alerts.ts` - Expo provider adapter interface and in-memory/fake implementation that never uses real tokens in tests.
- `apps/api/src/index.ts` - export Hono app plus `scheduled()` handler shape or provider-injected alert routes/handler as needed.
- `apps/api/src/alerts.test.ts` - scheduled dispatch/provider mapping tests.
- `apps/api/wrangler.toml` - add testable `[triggers]` cron expression if the scheduled handler is included in this phase.
- `docs/operations/push-alerts.md` - document pilot limitations, development build/native push blocker, fake-token safety, and "push does not resolve task".
- `.maestro/smoke.yaml` - add stable Phase 5 alert notice/CTA only if it remains deterministic without native push credentials.

## Scope Fences

- Do not implement formal RBAC, user management, store/team administration, or shift-close leadership dashboard. Those are Phase 8.
- Do not implement offline command queue, sync conflicts, or durable server task sync. Those are Phase 7.
- Do not implement markdown approval/application workflow. That is Phase 6.
- Do not store real device tokens, real operational data, real evidence, or private photos in fixtures/docs.
- Do not let notification tap, delivery success, delivery receipt, or leadership acknowledgement resolve a task.
- Do not put lot identity/details in lock-screen content.
- Do not introduce a dashboard, notification inbox, analytics timeline, or complex schedule editor.

## Implementation Notes for Executor

- Keep cadence calculation pure and deterministic: input task state, alert state, now, and shift/off-shift context; output next action.
- Store alert state by task id plus active key so stale push payloads can detect task replacement.
- Use adapter interfaces for notification permissions, token, local scheduling, remote provider send, and receipt lookup.
- Keep fake tokens obvious, for example `ExponentPushToken[FICTICIO-...]`; never paste a real token into tests.
- In source code, match the current mobile copy style: technical identifiers in English, visible strings in direct Portuguese-BR, currently ASCII-normalized in `today-copy.ts`.
- Prefer component tests over native push tests for permission/channel UI; native delivery requires environment setup outside normal CI.
- Record any native push or Maestro blocker honestly in the Phase 5 summary instead of claiming a pass.
