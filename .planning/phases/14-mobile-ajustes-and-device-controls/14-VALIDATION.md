---
phase: 14
slug: mobile-ajustes-and-device-controls
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-29
---

# Phase 14 - Validation Strategy

> Per-phase validation contract for mobile Ajustes and device controls.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x with `react-test-renderer` for mobile component tests |
| **Config file** | `vitest.config.ts`, `apps/mobile/package.json` |
| **Quick run command** | `cmd /c pnpm.cmd --filter @validade-zero/mobile test` |
| **Full suite command** | `cmd /c pnpm.cmd check` |
| **Estimated runtime** | ~60-240 seconds for focused mobile checks; full gate depends on repo cache |

---

## Sampling Rate

- **After every task commit:** Run the plan-specific mobile test or typecheck command.
- **After every plan wave:** Run `cmd /c pnpm.cmd --filter @validade-zero/mobile test` and `cmd /c pnpm.cmd --filter @validade-zero/mobile typecheck`.
- **Before `$gsd-verify-work`:** Run `cmd /c pnpm.cmd check`.
- **Max feedback latency:** 5 minutes for focused checks, 15 minutes for full gate.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | SET-01 | T-14-01 | Ajustes opens without replacing session/store/role truth | component/unit | `cmd /c pnpm.cmd --filter @validade-zero/mobile test` | yes | passed |
| 14-01-02 | 01 | 1 | SET-01 | T-14-02 | Route stack returns to the exact previous operational route | component/unit | `cmd /c pnpm.cmd --filter @validade-zero/mobile test` | yes | passed |
| 14-02-01 | 02 | 2 | SET-02 | T-14-03 | Push activation/test remains diagnostic and this-device scoped | component/unit | `cmd /c pnpm.cmd --filter @validade-zero/mobile test` | yes | passed |
| 14-02-02 | 02 | 2 | SET-02 | T-14-04 | Disable path affects only this device and leaves tasks active in Hoje | component/unit | `cmd /c pnpm.cmd --filter @validade-zero/mobile test` | yes | passed |
| 14-03-01 | 03 | 3 | SET-03 | T-14-05 | Sync card separates central read from sync send state | component/unit | `cmd /c pnpm.cmd --filter @validade-zero/mobile test` | yes | passed |
| 14-03-02 | 03 | 3 | SET-03 | T-14-06 | Conflict discard requires explicit reason and blocks safe close when critical | component/unit | `cmd /c pnpm.cmd --filter @validade-zero/mobile test` | yes | passed |
| 14-04-01 | 04 | 4 | SET-04 | T-14-07 | Build/update card shows public-safe installed versus approved APK truth | component/unit | `cmd /c pnpm.cmd --filter @validade-zero/mobile test` | yes | passed |
| 14-04-02 | 04 | 4 | SET-05 | T-14-08 | Privacy and sign-out use existing auth model and warn on pending work | component/unit | `cmd /c pnpm.cmd --filter @validade-zero/mobile test` | yes | passed |
| 14-05-01 | 05 | 5 | SET-01..SET-05 | T-14-09 | Mobile release journey proves Ajustes boundaries and no sensitive text | journey/unit | `cmd /c pnpm.cmd --filter @validade-zero/mobile test` | yes | passed |
| 14-05-02 | 05 | 5 | SET-01..SET-05 | T-14-SC | Full repo gates pass without Android/provider/physical-proof overclaim | repo gate | `cmd /c pnpm.cmd check` | yes | passed |

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements:

- `apps/mobile/src/auth/auth-flow.test.tsx` already tests session, privacy, and logout paths.
- `apps/mobile/src/capture/push-alerts.test.tsx` already tests push activation, local-only fallback, and notification routing.
- `apps/mobile/src/capture/today-screen.test.tsx` already tests sync queue, manual sync, and conflict review.
- `apps/mobile/src/capture/offline-sync-ui.test.tsx` already tests conflict ordering and discard reason.
- `apps/mobile/src/build-info.test.ts` already tests installed/approved build truth and sensitive-label masking.
- `apps/mobile/src/capture/mobile-release-journeys.test.tsx` already tests authenticated mobile journeys and route/back behavior.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| One-handed mobile layout at 360px width | SET-01..SET-05 | Unit tests can verify content and actions, but visual density and touch ergonomics need a device/emulator pass | Run Expo/Android when a device is available, open Ajustes from Hoje and a task route, confirm no clipped text or overlapping actions |
| Real provider push delivery | SET-02 | Existing repo can test local/native channel behavior, but remote provider delivery needs external APK/provider proof | Use the approved APK/device when available and record provider result outside public-sensitive fields |

---

## Validation Sign-Off

- [x] All tasks have automated verify commands or existing Wave 0 dependencies.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers all missing references.
- [x] No watch-mode flags.
- [x] Feedback latency target under 5 minutes for focused checks.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** approved 2026-06-29

---

## Post-Planning Gate Results

| Gate | Result | Notes |
|------|--------|-------|
| Plan frontmatter + structure | passed | `14-01-PLAN.md` through `14-05-PLAN.md` all valid, 3 tasks each |
| Decision coverage | passed | 16/16 trackable `14-CONTEXT.md` decisions covered |
| State validation | passed | `.planning/STATE.md` valid with no drift warnings |
| Phase requirement coverage | passed for Phase 14 | `SET-01` through `SET-05` covered |
| Global milestone gap analysis | non-blocking | `WEB-*`, `OPS-*`, and `VAL-*` belong to other milestone phases |
| Whitespace check | passed | `git diff --check` returned no whitespace errors |

---

## Final Execution Gate Results

| Gate | Result | Notes |
|------|--------|-------|
| Mobile component/journey suite | passed | `cmd /c pnpm.cmd --filter @validade-zero/mobile test` passed: 36 files / 211 tests |
| Mobile typecheck | passed | `cmd /c pnpm.cmd --filter @validade-zero/mobile typecheck` passed |
| Evidence security scan | passed | `cmd /c pnpm.cmd security:evidence` passed: 400 tracked text files scanned |
| Full repo gate | passed | `cmd /c pnpm.cmd check` passed: typecheck, lint, format, root Vitest 86 files / 601 tests, smoke Vitest 57 files / 332 tests, build, security, and performance budgets |

## Proof Boundary

Phase 14 closes repo-local Ajustes behavior and release-readiness controls only. It does not claim real provider push delivery, real camera/evidence capture, installed approved APK proof on a physical device, or physical Loja 18 UAT. Those remain external validation evidence for later operational verification.
