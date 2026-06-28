---
phase: 11
slug: mobile-visual-polish-and-emulator-validation
status: verified
threats_open: 0
asvs_level: 1
register_authored_at_plan_time: true
created: 2026-06-28
---

# Phase 11 - Security

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Visual status to operational truth | Mobile colors, copy, and priority can imply safe/resolved states. | Central/local/sync state and safety verdicts |
| Prepare-turn gate to Hoje | Local cache or empty central reads can be mistaken for current central readiness. | Store readiness, central facts, blocker counts |
| Terminal actions to central resolution | Local terminal actions can be saved before the central system accepts them. | Task commands, evidence metadata, resolution status |
| Conflict discard to auditability | Destructive offline conflict handling can erase accountability. | Local action, actor, conflict reason, resolution decision |
| Shift close to area-safe claim | A safe-looking close CTA can overstate stale/local or blocked data. | Checklist, blockers, outbox, central validation result |
| Test evidence to release claim | Component, historical, or unavailable-device evidence can be overstated. | UAT status, Maestro output, release readiness status |
| Screenshot and provider evidence to public repo | Validation artifacts can leak private device/provider data. | Screenshots, device paths, build URLs, Firebase/EAS details, tokens |

## Summary Threat Flags Reviewed

No phase summary contains a dedicated `## Threat Flags` section. The Phase 11 summaries do record security-relevant release blockers and evidence hygiene:

- `11-03-SUMMARY.md` records `pnpm.cmd security:evidence` passing and keeps raw screenshot evidence blocked by missing Android target.
- `11-04-SUMMARY.md` records current installed Android, provider push, real camera/device, and physical-device UAT as externally blocked, while repository/mobile polish and evidence hygiene are green.
- These flags are covered by T-11-08, T-11-10, T-11-11, and T-11-12 below.

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-11-01 | Spoofing | Mobile status descriptors | mitigate | `apps/mobile/src/capture/mobile-status.ts` defines typed proof flags; tests assert `synced_transport`, `local_only`, `pending_central`, degraded, conflict, and critical states are not proven safe. | closed |
| T-11-02 | Spoofing | Prepare-turn gate | mitigate | `CaptureApp.tsx`, `TodayScreen.tsx`, and prepare-turn tests preserve local-cache/empty-central states as warning or critical, never as central readiness. | closed |
| T-11-03 | Denial of Service | Hoje first viewport | mitigate | `sortMobileStatusDescriptors` and `today-screen` coverage place blockers, conflicts, pending central, and first critical work before routine/history states. | closed |
| T-11-04 | Repudiation | Terminal resolution UI | mitigate | `TaskResolutionPanel.tsx`, `today-copy.ts`, and `task-resolution.test.tsx` separate local save, transport sync, pending central, and `resolved_central` copy before any terminal resolution can be treated as confirmed. | closed |
| T-11-05 | Repudiation | Offline conflict discard | mitigate | `offline-sync-ui.tsx` requires a non-empty discard reason and sends it through the destructive path; `offline-sync-ui.test.tsx` covers the disabled state and submitted reason. | closed |
| T-11-06 | Tampering | Shift close safe CTA | mitigate | `packages/domain/src/shift-close.ts`, `ShiftCloseScreen.tsx`, and `shift-close.test.tsx` require current central readiness, no blockers/outbox, complete checklist, and central validator success before safe close. | closed |
| T-11-07 | Repudiation | Component tests versus installed Android proof | mitigate | `11-UAT.md`, `11-VALIDATION.md`, `.maestro/v1-readiness.yaml`, and `docs/release/v1-readiness.md` mark the installed Android flow blocked when no target exists and do not convert component pass into native proof. | closed |
| T-11-08 | Information Disclosure | Screenshot and UAT evidence | mitigate | `.maestro/v1-readiness.yaml`, `.maestro/smoke.yaml`, `docs/testing/strategy.md`, `11-UAT.md`, and `scripts/check-no-sensitive-evidence.mjs` keep raw screenshots local unless reviewed/allowlisted and scanned. | closed |
| T-11-09 | Tampering | Maestro readiness scripts | mitigate | `.maestro/smoke.yaml` no longer asserts direct safe Hoje without `Preparar turno`; `.maestro/v1-readiness.yaml` records Phase 11 checkpoint names and fixture-unavailable blockers. | closed |
| T-11-10 | Repudiation | Historical evidence versus current release claim | mitigate | `docs/release/v1-readiness.md`, `11-UAT.md`, and `docs/testing/strategy.md` separate historical APK/emulator context from current Phase 11 Android, provider, camera, and physical-device gates. | closed |
| T-11-11 | Information Disclosure | Firebase/EAS/provider setup docs | mitigate | `docs/operations/push-alerts.md`, `docs/release/android-pilot-install.md`, `.gitignore`, and `apps/mobile/app.config.js` require non-committed Firebase/EAS setup and do not commit provider secrets, build URLs, tokens, or credential values. | closed |
| T-11-12 | Repudiation | Final validation and user decision | mitigate | `11-VALIDATION.md`, `11-UAT.md`, `docs/release/v1-readiness.md`, and `11-04-SUMMARY.md` preserve exact blocked external gates and require explicit proof before changing them to passed. | closed |

## Accepted Risks Log

No accepted risks.

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-28 | 12 | 12 | 0 | Codex inline security audit |

## Verification Evidence

- Plan-time threat model blocks were found in `11-01-PLAN.md`, `11-02-PLAN.md`, `11-03-PLAN.md`, and `11-04-PLAN.md`.
- `11-03-SUMMARY.md` records `pnpm.cmd security:evidence` passing across 526 tracked text files and the Android E2E gate blocked with no connected device.
- `11-04-SUMMARY.md` records `pnpm.cmd security:evidence` passing across 529 tracked text files, `pnpm.cmd check` passing, and current installed Android/provider/camera/physical-device gates blocked externally.
- Current secure-phase run: `pnpm.cmd security:evidence` passed across 530 tracked text files on 2026-06-28.
- Current secure-phase run: `pnpm.cmd --filter @validade-zero/mobile test mobile-status task-resolution offline-sync-ui shift-close mobile-release-journeys` passed 5 files / 29 tests on 2026-06-28.
- `apps/mobile/google-services.json` is ignored by `.gitignore`; public docs require Firebase/EAS credentials to stay outside the repo and real provider proof to be recorded without credential values.

## Sign-Off

- [x] All threats have a disposition.
- [x] No accepted risks require follow-up.
- [x] `threats_open: 0` confirmed.
- [x] `status: verified` set in frontmatter.

**Approval:** verified 2026-06-28
