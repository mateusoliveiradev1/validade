# Phase 12: Pilot Operations and Device Readiness - Context

**Gathered:** 2026-06-28T11:09:51.3537834-03:00
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 12 turns the closed-pilot build into an observable, supportable store operation. It proves which Android devices, users, push channels, permissions, app versions, API targets, and real-store UAT steps are actually ready before any rollout claim.

This phase is not a new product flow, not a cosmetic pass, and not a shortcut around the Phase 10/11 truth rules. It adds pilot operations visibility: per-device readiness, safe push testing, installed-build truth, guided Loja 18 UAT, and explicit blockers with next actions. The app and Command Center must stop relying on hidden assumptions such as "the APK installed, therefore it is ready" or "push exists in code, therefore push works".

</domain>

<decisions>
## Implementation Decisions

### Painel de aparelhos prontos
- **D-01:** The Command Center must show each registered pilot device with a clear verdict: **Apto**, **Atencao**, or **Bloqueado**. The verdict is a summarized operational readiness state, not a raw technical dump.
- **D-02:** A device becomes **Bloqueado** only for real operational risk: invalid store/user, incompatible or very old app, no first central read, stale critical sync, impossible push when the current UAT step is proving push, or camera denied when the current step requires evidence.
- **D-03:** Device identity in operational surfaces uses a human-readable device label, active user, store, and app version/build. Technical IDs and tokens are masked, omitted, or kept only in safe audit/debug surfaces.
- **D-04:** Device presence/readiness must include last foreground time, last sync, and last central read. The system must not promise live real-time presence unless such a mechanism is actually implemented.

### Teste de push seguro
- **D-05:** Only store leadership/admin with an active same-store membership can send a push test to a registered pilot device. Collaborators do not trigger push tests to avoid noise and confusion with real task charging.
- **D-06:** A push test proves the technical reminder chain only: device registration, permission state, token/provider acceptance or failure, and app open/receive signal when available. It never changes task state, never proves physical execution, and never marks the sales area safe.
- **D-07:** Push test results appear as a short per-device timeline in the Command Center: requester, timestamp, provider/token/permission outcome, app-open signal when available, and the next recommended action.
- **D-08:** A device without remote push can remain **Atencao** when the current pilot step does not depend on remote push. It becomes **Bloqueado** when the UAT/release objective is specifically proving remote push.

### Verdade da build instalada
- **D-09:** Installed-build truth must be visible both in the mobile app and the Command Center. Mobile shows it in a diagnostic/about surface; the Command Center shows it per device.
- **D-10:** Build truth includes app version, Android build/versionCode or equivalent build identifier, environment, API target, and masked commit/artifact identity. It must not expose private build URLs, tokens, provider identifiers, or secrets.
- **D-11:** "Desatualizado" is calculated against the approved staging artifact for UAT, not every commit on `main`. A device may be compatible with current staging even if new code exists that has not been approved as an APK.
- **D-12:** An old APK that can still log in or sync is not automatically ready. It stays **Atencao** or **Bloqueado** according to the risk of the current step and whether the missing fields/flows affect pilot proof.
- **D-13:** Pilot APKs use version-by-phase. Phase 12 should stop shipping as `0.0.0`; it should move to a traceable version such as `0.12.0` with an incrementing Android build/versionCode. `0.0.0` is not acceptable for a pilot APK.

### UAT guiado e bloqueios do piloto
- **D-14:** Loja 18 real-store UAT is a guided checklist in the Command Center with execution on mobile. Leadership can follow steps and record pass/block outcomes while the phone performs the operational actions.
- **D-15:** Required UAT covers the full real pilot loop: prepare turn, reuse/create a real product, register a real lot, perform terminal resolution, converge on a second device/account, verify Command Center consistency, send a safe push test, validate camera/evidence or fallback, and close the shift.
- **D-16:** Pilot blockers must be shown with cause and next action. Examples include no approved device, stale central sync, invalid token, denied camera permission, wrong store membership, pending product review, sync conflict, and unsafe shift close.
- **D-17:** Public repository UAT evidence must be sanitized: safe statuses, timestamps, fictional or masked operational labels, safe command output, and reviewed screenshots only. No real push tokens, private URLs, raw device identifiers, real evidence photos, build URLs, credentials, or sensitive store/customer details can be committed.

### the agent's Discretion
The planner may define exact schemas, endpoint names, UI layout, stale-time thresholds, retention windows, build metadata injection strategy, test fixture shape, and UAT artifact format. It may not weaken central truth, device readiness semantics, push-as-reminder-only semantics, version truth, Loja 18 no-fake-data rules, or public evidence hygiene.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project and Phase State
- `.planning/PROJECT.md` - Core value, constraints, mobile-first operation, zero-cost pilot, no sales integration, and reliability rules.
- `.planning/REQUIREMENTS.md` - v1 requirements for push, shift workflow, offline/sync, audit/security, and UI/copy.
- `.planning/STATE.md` - Current Phase 12 focus, prior phase status, release blockers, and accumulated decisions.
- `.planning/ROADMAP.md` - Phase 12 goal, requirements, dependencies, and success criteria.

### Prior Truth Contracts
- `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-CONTEXT.md` - Android polish, installed-device evidence, provider/camera blockers, and release truth rules.
- `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-UAT.md` - Current installed Android, push provider, camera/device, and physical-device blocker matrix.
- `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-VERIFICATION.md` - Verified Phase 11 status and external blockers to preserve.
- `.planning/phases/10-real-pilot-flow-rebuild/10-CONTEXT.md` - Central truth, prepare-turn, sync taxonomy, terminal resolution, RBAC, push, and shift-close decisions.
- `.planning/phases/09-impeccable-hardening-and-v1-readiness/09-CONTEXT.md` - Product-real v1, Android APK, privacy/auth, Command Center, and release gate expectations.

### Release, UAT, and Operations Docs
- `docs/release/v1-readiness.md` - Current release truth matrix separating repo readiness from installed Android, provider, camera, and physical-device proof.
- `docs/release/android-pilot-install.md` - Approved Android install/build path and constraints for internal APK evidence.
- `docs/testing/strategy.md` - Mobile E2E, evidence hygiene, and exact blocked-output rules when no Android target is available.
- `docs/operations/staging-loja-18-uat.md` - Loja 18 staging rules, 23-store setup, category catalog, no fake products/lots, and real UAT expectations.
- `docs/operations/push-alerts.md` - Push as reminder-only, provider outcome semantics, native remote push prerequisites, and no-secret token rules.
- `docs/operations/pilot-flow.md` - Real pilot flow runbook across prepare-turn, product/lot, tasks, Command Center, alerts, shift close, and release evidence.

### Mobile, API, Web, and Contracts
- `apps/mobile/app.json` - Current Expo version is `0.0.0`; Phase 12 must replace this for pilot APK truth.
- `apps/mobile/package.json` - Current mobile package version is `0.0.0`; coordinate with app/build metadata strategy.
- `apps/mobile/app.config.js` - Staging API/Firebase file-variable behavior and native push build gate.
- `apps/mobile/App.tsx` - Authenticated mobile composition and runtime wiring point for app/build diagnostics.
- `apps/mobile/src/capture/TodayScreen.tsx` - Current push permission, local-only fallback, alert status, and operator-safe push copy.
- `apps/mobile/src/capture/repository.ts` - Mobile repository boundary for alert device registration and pilot-ready device metadata.
- `apps/mobile/src/capture/sqlite-repository.ts` - Local persistence for device alert channels and offline state.
- `packages/contracts/src/command-center.ts` - Existing Command Center projection schema to extend with device health, push-test, and build truth.
- `packages/database/src/capture-repository.ts` - Existing `central_device_snapshots` write path and in-memory device snapshot support.
- `apps/api/src/command-center.ts` - Command Center projection service and integration point for device readiness and push-test timeline.
- `apps/web/src/command-center/CommandCenter.tsx` - Web surface for per-device readiness, guided UAT, blockers, and next actions.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `central_device_snapshots` already records device/store prepare-turn state, central read timestamps, pending commands, conflicts, source, and updated time. Phase 12 can extend this instead of inventing a separate readiness island.
- `packages/contracts/src/command-center.ts` already structures central snapshot, blockers, conflicts, resolved history, and shift history. It is the natural contract boundary for device health, build truth, and guided UAT state.
- `TodayScreen.tsx` already models push permission, local-only fallback, provider-safe copy sanitization, alert attempts, and leadership acknowledgement semantics.
- `docs/release/v1-readiness.md` and `11-UAT.md` already distinguish current proof from historical evidence. Phase 12 should turn that truth into app/web surfaces.
- `docs/operations/staging-loja-18-uat.md` already defines the no-fake-data Loja 18 staging rule and the real first-product/lot expectation.

### Established Patterns
- Central truth outranks local cache, sync transport acknowledgement, push delivery, or visual success state.
- Push is a charging/reminder channel. It never resolves physical work, never closes a task, and never makes the sales area safe.
- Public repo artifacts must avoid secrets, real operational data, raw device identifiers, private URLs, raw photos, and provider tokens.
- Command Center fails closed when central truth is absent or stale; silence does not mean safe.
- User-facing copy is Portuguese-BR operational, direct, and semantically strict.

### Integration Points
- Mobile should report device label, foreground timestamp, app version/build, environment, API target, permission states, push channel state, and central sync/read state through existing authenticated/sync boundaries.
- API/database should persist device health and push-test timeline without storing raw push tokens in public-facing responses.
- Command Center should render per-device verdicts, UAT checklist status, push-test timelines, stale/build blockers, and next actions.
- Build config should replace `0.0.0` with phase-based pilot versioning and expose sanitized build metadata to the app.

</code_context>

<specifics>
## Specific Ideas

- The user explicitly asked whether the app will show the installed version because Android currently shows `0.0.0` during install. Phase 12 must fix that and make build/version truth visible.
- Use version-by-phase for the pilot: Phase 12 should become traceable, for example `0.12.0`, with Android build/versionCode incrementing.
- The readiness vocabulary for devices is **Apto / Atencao / Bloqueado**.
- Loja 18 UAT must use real operational product/lot input by the user, not fake product/lote seed data.
- The Command Center should answer "what blocks the pilot and what do I do next?", not just list raw telemetry.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 12-Pilot Operations and Device Readiness*
*Context gathered: 2026-06-28T11:09:51.3537834-03:00*
