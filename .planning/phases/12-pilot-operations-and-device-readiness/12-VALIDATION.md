---
phase: 12-pilot-operations-and-device-readiness
status: complete_with_external_blockers
nyquist_compliant: true
created_at: 2026-06-28
updated_at: 2026-06-28
---

# Phase 12 Validation Matrix

Phase 12 is compliant because every required gate has either a verified pass or an explicit external blocker with cause and next action. It is not a green pilot rollout. Repository behavior is ready; installed Android, provider push, camera/device, and physical Loja 18 UAT remain externally blocked until the approved device/provider run exists.

## Final Gate Matrix

| Gate | Requirement | Final status | Evidence | Next action |
| --- | --- | --- | --- | --- |
| P12-DEVICE-01 | Per-device readiness | Passed in repo; real target blocked externally | Contracts/API/web cover Apto, Atencao, Bloqueado, missing/stale read, wrong store/user, denied camera, and old/unknown build. | Connect approved Android target, install approved APK, prepare turn, and confirm compatibility. |
| P12-PUSH-02 | Safe push test | Passed in repo; provider proof blocked externally | API/domain/web/mobile tests prove same-store lead/admin authority, timeline states, token/privacy safety, local-only degradation, and no task resolution side effects. | Run safe push test on approved native APK/device/provider and record sanitized provider outcome. |
| P12-RELEASE-03 | Installed build truth | Passed in repo; installed proof blocked externally | Mobile exposes `0.12.0`, Android `versionCode` `120`, staging env, API target, and `phase-12-staging-apk-120`; web shows compatibility states. | Confirm installed device reports `atual` for `phase-12-staging-apk-120`. |
| P12-UAT-04 | Guided Loja 18 UAT | Passed in repo; physical UAT blocked externally | API/web/contracts project the 9-step checklist and reject fake/seed product-lot evidence as pass. | Execute real Loja 18 run on approved device with sanitized evidence. |
| P12-OPS-05 | Operational blockers | Passed in repo | `Bloqueios do piloto` covers no approved device, stale sync, invalid token, denied camera, wrong membership, product review, conflict, discard, unsafe shift close, push, build, UAT, and evidence blockers with cause/next action/ownership. | Use blocker panel as rollout go/no-go until all critical/external blockers are removed. |
| Android installed target | Native installed app proof | External blocker | `adb devices` returned only `List of devices attached` with no device rows. | Connect approved emulator/device and rerun `pnpm.cmd test:e2e:mobile`. |
| Maestro installed flow | Current installed app E2E | External blocker | `pnpm.cmd test:e2e:mobile` returned `You have 0 devices connected...` and `Not enough devices connected (0) to run the requested number of shards (1).` | Rerun after approved target is attached. |
| Remote provider push | Physical provider delivery | External blocker | No approved native APK/device/provider delivery proof is recorded in the public repo. | Run provider proof in controlled release record without committing tokens/links/tickets. |
| Camera/device proof | Physical evidence path | External blocker | No approved Android hardware camera or no-photo fallback proof is recorded in the public repo. | Validate camera/fallback on approved Android hardware. |
| Physical Loja 18 UAT | Real store loop | External blocker | No controlled physical-device record is available here for the full Loja 18 loop. | Execute Loja 18 UAT checklist with public-safe evidence. |
| Evidence hygiene | Public repo safety | Passed | `pnpm.cmd security:evidence` passed for 547 tracked text files; `pnpm.cmd security:secrets` passed; `pnpm.cmd security:data` passed for 529 files. | Keep artifacts sanitized after any release-record update. |
| Web E2E | Command Center browser regression | Passed | `pnpm.cmd test:e2e:web` passed 6 tests. Vite logged expected `/session/stores` proxy errors because the fixture runs without local API at `127.0.0.1:8787`. | Keep fixture evidence fictional/sanitized. |
| Full repo gates | Regression safety | Passed | `pnpm.cmd check` passed typecheck, lint, format, tests, smoke tests, build, security, UI release readiness, and performance budgets. | Rerun after any code or release-record change. |

## Focused Verification Already Passed

| Command | Result |
| --- | --- |
| `pnpm.cmd --filter @validade-zero/contracts test -- command-center alerts capture` | Passed: 11 files / 98 tests. |
| `pnpm.cmd vitest run --config vitest.config.ts --project api -- command-center alerts authorization` | Passed: 12 files / 82 tests. |
| `pnpm.cmd vitest run --config vitest.config.ts --project web -- command-center` | Passed: 9 files / 32 tests. |
| `pnpm.cmd --filter @validade-zero/mobile test -- build-info prepare-turn push-alerts` | Passed: 35 files / 183 tests. |
| `adb devices` | External blocker: no attached device rows. |
| `pnpm.cmd test:e2e:mobile` | External blocker: no connected device for Maestro shard. |
| `pnpm.cmd security:evidence` | Passed: 547 tracked text files. |
| `pnpm.cmd security:secrets` | Passed. |
| `pnpm.cmd security:data` | Passed: 529 files. |
| `pnpm.cmd test:e2e:web` | Passed: 6 tests. |
| `pnpm.cmd check` | Passed: typecheck, lint, format, test, smoke, build, security, and performance budgets. |

## Evidence Rules

- Public artifacts may contain sanitized statuses, fictional labels, masked build/commit identity, and safe command output.
- Public artifacts must not contain raw push tokens, private URLs, EAS build links, Firebase files, device serials, raw photos, real product names, real lot values, credentials, signed object URLs, or customer/store-sensitive details.
- A blocked provider/device gate is acceptable only when the blocker is explicit and does not masquerade as pass.

## Closeout Rule

`nyquist_compliant: true` means Phase 12 has an honest validation record, not that the pilot can roll out today. The release decision remains blocked until the external Android/provider/camera/physical-UAT gates move from blocker to pass.
