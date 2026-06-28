---
phase: 11-mobile-visual-polish-and-emulator-validation
artifact: UAT
status: complete
created: 2026-06-28
verified: 2026-06-28T01:37:48-03:00
verification_result: complete-with-external-blockers
---

# Phase 11 UAT - Mobile Visual Polish And Android Evidence

## Result

Component-level critical-flow coverage is passing with fictional fixtures. Installed Android validation is blocked because no emulator or approved Android device is connected in this run. No Android pass is claimed.

Current release decision: blocked for installed Android, provider push, camera/device, and physical-device UAT proof. Historical emulator/APK evidence remains historical only.

## Verification Acceptance

`$gsd-verify-work 11` completed on 2026-06-28T01:37:48-03:00 after the pilot owner acknowledged the external Android/provider/camera blockers and chose to proceed with verification. This marks the UAT record complete as a truthful evidence record; it does not mark installed Android, remote push provider, real camera/device, or physical-device pilot proof as passed.

## Evidence Matrix

| Gate | Status | Evidence |
|---|---|---|
| Login/privacy component journey | Passed | `pnpm.cmd --filter @validade-zero/mobile test mobile-release-journeys` passed; fixture uses `Colaborador FICTICIO` / `Loja Ficticia Piloto`. |
| Prepare-turn component journey | Passed | `mobile-release-journeys` asserts `Preparar turno` and `Pronto para operar com a leitura central.` |
| Hoje verdict component journey | Passed | `today-screen` coverage is included in the Phase 11 focused suite; current copy keeps central/local/sync state below verdict. |
| Product path component journey | Passed | `mobile-release-journeys` covers central product reuse with `Banana Prata FICTICIA`; product draft warning is covered by product polish tests. |
| Lot registration component journey | Passed | `mobile-release-journeys` registers `BAN-LOTE-001` with confirmed central product and lot fields. |
| Terminal pending/local component journey | Passed | `mobile-release-journeys` asserts `Acao salva neste aparelho. Ainda falta sincronizar para confirmacao central.` and `Pendente central. Ainda nao use como confirmacao da loja.` |
| Conflict/sync component journey | Passed | `mobile-release-journeys` asserts `Conflito de sincronizacao` appears before `Pendente central` and exposes `Revisar conflito`. |
| Shift close component journey | Passed | `mobile-release-journeys` asserts `Encerrar turno com area segura`, `Encerrar turno com pendencias`, and unsafe-copy continuity. |
| Installed Android target | Blocked | `adb devices` output shows no connected target. |
| Installed Maestro flow | Blocked | `pnpm.cmd test:e2e:mobile` failed with `Not enough devices connected (0) to run the requested number of shards (1).` |
| Screenshot checkpoint names | Names recorded; screenshots blocked | `.maestro/v1-readiness.yaml` records `phase11-*` checkpoint names. Only `phase11-login-privacy` is reachable by current unauth fixture; all authenticated checkpoints are marked `fixture unavailable`. No raw screenshots committed. |
| Provider push proof | Blocked externally | Real Android push provider proof requires approved APK/device/provider evidence. Component tests and Expo mocks are not proof. |
| Camera/device proof | Blocked externally | Permission/no-photo copy is covered by tests; real camera proof requires approved Android hardware. |

## External Provider And Device Gates

| Gate | Status | Pass condition |
|---|---|---|
| Remote push provider | Blocked externally | Approved native APK for `@liiiraak1ng/validade-zero`, expected Android package, approved Firebase/FCM credentials through non-committed setup, and a delivered reminder recorded in the controlled release record. |
| Camera/device proof | Blocked externally | Approved Android hardware run covering permission UX, no-photo fallback, and evidence-sensitive work. |
| Physical-device UAT | Blocked externally | Controlled install/login/prepare-turn/product-lot/terminal-sync/shift-close walkthrough on approved Android hardware. |

Expo Go, local mocks, local ignored Firebase files, unapproved APK identity, raw screenshots, provider tokens, build URLs, or component tests do not satisfy these gates.

## Final Repository Gates

| Command | Result | Notes |
|---|---|---|
| `pnpm.cmd --filter @validade-zero/mobile test capture mobile-release-journeys` | Passed | 31 mobile test files / 162 tests passed with fictional fixtures. |
| `pnpm.cmd security:evidence` | Passed | Sensitive evidence scan passed for 529 tracked text files after UAT/release docs updates. |
| `pnpm.cmd check` | Passed | Typecheck, lint, format, 84 test files / 545 tests, 55 smoke files / 287 tests, build, security, and performance budgets passed. |
| `adb devices` | Blocked | No connected Android target was listed. |
| `pnpm.cmd test:e2e:mobile` | Blocked | Maestro could not run because 0 devices were connected. |

## Exact Command Evidence

### `adb devices`

```text
List of devices attached
```

Interpretation: zero devices listed.

### `pnpm.cmd test:e2e:mobile`

```text
$ maestro test .maestro/v1-readiness.yaml
Not enough devices connected (0) to run the requested number of shards (1).

You have 0 devices connected, which is not enough to run 1 shards. Missing 1 device(s).

ELIFECYCLE Command failed with exit code 1.
```

Interpretation: installed Android validation is blocked, not failed product behavior.

## Screenshot Checkpoints

| Checkpoint | Status | Notes |
|---|---|---|
| `phase11-login-privacy` | Scripted when app reaches unauth privacy state | Screenshot name is sanitized; raw artifact remains local. |
| `phase11-preparar-turno` | Blocked - fixture unavailable | Needs pilot-safe authenticated installed fixture. |
| `phase11-hoje-verdict` | Blocked - fixture unavailable | Must not assert direct safe Hoje without prepare-turn. |
| `phase11-product-path` | Blocked - fixture unavailable | Component journey covers fictional product path only. |
| `phase11-lot-registration` | Blocked - fixture unavailable | Component journey covers fictional lot path only. |
| `phase11-terminal-pending` | Blocked - fixture unavailable | Component journey covers local/pending central semantics only. |
| `phase11-conflict-sync` | Blocked - fixture unavailable | Component journey covers conflict priority only. |
| `phase11-shift-close` | Blocked - fixture unavailable | Component journey covers safe/unsafe CTAs only. |

## Next Action

Start an approved Android emulator or connect approved Android hardware with the current app installed, then rerun:

```powershell
adb devices
pnpm.cmd test:e2e:mobile
pnpm.cmd security:evidence
```

Only update installed Android status to Passed after Maestro runs against a connected installed target.
