---
phase: 11
slug: mobile-visual-polish-and-emulator-validation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-28
---

# Phase 11 - Validation Strategy

> Per-phase validation contract for mobile polish, installed Android evidence, and release truth sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.9 for mobile unit/component/a11y checks; Maestro 2.6.1 for installed Android E2E smoke/UAT evidence |
| **Config file** | `vitest.config.ts`; `.maestro/v1-readiness.yaml`; `.maestro/smoke.yaml` |
| **Quick run command** | `pnpm.cmd --filter @validade-zero/mobile test -- capture` |
| **Full suite command** | `pnpm.cmd check` |
| **Installed Android command** | `pnpm.cmd test:e2e:mobile` with an Android emulator or approved connected device running |
| **Evidence security command** | `pnpm.cmd security:evidence` |
| **Estimated runtime** | ~60-180 seconds for focused mobile tests; Android E2E depends on emulator/device startup |

---

## Sampling Rate

- **After every mobile UI/status task commit:** Run `pnpm.cmd --filter @validade-zero/mobile test -- capture`.
- **After every documentation/evidence task commit:** Run `pnpm.cmd security:evidence`.
- **After every plan wave:** Run `pnpm.cmd check`; if Android target is available, also run `pnpm.cmd test:e2e:mobile`.
- **Before `$gsd-verify-work`:** Full repo gate must be green, Android E2E must pass on a running installed target or record exact blocked output, screenshots/UAT must be recorded, and release truth matrix must be updated.
- **Max feedback latency:** 180 seconds for focused automated checks, excluding emulator/device provisioning time.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 11-01-01 | TBD | 1 | P11-POLISH-01 | T11-01 | Critical-flow screens meet final corridor-ready criteria without changing central truth semantics. | component/a11y | `pnpm.cmd --filter @validade-zero/mobile test -- mobile-release-journeys mobile-capture.accessibility mobile-product-polish` | Partial / W0 | pending |
| 11-01-02 | TBD | 1 | P11-STATUS-02 | T11-01 | Shared status vocabulary differentiates conflict, pending central, local, critical, synced, and resolved without relying on color alone. | unit/component | `pnpm.cmd --filter @validade-zero/mobile test -- capture` | Partial / W0 | pending |
| 11-02-01 | TBD | 2 | P11-ANDROID-03 | T11-02 | Installed Android flow proves login/privacy and the operational critical path on a running emulator/device. | mobile e2e | `pnpm.cmd test:e2e:mobile` | Yes | pending |
| 11-02-02 | TBD | 2 | P11-SCREENSHOT-04 | T11-03 | Screenshot evidence uses fictional fixtures and excludes real store/customer data, private URLs, tokens, build URLs, raw photos, and device-sensitive information. | e2e + evidence scan | `pnpm.cmd security:evidence` | W0 | pending |
| 11-03-01 | TBD | 3 | P11-TRUTH-05 | T11-04 | Release/UAT truth matrix separates old PASS evidence, current repo readiness, current emulator readiness, and external provider/device blockers. | docs/security | `pnpm.cmd security:evidence` | W0 | pending |
| 11-03-02 | TBD | 3 | P11-PROVIDER-06 | T11-05 | Push/camera physical provider/device evidence is passed only with approved proof or recorded as an external blocker. | manual/device UAT | `pnpm.cmd security:evidence` | Partial / W0 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] Define the screenshot evidence strategy and committed path/allowlist, because `.gitignore` ignores `.maestro/artifacts/`, `evidence/`, and generic PNG files.
- [ ] Expand or complement `.maestro/v1-readiness.yaml` so it covers the Phase 11 critical flow beyond auth/privacy readiness.
- [ ] Review `.maestro/smoke.yaml` and update or retire historical assertions that no longer match Phase 10 central-truth flow.
- [ ] Add or extend focused component/a11y tests for shared status vocabulary and long Portuguese copy wrapping.
- [ ] Create the Phase 11 UAT/release truth record, since no `11-UAT.md` exists at planning time.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Approved Android emulator/device availability | P11-ANDROID-03 | Local research found no connected device; emulator availability is moment-in-time. | Run `adb devices`, start an approved AVD or connect approved hardware, install/open the app, then run `pnpm.cmd test:e2e:mobile`; if unavailable, paste exact blocker output into `11-UAT.md`. |
| Real camera/device proof | P11-PROVIDER-06 | Emulator/mock proof does not equal physical camera proof. | On approved Android hardware, validate permission copy, no-photo fallback, and evidence capture; otherwise record as an external blocker. |
| Real Android push provider proof | P11-PROVIDER-06 | Remote push requires native build/provider credentials outside the public repo. | Use approved native APK/device/provider evidence only; never commit provider secrets, tokens, build URLs, or private device details. |
| Visual screenshot review | P11-POLISH-01 / P11-SCREENSHOT-04 | Automation cannot judge final corridor readability or all evidence hygiene. | Review sanitized screenshots for one-hand readability, state clarity, long-copy wrapping, and absence of sensitive data before committing or referencing them. |

---

## Validation Sign-Off

- [ ] All tasks have automated verify commands or Wave 0 dependencies.
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify.
- [ ] Wave 0 covers all missing test/evidence references.
- [ ] No watch-mode flags.
- [ ] Feedback latency target is below 180 seconds for focused checks.
- [ ] `pnpm.cmd check` is green before phase verification.
- [ ] `pnpm.cmd test:e2e:mobile` passes on a running Android target, or exact Android target blocker output is recorded.
- [ ] `pnpm.cmd security:evidence` is green after UAT/evidence changes.
- [ ] `nyquist_compliant: true` is set in frontmatter once Wave 0 is complete and all mappings are covered.

**Approval:** pending
