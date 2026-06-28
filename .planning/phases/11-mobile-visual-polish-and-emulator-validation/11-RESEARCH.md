# Phase 11: Mobile Visual Polish and Emulator Validation - Research

**Researched:** 2026-06-28  
**Domain:** Expo/React Native mobile visual polish, Android emulator validation, Maestro evidence, release truth documentation  
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

Source: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md` [VERIFIED: codebase]

### Locked Decisions

## Implementation Decisions

### Telas que precisam parecer finais
- **D-01:** The mandatory polish scope is the full critical mobile flow: `Preparar turno`, `Hoje`, product search/confirmation, lot registration, lot detail/terminal resolution, sync/conflict surfaces, and shift close.
- **D-02:** A screen is final enough only when it is corridor-ready: legible on Android, has one clear primary action per decision block, keeps critical states unambiguous, uses consistent spacing, and does not look like a prototype.
- **D-03:** The polish may reorganize hierarchy, grouping, rows/cards, and visual rhythm inside the existing flow. It must not add new capabilities or change operational truth semantics.
- **D-04:** Sensitive states cannot remain half-polished: prepare-turn blockers, critical risk, pending central state, conflict, terminal resolution, and unsafe shift close must be visually strong and clear.

### Linguagem visual de risco e confianca
- **D-05:** Critical states must be differentiated by severity hierarchy plus explicit text, not by painting every surface red. Conflict/blocker states belong at the top, pending central state belongs close to the verdict/action, and critical risk gets controlled high-emphasis treatment with text explaining what is missing.
- **D-06:** Green/accent is reserved for primary actions, focus/selection, and truly proven confidence. `Sincronizado` must not look like `Resolvido`, and "looks okay" must not receive safe-state styling.
- **D-07:** `Local` and `Pendente central` should be persistent but non-destructive warnings: warning surface, clear text/icon treatment, and placement near the relevant action or verdict. They may allow local operation where valid, but never imply central confirmation.
- **D-08:** Phase 11 should create or consolidate a shared mobile status system for `StatusNotice`, task/status rows, textual badges, sync states, and warning/critical/resolved treatments so the same state vocabulary appears consistently across the critical flow.

### Criterio de validacao Android
- **D-09:** Android validation for this phase requires an installed/running Android emulator or approved connected device, `pnpm test:e2e:mobile` passing, sanitized screenshots of the critical flow, and a smoke/UAT record.
- **D-10:** Emulator evidence must cover the operational critical flow, not only auth readiness: login/privacy, `Preparar turno`, `Hoje`, product reuse or creation path, lot registration, terminal/pending-central behavior, conflict/sync when fixtures allow it, and shift close.
- **D-11:** Screenshots and visual evidence committed to the public repo must be small/sanitized, use fictional fixtures only, and exclude real store/customer data, private URLs, tokens, build URLs, raw evidence photos, or device-sensitive information.
- **D-12:** If no emulator/device is available, the Android gate does not pass. The phase records the exact blocker and command output instead of declaring Android validated from component tests alone.

### Limite entre passou e bloqueado externo
- **D-13:** Real Android push provider proof may remain an external blocker. Phase 11 should improve push UX/error states and record provider status, but remote push only passes with evidence from a controlled native APK generated for the approved Expo/EAS project (`@liiiraak1ng/validade-zero`) with correct Android package and Firebase/FCM credentials embedded. Expo Go, a local build without `google-services.json`, or an APK generated outside the approved project/credentials does not prove real pilot push.
- **D-14:** Real camera/device evidence may remain an external documented gate. The phase should validate permission UX, no-photo fallback, and evidence states, but only declares real camera/device passed after an approved Android device run.
- **D-15:** Phase 11 must update the release/UAT truth matrix so older Android/Maestro `PASS` evidence, current repo readiness, current emulator readiness, and provider/device blockers are separated. Old docs must not leave an ambiguous `PASS` that conflicts with the newer Phase 10 blocked record.
- **D-16:** The acceptable final status for Phase 11 is: mobile polish passed, repository gates passed, Maestro/emulator evidence passed, screenshots/UAT recorded, and real push/camera/physical-device gates either passed with proof or explicitly blocked externally. Provider/device blockers do not become success without proof.

### the agent's Discretion
The planner may choose exact component names, visual tokens, screenshot storage paths, Maestro fixture strategy, and UAT document structure. It may also decide how many implementation plans are needed. It may not weaken `Preparar turno`, the central truth model, sync-state semantics, sales-area safety criteria, evidence hygiene, or the distinction between emulator validation and external provider/device proof.

### Deferred Ideas (OUT OF SCOPE)

## Deferred Ideas

None - discussion stayed within phase scope. Real push delivery, real camera/device proof, and physical-device UAT may remain external gates when the approved environment is unavailable, but they must be explicitly recorded as blocked rather than treated as hidden success.
</user_constraints>

## Summary

Phase 11 should be planned as a focused mobile product-quality pass, not as a new capability phase: the existing Expo/React Native app already owns the mobile critical flow, and Phase 10 locked the central truth semantics that this phase must preserve. The strongest planning boundary is that visual polish may improve hierarchy, grouping, rhythm, copy clarity, and state treatment, but it must not change when the app considers the sales area safe or a task resolved. [VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`; VERIFIED: `.planning/phases/10-real-pilot-flow-rebuild/10-CONTEXT.md`]

The current mobile stack is already the standard stack for this phase: Expo SDK 56, React Native 0.86, local capture theme/primitives, Vitest component coverage, Maestro installed-build E2E, Android Emulator/ADB, and EAS internal distribution for APKs. No new UI kit or recurring infrastructure is needed; the plan should consolidate the existing local status system and test/evidence workflows instead. [VERIFIED: `apps/mobile/package.json`; VERIFIED: `apps/mobile/src/capture/capture-theme.ts`; VERIFIED: `apps/mobile/src/capture/capture-ui.tsx`; CITED: https://docs.expo.dev/build/internal-distribution/]

The main risk is false readiness. Phase 10's latest UAT says Android installed-build validation is blocked by zero connected devices, while older quick/release docs record earlier emulator or APK passes. Phase 11 must reconcile those records into a truth matrix, run `pnpm.cmd test:e2e:mobile` against a running installed Android target, capture sanitized critical-flow screenshots, and record real push/camera/provider proof as passed only when the approved native APK/device/provider evidence exists. [VERIFIED: `.planning/phases/10-real-pilot-flow-rebuild/10-UAT.md`; VERIFIED: `docs/release/v1-readiness.md`; VERIFIED: `.planning/quick/260623-h7v-polir-ui-ux-mobile-do-login-e-da-tela-ho/260623-h7v-SUMMARY.md`]

**Primary recommendation:** Plan one visual-system consolidation slice, one critical-flow screen polish slice, one Maestro/emulator evidence slice, and one release-truth/security documentation slice, with explicit blocked-output handling when Android/provider/device proof is unavailable. [VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`]

## Project Constraints (from AGENTS.md)

| Directive | Planning Impact |
|-----------|-----------------|
| Pilot must operate without recurring costs. [VERIFIED: `AGENTS.md`] | Use existing local tooling, emulator, Maestro, Expo/EAS free/internal paths already in repo; do not add paid visual QA or hosted device services. |
| v1 cannot depend on sales, stock, or internal network APIs. [VERIFIED: `AGENTS.md`] | Do not polish UI around unsupported analytics or inventory truth; retain observed presence, tasks, movement, markdown, withdrawal, and evidence language. |
| Experience is mobile-first with desktop support and poor-connectivity resilience. [VERIFIED: `AGENTS.md`] | Prioritize Android one-hand readability, offline/local/pending/conflict surfaces, and emulator validation over desktop refinements. |
| Architecture is pnpm/Turborepo modular monolith. [VERIFIED: `AGENTS.md`] | Keep work inside existing monorepo packages and mobile app modules; avoid service splits. |
| Strong end-to-end typing and runtime validation are required; unjustified `any` is prohibited. [VERIFIED: `AGENTS.md`] | Status-system changes should be typed unions/constants and covered by component tests. |
| Quality requires SDD/TDD for critical rules and E2E coverage of essential flows. [VERIFIED: `AGENTS.md`] | Visual changes need component/a11y tests plus Maestro installed-build smoke/UAT evidence. |
| Public repo must not contain secrets, real data, private evidence, build URLs, tokens, or raw photos. [VERIFIED: `AGENTS.md`; VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`] | Evidence storage must be sanitized and pass `pnpm.cmd security:evidence`; real provider/build details belong outside committed artifacts. |
| Security requires least privilege, auditability, store isolation, threat modeling, and OWASP ASVS/MASVS reference. [VERIFIED: `AGENTS.md`] | Emulator/auth fixtures must not bypass server-owned authority or leak credentials. |
| No isolated push can guarantee execution. [VERIFIED: `AGENTS.md`; VERIFIED: `docs/operations/push-alerts.md`] | Push UI remains reminder-only; tasks, escalation, and confirmation stay visible in app. |
| GSD workflow governs repo edits. [VERIFIED: `AGENTS.md`] | Planner should keep implementation under Phase 11 plan execution, not ad hoc edits. |

## Project Skill Findings

The project-level `impeccable` skill applies to this phase because it covers frontend polish, critique, accessibility, UX copy, responsive behavior, and state hardening. Its product guidance says Validade Zero is a corridor operations tool for time-pressed store workers, so Phase 11 should optimize for fast decision clarity, visible uncertainty, one-hand use, and trustworthy operational records rather than marketing-style polish. [VERIFIED: `.agents/skills/impeccable/SKILL.md`; VERIFIED: `.agents/skills/impeccable/reference/product.md`; VERIFIED: `.agents/skills/impeccable/reference/polish.md`]

The skill's polish guidance also says design system discovery comes first, every interactive component must have states, and automation alone is not proof. This supports planning around the existing capture theme/components, explicit state inventory, real Android screenshots, and manual/UAT review records. [VERIFIED: `.agents/skills/impeccable/reference/polish.md`]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Critical mobile visual polish | Browser / Client (React Native mobile app) | Shared contracts/domain packages | Screens, rows, notices, touch targets, and copy live in `apps/mobile/src/capture/*`; domain truth must remain imported rather than redefined visually. [VERIFIED: `apps/mobile/src/capture`; VERIFIED: `.planning/phases/10-real-pilot-flow-rebuild/10-CONTEXT.md`] |
| Shared mobile status vocabulary | Browser / Client | API / Backend for source-of-truth states | `StatusNotice`, task rows, sync badges, and warnings are presentation concerns, while central task resolution and sync conflict facts are backend/domain facts. [VERIFIED: `apps/mobile/src/capture/capture-ui.tsx`; VERIFIED: `apps/mobile/src/capture/TodayScreen.tsx`] |
| `Preparar turno` gate and local fallback display | Browser / Client | API / Backend | `CaptureApp.tsx` blocks normal `Hoje` until prepare-turn state is ready, but the central package comes from authenticated backend clients. [VERIFIED: `apps/mobile/src/capture/CaptureApp.tsx`; VERIFIED: `apps/mobile/App.tsx`] |
| Installed Android validation | Local Android runtime / test harness | Mobile app and release docs | Maestro requires an active emulator/device and validates an installed/running app; Phase 10 currently records zero connected devices as the blocker. [CITED: https://docs.maestro.dev/maestro-cli/run-your-first-test-with-the-maestro-cli; VERIFIED: `.planning/phases/10-real-pilot-flow-rebuild/10-UAT.md`] |
| Sanitized screenshot evidence | Test harness / docs | Security scanner | Maestro can take screenshots, but committed evidence must satisfy project evidence hygiene and the existing scanner. [CITED: https://docs.maestro.dev/reference/commands-available/takescreenshot; VERIFIED: `scripts/check-no-sensitive-evidence.mjs`] |
| Real push provider proof | Native Android build/provider | Mobile UX | Expo remote Android push proof requires a native/development build and Firebase credentials; local UX can only show degraded or pending provider state without that proof. [CITED: https://docs.expo.dev/versions/latest/sdk/notifications/; CITED: https://docs.expo.dev/push-notifications/fcm-credentials/; VERIFIED: `docs/operations/push-alerts.md`] |
| Real camera/device proof | Native Android device | Mobile UX/tests | Permission copy and fallback can be tested locally, but real camera/device evidence requires an approved Android device run per Phase 11 decisions. [VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`; CITED: https://docs.expo.dev/get-started/set-up-your-environment/] |
| Release truth matrix | Documentation / planning artifacts | CI/security commands | Older PASS records and newer blockers live in docs and phase artifacts, so planning must update those records without changing app semantics. [VERIFIED: `docs/release/v1-readiness.md`; VERIFIED: `.planning/phases/10-real-pilot-flow-rebuild/10-UAT.md`] |

## Standard Stack

### Core

| Library / Tool | Version | Purpose | Why Standard |
|----------------|---------|---------|--------------|
| Expo SDK / `expo` | 56.0.12 | Mobile runtime, Expo CLI integration, native app configuration. | Already installed in `@validade-zero/mobile`, current on npm, and official Expo docs cover Android device/emulator and EAS internal distribution paths. [VERIFIED: `apps/mobile/package.json`; VERIFIED: npm registry; CITED: https://docs.expo.dev/get-started/set-up-your-environment/; CITED: https://docs.expo.dev/build/internal-distribution/] |
| React Native | 0.86.0 | Android UI implementation. | Already installed, current on npm, and RN official docs define accessibility APIs used by the app. [VERIFIED: `apps/mobile/package.json`; VERIFIED: npm registry; CITED: https://reactnative.dev/docs/accessibility] |
| React | 19.2.7 | Component model and test renderer basis. | Already installed and matched to the mobile app dependency set. [VERIFIED: `apps/mobile/package.json`; VERIFIED: npm registry] |
| Local capture theme/primitives | Local source | `ScreenHeader`, `PrimaryAction`, `SecondaryAction`, `Field`, `SelectionRow`, `StatusNotice`, palette, spacing, radii. | Phase 10 UI contract and the current codebase already use local primitives; no third-party UI kit is needed. [VERIFIED: `.planning/phases/10-real-pilot-flow-rebuild/10-UI-SPEC.md`; VERIFIED: `apps/mobile/src/capture/capture-theme.ts`; VERIFIED: `apps/mobile/src/capture/capture-ui.tsx`] |
| Maestro CLI | 2.6.1 | Installed mobile smoke/UAT automation and screenshot capture. | Installed locally; official Maestro docs require an active emulator/device and support `takeScreenshot`. [VERIFIED: local command `maestro --version`; CITED: https://docs.maestro.dev/maestro-cli/run-your-first-test-with-the-maestro-cli; CITED: https://docs.maestro.dev/reference/commands-available/takescreenshot] |
| Android Emulator + ADB | Emulator 36.6.11.0, ADB 37.0.0 | Run/install Android APK/dev build and expose device target for Maestro. | Installed locally with AVDs `ValidadeZeroApi36` and `ValidadeZeroApi36Arm`; no connected device was present during research. [VERIFIED: local commands `emulator -version`, `emulator -list-avds`, `adb version`, `adb devices`] |
| `vitest` [WARNING: slopcheck flagged as suspicious; existing locked dependency only.] | 4.1.9 | Mobile component/unit tests. | Existing repo test framework and current on npm; do not add or upgrade without a planner checkpoint because slopcheck returned `[SUS]`. [VERIFIED: root/package mobile tests; VERIFIED: npm registry; VERIFIED: slopcheck text verdict] |

### Supporting

| Library / Tool | Version | Purpose | When to Use |
|----------------|---------|---------|-------------|
| `expo-notifications` | 56.0.18 | Push permission/channel UX and provider-state handling. | Use to polish notification states, but do not claim remote Android push proof without native build plus Firebase credentials. [VERIFIED: `apps/mobile/package.json`; VERIFIED: npm registry; CITED: https://docs.expo.dev/versions/latest/sdk/notifications/; CITED: https://docs.expo.dev/push-notifications/fcm-credentials/] |
| `expo-camera` | 56.0.8 | Camera permission UX and no-photo fallback context. | Use existing camera/fallback tests and Android device gate; emulator/mock proof is not real camera proof. [VERIFIED: `apps/mobile/package.json`; VERIFIED: npm registry; VERIFIED: `apps/mobile/src/capture/camera-fallback.test.ts`] |
| `expo-sqlite` | 56.0.5 | Offline task/lot storage and prepare-turn cache. | Keep local/pending/central state visible through UI polish. [VERIFIED: `apps/mobile/package.json`; VERIFIED: `apps/mobile/App.tsx`] |
| `@react-native-community/netinfo` | 12.0.1 | Connectivity state for sync affordances. | Use for offline/sync UI state, not as proof of central acknowledgement. [VERIFIED: `apps/mobile/package.json`; VERIFIED: `apps/mobile/src/capture/TodayScreen.tsx`] |
| `@react-native-community/datetimepicker` | 9.1.0 | Native date selection in lot flows. | Keep installed; no new picker package should be introduced. [VERIFIED: `apps/mobile/package.json`; VERIFIED: `apps/mobile/app.json`] |
| `@playwright/test` | Locked 1.61.0 in repo, latest npm 1.61.1 | Web E2E/supporting root quality gate. | Keep as supporting gate only; Phase 11's decisive installed mobile proof is Maestro. [VERIFIED: `package.json`; VERIFIED: npm registry] |
| EAS internal distribution | Configured via `apps/mobile/eas.json` | Internal APK generation for pilot/staging. | Use only if the plan needs a new controlled APK; existing `pilot` and `staging` profiles both set internal APK distribution. [VERIFIED: `apps/mobile/eas.json`; CITED: https://docs.expo.dev/build/eas-json/; CITED: https://docs.expo.dev/build/internal-distribution/] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Local capture primitives | A third-party React Native UI kit | Reject for Phase 11: Phase 10 approved local primitives and the phase needs semantic state consistency, not a new component system. [VERIFIED: `.planning/phases/10-real-pilot-flow-rebuild/10-UI-SPEC.md`; VERIFIED: `apps/mobile/src/capture/capture-ui.tsx`] |
| Maestro screenshots | Android Studio / ADB emulator screenshots | Use as fallback only when Maestro cannot capture a needed image; Android docs support emulator screenshots, but Maestro keeps screenshots tied to executable flows. [CITED: https://docs.maestro.dev/reference/commands-available/takescreenshot; CITED: https://developer.android.com/studio/run/emulator-take-screenshots] |
| Native/development APK for push proof | Expo Go | Reject for remote Android push proof: Expo docs state remote push is unavailable in Expo Go on Android from SDK 53 onward. [CITED: https://docs.expo.dev/versions/latest/sdk/notifications/] |
| Committed raw screenshots/photos anywhere | Ignored local evidence folder only | Use committed sanitized screenshots only if the plan explicitly creates an allowed safe path; current `.gitignore` ignores generic PNG/evidence paths. [VERIFIED: `.gitignore`; VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`] |

**Installation:** No new package installation is recommended for Phase 11. Use the existing workspace dependencies and prefer `pnpm.cmd` on Windows because plain `pnpm` is blocked by PowerShell execution policy in this environment. [VERIFIED: local command results]

**Version verification:** Versions above were checked with `pnpm.cmd --filter @validade-zero/mobile list --depth 0 --json`, `npm.cmd view <pkg> version`, npm package metadata, and local CLI version commands on 2026-06-28. [VERIFIED: npm registry; VERIFIED: local command results]

## Package Legitimacy Audit

Phase 11 should not install external packages. The audit below covers existing package names that the plan is likely to touch or rely on so the planner does not introduce accidental new dependencies. [VERIFIED: `apps/mobile/package.json`; VERIFIED: `package.json`]

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `expo` | npm | Created 2013-05-27; 56.0.12 published 2026-06-15 | 6,578,928/week | github.com/expo/expo | OK | Existing approved dependency. [VERIFIED: npm registry; VERIFIED: slopcheck] |
| `react-native` | npm | Created 2015-01-27; 0.86.0 published 2026-06-09 | 10,391,864/week | github.com/facebook/react-native | OK | Existing approved dependency. [VERIFIED: npm registry; VERIFIED: slopcheck] |
| `expo-notifications` | npm | Version 56.0.18 current in registry | 3,110,287/week | github.com/expo/expo | OK | Existing approved dependency. [VERIFIED: npm registry; VERIFIED: slopcheck] |
| `expo-camera` | npm | Version 56.0.8 current in registry | 1,679,203/week | github.com/expo/expo | OK | Existing approved dependency. [VERIFIED: npm registry; VERIFIED: slopcheck] |
| `expo-sqlite` | npm | Version 56.0.5 current in registry | 540,455/week | github.com/expo/expo | OK | Existing approved dependency. [VERIFIED: npm registry; VERIFIED: slopcheck] |
| `@react-native-community/netinfo` | npm | 12.0.1 published 2026-02-14 | 2,826,994/week | github.com/react-native-netinfo/react-native-netinfo | OK | Existing approved dependency. [VERIFIED: npm registry; VERIFIED: slopcheck] |
| `@react-native-community/datetimepicker` | npm | 9.1.0 published 2026-03-17 | 1,971,561/week | github.com/react-native-datetimepicker/datetimepicker | OK | Existing approved dependency. [VERIFIED: npm registry; VERIFIED: slopcheck] |
| `vitest` | npm | 4.1.9 published 2026-06-15 | 69,955,402/week | github.com/vitest-dev/vitest | SUS | Existing locked dependency only; planner must add a human checkpoint before any new install or upgrade. [VERIFIED: npm registry; VERIFIED: slopcheck] |
| `@playwright/test` | npm | 1.61.0 published 2026-06-15; latest 1.61.1 published 2026-06-23 | 41,426,692/week | github.com/microsoft/playwright | OK | Existing supporting dependency; do not upgrade as part of this phase unless separately planned. [VERIFIED: npm registry; VERIFIED: slopcheck] |

**Packages removed due to slopcheck [SLOP] verdict:** none. [VERIFIED: slopcheck text verdict]  
**Packages flagged as suspicious [SUS]:** `vitest` only; it is already present in the repo and should not be newly installed or upgraded without human verification. [VERIFIED: slopcheck text verdict; VERIFIED: `package.json`]

Note: `python -m slopcheck ... --json` was unavailable because the installed slopcheck CLI did not support `--json`; the text verdict path was used. Its post-scan `npm install` attempt failed before modifying package files because Python could not find `npm` on Windows, and git status showed no package file changes from the audit. [VERIFIED: local command results; VERIFIED: `git status --short`]

## Architecture Patterns

### System Architecture Diagram

```text
Authenticated mobile app
        |
        v
Preparar turno gate
  | central package ready
  v
Hoje operational cockpit <-----------------------+
  | verdict + central/local/sync status          |
  | critical tasks / future attention            |
  | push/channel status                          |
  v                                             |
Product search/reuse/create -> Lot registration |
        |                         |              |
        v                         v              |
Lot detail / task action -> terminal resolution |
        |                         |              |
        v                         v              |
Offline outbox / central sync / conflict handling|
        |                         |              |
        +---- resolved history only after central business result
        |
        v
Shift close revalidation + physical checklist
        |
        v
Maestro installed Android flow -> screenshots -> sanitized UAT/release truth matrix
```

This flow reflects Phase 10's central truth contract and Phase 11's required evidence scope. [VERIFIED: `.planning/phases/10-real-pilot-flow-rebuild/10-CONTEXT.md`; VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`]

### Recommended Project Structure

```text
apps/mobile/src/capture/
├── capture-theme.ts        # Existing palette, spacing, radii; reconcile with Phase 10 UI contract.
├── capture-ui.tsx          # Existing mobile primitives; consolidate status/touch states here.
├── CaptureApp.tsx          # Existing prepare-turn gate and flow composition.
├── TodayScreen.tsx         # Existing sales-area verdict, task cockpit, sync/push state surface.
└── *.test.ts(x)            # Existing component/a11y/release journey tests; add focused regression tests.

.maestro/
├── v1-readiness.yaml       # Existing installed-build flow; expand or complement for critical flow.
└── smoke.yaml              # Existing historical smoke; update if retained because it has stale copy.

.planning/phases/11-mobile-visual-polish-and-emulator-validation/
├── 11-RESEARCH.md
├── 11-PLAN.md              # To be created by planner.
└── 11-UAT.md               # Recommended Phase 11 evidence/truth record.

docs/release/
└── v1-readiness.md         # Update old PASS/blocker matrix after Phase 11 evidence.
```

The exact component filenames are planner discretion, but work should stay inside these existing ownership areas. [VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`; VERIFIED: codebase]

### Pattern 1: Shared Mobile Status System

**What:** Consolidate visual treatment for central/local/pending/conflict/resolved/critical states into local typed presentation helpers used by `StatusNotice`, task rows, textual badges, and sync markers. [VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`; VERIFIED: `apps/mobile/src/capture/capture-ui.tsx`]

**When to use:** Use for every critical state in `Preparar turno`, `Hoje`, product/lot flows, terminal resolution, sync/conflict panels, and shift close. [VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`]

**Example:**

```typescript
// Source: existing app pattern plus Phase 11 state decisions.
type MobileStatusTone =
  | "info"
  | "warning"
  | "critical"
  | "success"
  | "pendingCentral"
  | "localOnly"
  | "conflict";

type MobileStatusDescriptor = {
  tone: MobileStatusTone;
  title: string;
  body: string;
  priority: number;
};
```

This example is a planning shape, not a required filename or exact API. [ASSUMED]

### Pattern 2: Truth-Preserving Visual Hierarchy

**What:** The top of the mobile screen should prioritize blockers and conflicts, then pending central state near the verdict/action, then active critical tasks, then local-only work, then resolved/history. [VERIFIED: `.planning/phases/10-real-pilot-flow-rebuild/10-CONTEXT.md`; VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`]

**When to use:** Use whenever a screen might visually imply safety, resolution, central acknowledgement, or action completion. [VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`]

**Example:**

```typescript
// Source: Phase 10 sync priority contract.
const statusPriority = [
  "conflict",
  "pendingCentralCritical",
  "activeCriticalTask",
  "localOnly",
  "resolved",
] as const;
```

The exact constant names are planner discretion; the ordering is locked by Phase 10/11 semantics. [VERIFIED: `.planning/phases/10-real-pilot-flow-rebuild/10-CONTEXT.md`; VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`]

### Pattern 3: Corridor-Ready Decision Blocks

**What:** Each decision block should have one clear primary action, large touch targets, direct Portuguese-BR copy, controlled severity color, and local/pending state shown close to the action it affects. [VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`; VERIFIED: `.planning/phases/10-real-pilot-flow-rebuild/10-UI-SPEC.md`]

**When to use:** Use for `Preparar turno`, active critical tasks, lot registration, terminal actions, unsafe shift close, and conflict review. [VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`]

**Example:**

```tsx
// Source: React Native accessibility guidance plus existing local button primitive pattern.
<Pressable
  accessibilityRole="button"
  accessibilityState={{ disabled }}
  disabled={disabled}
  hitSlop={8}
  style={buttonStyle}
>
  <Text style={buttonLabelStyle}>Retirar agora</Text>
</Pressable>
```

React Native documents `accessibilityRole` and `accessibilityState`, and `Pressable` supports `hitSlop`; Android accessibility guidance recommends at least 48dp touch targets. [CITED: https://reactnative.dev/docs/accessibility; CITED: https://reactnative.dev/docs/pressable; CITED: https://developer.android.com/guide/topics/ui/accessibility/apps]

### Pattern 4: Installed-Flow Screenshot Evidence

**What:** Add Maestro `takeScreenshot` checkpoints after meaningful state transitions in the installed Android flow, then summarize sanitized screenshots in Phase 11 UAT. [CITED: https://docs.maestro.dev/reference/commands-available/takescreenshot; VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`]

**When to use:** Use after login/privacy, prepare-turn state, Today verdict, product reuse/create, lot registration, terminal/pending central, conflict/sync when fixture allows, and shift close. [VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`]

**Example:**

```yaml
# Source: Maestro takeScreenshot official docs.
- assertVisible: "Preparar turno"
- takeScreenshot: phase11-prepare-turn
- tapOn: "Preparar turno"
- assertVisible: "Hoje"
- takeScreenshot: phase11-hoje-verdict
```

Maestro stores screenshots as PNG output, and the repo currently ignores generic PNG/evidence paths, so the plan must either add an explicit sanitized allowlist path or document non-committed screenshot location plus sanitized textual evidence. [CITED: https://docs.maestro.dev/reference/commands-available/takescreenshot; VERIFIED: `.gitignore`]

### Anti-Patterns to Avoid

- **New UI kit for polish:** It bypasses Phase 10's approved local design contract and risks inconsistent state semantics. [VERIFIED: `.planning/phases/10-real-pilot-flow-rebuild/10-UI-SPEC.md`]
- **Green for synced/local/pending:** It can imply safety or resolution before central business criteria are true. [VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`]
- **Auth-only Maestro PASS as Phase 11 validation:** Current `.maestro/v1-readiness.yaml` only checks auth/privacy readiness, which is too shallow for Phase 11's required critical-flow evidence. [VERIFIED: `.maestro/v1-readiness.yaml`; VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`]
- **Screenshots with real data or private URLs:** Project policy and Phase 11 decisions forbid committing real store/customer data, build URLs, tokens, raw evidence photos, and device-sensitive information. [VERIFIED: `AGENTS.md`; VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`] 
- **Provider proof from Expo Go or sync-only APK:** Expo docs and project docs require native Android runtime plus Firebase/FCM credentials for real remote Android push proof. [CITED: https://docs.expo.dev/versions/latest/sdk/notifications/; CITED: https://docs.expo.dev/push-notifications/fcm-credentials/; VERIFIED: `docs/operations/push-alerts.md`]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Mobile component system | A new ad hoc screen-by-screen styling layer or third-party UI kit | Existing `capture-theme.ts` and `capture-ui.tsx` | Keeps Phase 10 tokens, copy, and state semantics consistent. [VERIFIED: `.planning/phases/10-real-pilot-flow-rebuild/10-UI-SPEC.md`; VERIFIED: codebase] |
| Status truth mapping | Per-screen string/color conditionals | A shared typed mobile status vocabulary | Prevents `Sincronizado`, `Pendente central`, `Local`, `Conflito`, and `Resolvido` from drifting across screens. [VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`] |
| Installed mobile E2E | Custom tap/screenshot scripts | Maestro + Android Emulator/ADB | Maestro is already wired through `pnpm test:e2e:mobile` and official docs support emulator/device flow execution. [VERIFIED: `package.json`; CITED: https://docs.maestro.dev/maestro-cli/run-your-first-test-with-the-maestro-cli] |
| Remote push proof | Mocked/local notification assertions | Approved native APK plus Firebase/FCM credentials, or explicit external blocker | Expo remote Android push requires native build conditions that mocks cannot prove. [CITED: https://docs.expo.dev/versions/latest/sdk/notifications/; CITED: https://docs.expo.dev/push-notifications/fcm-credentials/] |
| Camera/device proof | Component mocks or simulator-only claim | Approved Android device run, or explicit external blocker | Phase 11 allows permission/no-photo fallback validation but reserves real device proof for approved device evidence. [VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`] |
| Evidence sanitization | Manual eyeballing only | Existing `pnpm.cmd security:evidence` plus explicit fixture rules | The repo has a scanner for sensitive evidence patterns and Phase 11 requires fictional fixtures. [VERIFIED: `scripts/check-no-sensitive-evidence.mjs`; VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`] |

**Key insight:** Phase 11's hard problem is not drawing better cards; it is making visual polish prove the same operational truth that Phase 10 made enforceable. The safest plan strengthens shared state presentation and evidence discipline instead of adding UI surface area. [VERIFIED: `.planning/phases/10-real-pilot-flow-rebuild/10-CONTEXT.md`; VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`]

## Common Pitfalls

### Pitfall 1: Treating `Sincronizado` as `Resolvido`
**What goes wrong:** A synced transport acknowledgement visually clears or de-emphasizes active risk before central business resolution exists. [VERIFIED: `.planning/STATE.md`; VERIFIED: `.planning/phases/10-real-pilot-flow-rebuild/10-CONTEXT.md`]  
**Why it happens:** UI copy and success color often collapse delivery, central acknowledgement, and terminal resolution into one "done" state. [VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`]  
**How to avoid:** Keep `Sincronizado`, `Pendente central`, `Conflito`, and `Resolvido` visually distinct, with green/accent reserved for proven confidence and primary actions. [VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`]  
**Warning signs:** A green synced badge near an unsafe verdict; active task hidden after sync ack only. [VERIFIED: `.planning/phases/10-real-pilot-flow-rebuild/10-CONTEXT.md`]

### Pitfall 2: Polishing `Hoje` while leaving sensitive states half-finished
**What goes wrong:** The cockpit looks better but prepare blockers, terminal resolution, conflicts, pending central, or unsafe shift close still feel like prototype surfaces. [VERIFIED: `.planning/debug/uat-today-polish.md`; VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`]  
**Why it happens:** `TodayScreen.tsx` is the visible center, but Phase 11's mandatory scope spans the full critical flow. [VERIFIED: `apps/mobile/src/capture/TodayScreen.tsx`; VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`]  
**How to avoid:** Plan polish by journey state, not by single file; include `Preparar turno`, product/lot, detail/terminal, sync/conflict, and shift close acceptance criteria. [VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`]  
**Warning signs:** Updated hero/card visuals with unchanged conflict or shift-close blocker UI. [VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`]

### Pitfall 3: Marking Android validation passed with no connected device
**What goes wrong:** Component tests pass and docs claim Android readiness even though no installed app was exercised. [VERIFIED: `.planning/phases/10-real-pilot-flow-rebuild/10-UAT.md`]  
**Why it happens:** `pnpm test:e2e:mobile` depends on Maestro and an active emulator/device; `adb devices` was empty during research. [VERIFIED: local command `adb devices`; CITED: https://docs.maestro.dev/maestro-cli/run-your-first-test-with-the-maestro-cli]  
**How to avoid:** Start an AVD or connect an approved device, install/open the app, run `pnpm.cmd test:e2e:mobile`, and record exact blocked output if the target is unavailable. [VERIFIED: `docs/testing/strategy.md`; VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`]  
**Warning signs:** UAT says PASS but has no device id, command output, screenshots, or Maestro artifact reference. [VERIFIED: `.planning/phases/10-real-pilot-flow-rebuild/10-UAT.md`; VERIFIED: `docs/release/v1-readiness.md`]

### Pitfall 4: Stale Maestro scripts assert pre-Phase-10 semantics
**What goes wrong:** A smoke test passes while asserting old copy such as direct `Hoje` entry or an overly safe verdict. [VERIFIED: `.maestro/smoke.yaml`; VERIFIED: `.planning/phases/10-real-pilot-flow-rebuild/10-CONTEXT.md`]  
**Why it happens:** `.maestro/smoke.yaml` predates the current `Preparar turno` and central truth flow, while `.maestro/v1-readiness.yaml` is shallow auth/privacy coverage. [VERIFIED: `.maestro/smoke.yaml`; VERIFIED: `.maestro/v1-readiness.yaml`]  
**How to avoid:** Update or split Maestro flows so Phase 11 evidence covers current canonical copy and truth states. [VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`]  
**Warning signs:** Assertions mention `Area de venda segura` without proving central package and critical-state criteria. [VERIFIED: `.maestro/smoke.yaml`; VERIFIED: `.planning/phases/10-real-pilot-flow-rebuild/10-CONTEXT.md`]

### Pitfall 5: Evidence paths silently ignored
**What goes wrong:** Screenshots are generated but not committed or discoverable by release reviewers. [VERIFIED: `.gitignore`]  
**Why it happens:** The repo ignores `.maestro/artifacts/`, `evidence/`, and generic `*.png`, except approved asset directories. [VERIFIED: `.gitignore`]  
**How to avoid:** Plan an explicit sanitized evidence strategy: either add a narrow allowlist for Phase 11 screenshots or commit a UAT record with safe artifact metadata and blocked/pass outputs. [VERIFIED: `.gitignore`; VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`]  
**Warning signs:** `git status --short` does not show generated screenshots after a Maestro run. [VERIFIED: `.gitignore`]

### Pitfall 6: Leaking provider/build/device details
**What goes wrong:** Public docs contain build URLs, Firebase material, tokens, private evidence paths, real store data, or raw photos. [VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`; VERIFIED: `scripts/check-no-sensitive-evidence.mjs`]  
**Why it happens:** Android/push/camera validation naturally produces provider and device details that are not public-repo-safe. [VERIFIED: `docs/release/android-pilot-install.md`; VERIFIED: `docs/operations/push-alerts.md`]  
**How to avoid:** Commit only fictional sanitized screenshots/outputs, run `pnpm.cmd security:evidence`, and keep private provider details outside Git. [VERIFIED: `scripts/check-no-sensitive-evidence.mjs`; VERIFIED: `.gitignore`]  
**Warning signs:** Docs include an EAS build link, `Bearer` token, signed object query, device URI, or raw image. [VERIFIED: `scripts/check-no-sensitive-evidence.mjs`]

### Pitfall 7: Confusing local Firebase file presence with provider proof
**What goes wrong:** A local ignored `google-services.json` is treated as proof that the approved APK/provider path passed. [VERIFIED: local filesystem; VERIFIED: `git status`; VERIFIED: `apps/mobile/app.config.js`]  
**Why it happens:** `apps/mobile/app.config.js` can use an explicit Google services file, but real proof still requires a controlled native APK for `@liiiraak1ng/validade-zero` with correct Android package and Firebase/FCM credentials embedded. [VERIFIED: `apps/mobile/app.config.js`; VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`; CITED: https://docs.expo.dev/push-notifications/fcm-credentials/]  
**How to avoid:** Record local file availability separately from approved provider/device pass status. [VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`]  
**Warning signs:** Push marked PASS without native APK identity, Firebase/FCM build evidence, and device/provider result. [VERIFIED: `docs/operations/push-alerts.md`]

## Code Examples

Verified patterns from official and local sources:

### Maestro Screenshots

```yaml
# Source: Maestro takeScreenshot docs.
- tapOn: "Preparar turno"
- assertVisible: "Hoje"
- takeScreenshot: phase11-hoje
```

`takeScreenshot` saves a PNG test-output screenshot and accepts an optional path/name. [CITED: https://docs.maestro.dev/reference/commands-available/takescreenshot]

### React Native Accessible Press Target

```tsx
// Source: React Native accessibility and Pressable docs.
<Pressable
  accessibilityRole="button"
  accessibilityState={{ disabled }}
  hitSlop={8}
  disabled={disabled}
>
  <Text>Conferir agora</Text>
</Pressable>
```

React Native documents accessibility roles/states and `Pressable` hit areas; Android accessibility guidance recommends at least 48dp touch targets. [CITED: https://reactnative.dev/docs/accessibility; CITED: https://reactnative.dev/docs/pressable; CITED: https://developer.android.com/guide/topics/ui/accessibility/apps]

### EAS Internal APK Profile

```json
{
  "build": {
    "staging": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

The repository already has `pilot` and `staging` internal APK profiles; Expo documents `distribution: "internal"` for internal distribution builds. [VERIFIED: `apps/mobile/eas.json`; CITED: https://docs.expo.dev/build/eas-json/; CITED: https://docs.expo.dev/build/internal-distribution/]

### Existing Evidence Scanner

```bash
pnpm.cmd security:evidence
```

This command runs `scripts/check-no-sensitive-evidence.mjs`, which scans tracked and unignored text files for device-local evidence URIs, embedded image binaries, signed object queries, raw bearer tokens, and private production-like object keys. [VERIFIED: `package.json`; VERIFIED: `scripts/check-no-sensitive-evidence.mjs`]

## State of the Art

| Old Approach | Current Approach | When Changed / Current Evidence | Impact |
|--------------|------------------|----------------------------------|--------|
| Expo Go as enough for Android push checks | Native/development build required for remote push on Android | Expo docs state remote push is unavailable in Expo Go on Android from SDK 53 onward. [CITED: https://docs.expo.dev/versions/latest/sdk/notifications/] | Phase 11 can polish push UX, but real push proof needs approved native APK/provider evidence. |
| Component tests as enough mobile validation | Installed app on active emulator/device plus Maestro/UAT evidence | Maestro docs require an active emulator/device, and Phase 10 UAT records zero devices as blocker. [CITED: https://docs.maestro.dev/maestro-cli/run-your-first-test-with-the-maestro-cli; VERIFIED: `.planning/phases/10-real-pilot-flow-rebuild/10-UAT.md`] | Planner must include Android target startup/connection and blocked-output tasks. |
| Auth-only readiness smoke | Critical-flow installed evidence | Phase 11 decisions require login/privacy, prepare-turn, Today, product/lot, terminal/pending, sync/conflict when available, and shift close. [VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`] | `.maestro/v1-readiness.yaml` must be expanded or complemented. |
| Generic screenshot artifacts | Sanitized, small, public-safe evidence or explicit block record | Phase 11 forbids real data, private URLs, tokens, build URLs, raw photos, and device-sensitive information. [VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`] | Evidence path and security scan are planning tasks. |
| Old release PASS matrix | Separated old evidence, current repo readiness, current emulator readiness, provider/device blockers | Phase 10 and Phase 11 both require separation of repo/Neon readiness from Android/provider proof. [VERIFIED: `.planning/phases/10-real-pilot-flow-rebuild/10-06-SUMMARY.md`; VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`] | `docs/release/v1-readiness.md` must be reconciled. |

**Deprecated/outdated:**
- Treating `.maestro/smoke.yaml` as sufficient Phase 11 validation is outdated because its assertions do not cover the full Phase 11 critical-flow evidence scope. [VERIFIED: `.maestro/smoke.yaml`; VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`]
- Treating old Android/Maestro PASS records as current release truth is outdated because Phase 10's newer UAT records the current installed-build gate as blocked by zero devices. [VERIFIED: `docs/release/v1-readiness.md`; VERIFIED: `.planning/phases/10-real-pilot-flow-rebuild/10-UAT.md`]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The planner may create a new helper file such as a mobile status descriptor module, but the exact filename/API is not locked. [ASSUMED] | Architecture Patterns | Low: wrong filename does not affect behavior if shared state semantics are implemented consistently. |
| A2 | A narrow committed screenshot allowlist under the Phase 11 directory is acceptable if screenshots are fictional, small, and sanitized. [ASSUMED] | Common Pitfalls / Validation | Medium: if the project prefers no PNGs in Git, the plan must instead commit textual UAT evidence with local artifact references. |
| A3 | Authenticated critical-flow Maestro automation may need fixture/session strategy beyond the current auth-only script. [ASSUMED] | Validation Architecture | Medium: if an existing hidden staging login flow is sufficient, the plan can be simpler; if not, manual UAT steps are needed. |

## Open Questions

1. **Should Phase 11 commit sanitized PNG screenshots or only a UAT markdown record with local artifact paths?**  
   What we know: Phase 11 requires sanitized screenshots, but `.gitignore` ignores generic PNG/evidence paths. [VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`; VERIFIED: `.gitignore`]  
   What's unclear: Whether the project wants a narrow `.planning/phases/11...` screenshot allowlist. [ASSUMED]  
   Recommendation: Planner should choose one explicit evidence strategy before implementation. [ASSUMED]

2. **Can Maestro automate the full authenticated critical flow with current fixtures?**  
   What we know: `.maestro/v1-readiness.yaml` is auth/privacy only, and `.maestro/smoke.yaml` has historical assertions. [VERIFIED: `.maestro/v1-readiness.yaml`; VERIFIED: `.maestro/smoke.yaml`]  
   What's unclear: Whether current staging auth/device fixture setup can drive product/lot/terminal/shift-close without manual preconditioning. [ASSUMED]  
   Recommendation: Plan Wave 0 to update/verify fixtures and mark unavailable states as manual/UAT or blocked. [ASSUMED]

3. **Will an approved real Android device/provider run be available during execution?**  
   What we know: Emulator tools and AVDs are installed, but `adb devices` was empty during research; Phase 10 recorded installed Android validation blocked. [VERIFIED: local command results; VERIFIED: `.planning/phases/10-real-pilot-flow-rebuild/10-UAT.md`]  
   What's unclear: Whether the executor can start the local AVD successfully and whether a physical approved device/provider run is available. [ASSUMED]  
   Recommendation: Plan emulator as required, physical push/camera provider proof as pass-or-explicit-external-block. [VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | pnpm/Expo/test tooling | Yes | v24.16.0 | None needed. [VERIFIED: local command `node --version`] |
| pnpm | Workspace scripts | Yes via `pnpm.cmd`; plain `pnpm` blocked by PowerShell policy | 11.0.0 | Use `pnpm.cmd` on Windows. [VERIFIED: local command results] |
| npm | Registry verification/slopcheck side effects | Yes via `npm.cmd`; plain `npm` not found by slopcheck Python process | 11.13.0 | Use `npm.cmd` for manual registry checks. [VERIFIED: local command results] |
| Expo CLI | Mobile dev server/build support | Yes via workspace exec | 56.1.16 | Use `pnpm.cmd exec expo ...`. [VERIFIED: local command `pnpm.cmd exec expo --version`] |
| EAS CLI | Optional APK rebuild | No direct `eas.cmd` | Not installed globally | Existing script uses `pnpm dlx eas-cli@latest`; use only if build is required and auth/package risk is accepted. [VERIFIED: local command result; VERIFIED: `apps/mobile/package.json`] |
| Maestro CLI | Installed Android E2E | Yes | 2.6.1 | None for Android gate; blocked if unusable. [VERIFIED: local command `maestro --version`] |
| Java | Android tooling / Maestro support | Yes | OpenJDK 21.0.11 LTS | None needed. [VERIFIED: local command `java -version`] |
| ADB | Device/emulator detection/install | Yes | 37.0.0 | None for Android gate. [VERIFIED: local command `adb version`] |
| Android Emulator | Local installed validation | Yes | 36.6.11.0 | Approved connected Android device. [VERIFIED: local command `emulator -version`] |
| Android AVD | Local emulator target | Yes | `ValidadeZeroApi36`, `ValidadeZeroApi36Arm` | Approved connected Android device. [VERIFIED: local command `emulator -list-avds`] |
| Connected emulator/device | `pnpm.cmd test:e2e:mobile` | No during research | `adb devices` returned no devices | Start AVD or connect approved device; otherwise record blocker. [VERIFIED: local command `adb devices`] |
| Local Firebase `google-services.json` | Optional provider/build config | Present but ignored/untracked | Local file, not committed | Use only through explicit env/local flag; do not commit contents. [VERIFIED: local filesystem; VERIFIED: `.gitignore`; VERIFIED: `git ls-files apps/mobile/google-services.json`] |
| Context7 CLI/MCP | Documentation lookup | No | `ctx7` not found | Official docs/web sources used. [VERIFIED: local command result] |

**Missing dependencies with no fallback:**
- A running connected Android target is missing right now; Phase 11 Android validation cannot pass until an emulator/device appears in `adb devices`. [VERIFIED: local command `adb devices`; VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`]

**Missing dependencies with fallback:**
- Global/direct EAS CLI is missing; the phase can still complete local emulator validation without rebuilding APK if an installable app target is available, and the repo has an existing `pnpm.cmd build:android:staging` path if a controlled rebuild is needed. [VERIFIED: local command result; VERIFIED: `apps/mobile/package.json`; VERIFIED: `apps/mobile/eas.json`]
- Context7 is missing; official documentation URLs were used as fallback sources. [VERIFIED: local command result]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Unit/component framework | `vitest` 4.1.9, with existing mobile tests under `apps/mobile/src/**/*.test.ts(x)`. [VERIFIED: `package.json`; VERIFIED: `apps/mobile/package.json`; VERIFIED: codebase file listing] |
| Mobile E2E framework | Maestro CLI 2.6.1 through root script `pnpm.cmd test:e2e:mobile`. [VERIFIED: `package.json`; VERIFIED: local command `maestro --version`] |
| Web/supporting E2E | `@playwright/test` locked 1.61.0 in repo; supporting, not decisive for Android proof. [VERIFIED: `package.json`; VERIFIED: npm registry] |
| Config files | `vitest.config.ts` and `playwright.config.ts` exist. [VERIFIED: local command `Test-Path`] |
| Quick run command | `pnpm.cmd --filter @validade-zero/mobile test -- mobile-release-journeys` for release journey component checks. [VERIFIED: `apps/mobile/src/capture/mobile-release-journeys.test.tsx`; VERIFIED: `apps/mobile/package.json`] |
| Full suite command | `pnpm.cmd check` for repository quality gate. [VERIFIED: `package.json`] |
| Installed Android command | `pnpm.cmd test:e2e:mobile` after an Android emulator/device is running and the app is installed/available. [VERIFIED: `package.json`; VERIFIED: `docs/testing/strategy.md`] |
| Evidence security command | `pnpm.cmd security:evidence`. [VERIFIED: `package.json`; VERIFIED: `scripts/check-no-sensitive-evidence.mjs`] |

### Phase Requirements -> Test Map

Phase requirement IDs are TBD/null, so the planner should create Phase 11 acceptance IDs before tasking. Suggested planning IDs below map directly to the locked Phase 11 decisions. [VERIFIED: user request; VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`]

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| P11-POLISH-01 | Critical flow screens meet final corridor-ready criteria without changing truth semantics. | Component/a11y + manual screenshot review | `pnpm.cmd --filter @validade-zero/mobile test -- mobile-release-journeys mobile-capture.accessibility mobile-product-polish` | Yes, related files exist. [VERIFIED: codebase file listing] |
| P11-STATUS-02 | Shared mobile status system differentiates conflict, pending central, local, critical, synced, and resolved. | Unit/component | Add/extend focused status and row tests; run `pnpm.cmd --filter @validade-zero/mobile test -- capture` | Partial; exact shared status test may be Wave 0. [VERIFIED: `apps/mobile/src/capture/capture-ui.tsx`; VERIFIED: codebase file listing] |
| P11-ANDROID-03 | Installed Android flow passes Maestro with active emulator/device. | Mobile E2E | `pnpm.cmd test:e2e:mobile` | Script exists, but current device availability is blocked. [VERIFIED: `package.json`; VERIFIED: local `adb devices`] |
| P11-SCREENSHOT-04 | Sanitized screenshots cover required critical flow states. | Mobile E2E + UAT artifact | Maestro with `takeScreenshot`, then `pnpm.cmd security:evidence` if committed | Gap: screenshot path/allowlist not yet defined. [VERIFIED: `.gitignore`; CITED: https://docs.maestro.dev/reference/commands-available/takescreenshot] |
| P11-TRUTH-05 | Release/UAT matrix separates old PASS, current repo readiness, current emulator readiness, and external provider/device blockers. | Documentation verification | Manual doc review plus `pnpm.cmd security:evidence` | Gap: Phase 11 UAT file not created yet. [VERIFIED: `docs/release/v1-readiness.md`; VERIFIED: `.planning/phases/10-real-pilot-flow-rebuild/10-UAT.md`] |
| P11-PROVIDER-06 | Push/camera physical provider/device evidence is passed only with approved proof or recorded as external blocker. | Manual/device UAT | No fully automated proof unless approved device/provider run exists | Partial; docs and tests exist, proof target unavailable during research. [VERIFIED: `docs/operations/push-alerts.md`; VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`] |

### Sampling Rate

- **Per task commit:** Run the relevant focused mobile Vitest command and `pnpm.cmd security:evidence` when touching evidence/docs. [VERIFIED: `package.json`; VERIFIED: `scripts/check-no-sensitive-evidence.mjs`]
- **Per wave merge:** Run `pnpm.cmd check`; if Android target is available, run `pnpm.cmd test:e2e:mobile`. [VERIFIED: `package.json`; VERIFIED: `docs/testing/strategy.md`]
- **Phase gate:** Full repo gate green, `pnpm.cmd test:e2e:mobile` passed on installed/running Android or exact blocked output recorded, screenshots/UAT recorded, and release truth matrix updated. [VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`]

### Wave 0 Gaps

- [ ] Decide screenshot evidence strategy because `.gitignore` ignores `.maestro/artifacts/`, `evidence/`, and generic PNGs. [VERIFIED: `.gitignore`]
- [ ] Expand or complement `.maestro/v1-readiness.yaml` beyond auth/privacy to cover the Phase 11 critical flow. [VERIFIED: `.maestro/v1-readiness.yaml`; VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`]
- [ ] Review/update `.maestro/smoke.yaml` if retained, because it contains historical assertions that may not match Phase 10 central-truth flow. [VERIFIED: `.maestro/smoke.yaml`; VERIFIED: `.planning/phases/10-real-pilot-flow-rebuild/10-CONTEXT.md`]
- [ ] Add or extend focused component/a11y tests for any new shared status vocabulary and long Portuguese copy wrapping. [VERIFIED: `apps/mobile/src/capture/capture-ui.tsx`; VERIFIED: `.planning/phases/10-real-pilot-flow-rebuild/10-UI-SPEC.md`]
- [ ] Create Phase 11 UAT/release truth record; no `11-UAT.md` exists at research time. [VERIFIED: phase directory listing]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | Yes | Preserve authenticated mobile composition and do not add Maestro shortcuts that bypass login/privacy truth. [VERIFIED: `apps/mobile/App.tsx`; VERIFIED: `.maestro/v1-readiness.yaml`] |
| V3 Session Management | Yes | Use existing session-aware repository/API construction; do not hard-code bearer tokens in fixtures or docs. [VERIFIED: `apps/mobile/App.tsx`; VERIFIED: `scripts/check-no-sensitive-evidence.mjs`] |
| V4 Access Control | Yes | Keep server-owned store/role/capability authority; UI polish must not imply cross-store or privileged operations. [VERIFIED: `.planning/STATE.md`; VERIFIED: `.planning/phases/10-real-pilot-flow-rebuild/10-CONTEXT.md`] |
| V5 Input Validation | Yes | Preserve existing runtime contracts for product/lot/task actions; new UI status helpers should be typed and tested. [VERIFIED: `.planning/REQUIREMENTS.md`; VERIFIED: codebase tests] |
| V6 Cryptography | No new crypto | Never hand-roll crypto; provider credentials stay outside Git and in EAS/Firebase-approved paths. [VERIFIED: `AGENTS.md`; CITED: https://docs.expo.dev/eas/environment-variables/; CITED: https://docs.expo.dev/push-notifications/fcm-credentials/] |
| Evidence/privacy handling | Yes | Use fictional fixtures, avoid real photos/build URLs/tokens/private device paths, and run evidence security scanning. [VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`; VERIFIED: `scripts/check-no-sensitive-evidence.mjs`] |

### Known Threat Patterns for Expo/React Native Validation

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| False safe UI due to visual hierarchy | Tampering / Information Integrity | Keep central truth state near verdict/action; reserve green for proven confidence; ensure active risk remains visible. [VERIFIED: `.planning/phases/10-real-pilot-flow-rebuild/10-CONTEXT.md`; VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`] |
| Sensitive evidence leakage in public repo | Information Disclosure | Use fictional fixtures, avoid private URLs/tokens/raw photos/device URIs, run `pnpm.cmd security:evidence`. [VERIFIED: `scripts/check-no-sensitive-evidence.mjs`; VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`] |
| Auth fixture bypass hides access-control bugs | Elevation of Privilege | Keep login/privacy in Maestro/UAT and use server-issued session flows; do not commit tokens. [VERIFIED: `.maestro/v1-readiness.yaml`; VERIFIED: `scripts/check-no-sensitive-evidence.mjs`] |
| Provider credential leakage | Information Disclosure | Use EAS environment/file variables and ignored local files; do not paste Firebase service account material into docs/logs. [CITED: https://docs.expo.dev/eas/environment-variables/; CITED: https://docs.expo.dev/push-notifications/fcm-credentials/; VERIFIED: `.gitignore`] |
| Push delivery mistaken for execution proof | Repudiation / Information Integrity | Keep push reminder-only; persistent in-app tasks, escalation, and physical confirmation remain source of execution truth. [VERIFIED: `AGENTS.md`; VERIFIED: `docs/operations/push-alerts.md`] |

## Sources

### Primary (HIGH confidence)

- `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md` - locked Phase 11 scope, Android/evidence criteria, external blocker rules. [VERIFIED: codebase]
- `.planning/REQUIREMENTS.md` - v1 UI, quality, offline/sync, audit/security requirements. [VERIFIED: codebase]
- `.planning/STATE.md` - current Phase 11 status, Phase 10 completion/blockers, accumulated decisions. [VERIFIED: codebase]
- `AGENTS.md` - project constraints and GSD workflow directives. [VERIFIED: codebase]
- `.planning/phases/10-real-pilot-flow-rebuild/10-CONTEXT.md` - central truth, sync taxonomy, prepare-turn gate, terminal resolution. [VERIFIED: codebase]
- `.planning/phases/10-real-pilot-flow-rebuild/10-UI-SPEC.md` - approved mobile visual contract, tokens, copy, states, a11y expectations. [VERIFIED: codebase]
- `.planning/phases/10-real-pilot-flow-rebuild/10-UAT.md` and `10-06-SUMMARY.md` - latest Android/provider blocker records. [VERIFIED: codebase]
- `apps/mobile/src/capture/capture-theme.ts`, `capture-ui.tsx`, `TodayScreen.tsx`, `CaptureApp.tsx`, `apps/mobile/App.tsx` - mobile implementation surfaces. [VERIFIED: codebase]
- `.maestro/v1-readiness.yaml`, `.maestro/smoke.yaml`, `docs/testing/strategy.md`, `docs/release/android-pilot-install.md`, `docs/release/v1-readiness.md`, `docs/operations/push-alerts.md`, `docs/operations/pilot-flow.md` - validation/release/provider evidence context. [VERIFIED: codebase]
- `.agents/skills/impeccable/SKILL.md`, `.agents/skills/impeccable/reference/product.md`, `.agents/skills/impeccable/reference/polish.md` - project UI polish guidance. [VERIFIED: codebase]
- Expo docs: internal distribution, EAS build config, Android environment setup, notifications SDK, EAS environment variables, FCM credentials. [CITED: https://docs.expo.dev/build/internal-distribution/; CITED: https://docs.expo.dev/build/eas-json/; CITED: https://docs.expo.dev/get-started/set-up-your-environment/; CITED: https://docs.expo.dev/versions/latest/sdk/notifications/; CITED: https://docs.expo.dev/eas/environment-variables/; CITED: https://docs.expo.dev/push-notifications/fcm-credentials/]
- Maestro docs: CLI first test and `takeScreenshot`. [CITED: https://docs.maestro.dev/maestro-cli/run-your-first-test-with-the-maestro-cli; CITED: https://docs.maestro.dev/reference/commands-available/takescreenshot]
- React Native and Android accessibility docs. [CITED: https://reactnative.dev/docs/accessibility; CITED: https://reactnative.dev/docs/pressable; CITED: https://developer.android.com/guide/topics/ui/accessibility/apps]
- Android Emulator screenshot docs. [CITED: https://developer.android.com/studio/run/emulator-take-screenshots]

### Secondary (MEDIUM confidence)

- npm registry/package metadata and npm downloads API for existing package versions, publication dates, repositories, and weekly downloads. [VERIFIED: npm registry]
- Local command probes for Node, pnpm, npm, Expo CLI, EAS CLI, Maestro, Java, ADB, Android Emulator, AVDs, `adb devices`, Context7 availability, and git tracking state. [VERIFIED: local command results]
- slopcheck text verdicts for existing package legitimacy; JSON mode was unavailable. [VERIFIED: slopcheck text verdict]

### Tertiary (LOW confidence)

- None used as authoritative sources. All planning-critical claims were verified against local code/artifacts or official docs. [VERIFIED: source audit]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - current package versions, local CLI availability, and official docs were verified. [VERIFIED: npm registry; VERIFIED: local command results; CITED: Expo/Maestro/RN docs]
- Architecture: HIGH - Phase 10/11 decisions and mobile code ownership are explicit in local artifacts. [VERIFIED: `.planning/phases/10-real-pilot-flow-rebuild/10-CONTEXT.md`; VERIFIED: `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md`; VERIFIED: codebase]
- Pitfalls: HIGH - each pitfall is grounded in Phase 10/11 decisions, current Maestro scripts, current blocker records, or `.gitignore`/security scanner behavior. [VERIFIED: codebase]
- Package legitimacy: MEDIUM - npm registry and slopcheck text checks were completed, but slopcheck JSON output was unavailable and `vitest` produced a SUS false-positive-style warning that should be human-gated before any dependency change. [VERIFIED: npm registry; VERIFIED: slopcheck text verdict]
- Environment availability: MEDIUM-HIGH - tools were probed on 2026-06-28, but emulator/device availability is moment-in-time and currently blocked by no connected target. [VERIFIED: local command results]

**Research date:** 2026-06-28  
**Valid until:** 2026-07-05 for Android/emulator/tool availability and Expo/Maestro behavior; 2026-07-28 for local Phase 10/11 architecture unless new phase decisions supersede this research. [ASSUMED]
