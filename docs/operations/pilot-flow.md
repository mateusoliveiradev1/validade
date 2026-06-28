# Real Pilot Flow Runbook

This runbook describes the Phase 10 pilot path for fictional/staging data. It is not a public signup or production-store data procedure.

## Operating Principle

Validade Zero can say the sales area is safe only when central truth is current, active blockers are gone, and the final physical checklist is complete. Local saves, push receipts, synchronized-but-not-resolved commands, and end-of-shift pressure never create a safe state by themselves.

## Start Of Shift

1. Open the app with a store-linked account.
2. Use `Preparar turno` before operating `Hoje`.
3. Confirm the store, role, central read freshness, active tasks, conflicts, and pending local command count.
4. If the central read is unavailable, stale, empty, or blocked, continue only as visible pending work. Do not declare the area safe.

## Product And Lot

1. Search for the product by name, code, or category.
2. Reuse a central product when it is available.
3. If a new product is needed, create a draft. A draft stays visibly pending central review and must not be treated as trusted catalog.
4. Register the lot only after product confirmation.
5. Confirm identity, quantity, initial location, and the date fields required by the product mode.
6. If the lot is saved locally or pending central acknowledgement, keep the copy as pending. Another device should trust it only after preparing the turn from central truth.

## Tasks And Resolution

1. Work from `Hoje`, not from a detached dashboard.
2. Resolve terminal work only with a compatible physical action such as loss, withdrawal, safe movement, completed markdown with shelf confirmation, or guided not-found/probably-sold-out recheck.
3. Offline actions stay local or pending central until the sync result arrives.
4. Conflicts and discarded actions require human review. A discarded local action is not silently safe.
5. Resolved items remain in short history and audit; they do not disappear from the system.

## Command Center

Leadership reads the Command Center as the web view of central truth for the store:

- active critical lots and tasks;
- product drafts pending review;
- markdown, evidence, conflict, discarded, and shift-close blockers;
- resolved history and shift history;
- role/store denial when the session does not have operational scope.

If the central read fails, the Command Center fails closed with review-required copy.

For Loja 18 UAT, leadership also follows the `UAT Loja 18` checklist in the Command Center. The checklist guides prepare-turn, real product input, real lot registration, terminal resolution, second-device convergence, Command Center consistency, safe push test, camera/fallback, and shift close. Product and lot steps pass only with real user-entered Loja 18 data; fictional fixtures and seeds are not UAT proof.

## Alerts

Push is a reminder channel only. Delivery, open intent, acknowledgement, or provider receipt does not resolve tasks. `Hoje`, central sync, physical confirmation, and Command Center remain the source of truth.

## Shift Close

Safe close:

1. The API revalidates central capture immediately.
2. Safe close is rejected if central read is stale/unavailable/empty, active tasks exist, product drafts are pending, conflicts/discards remain, critical local sync is pending, evidence is missing, a prior unsafe close is still local, or the checklist is incomplete.
3. The final checklist is ordered: sales area checked, pending work explained, handoff ready.

Unsafe close:

1. Use it when work remains at the end of the shift.
2. Record reason, continuity owner, deadline, and note.
3. The receipt must say whether it is centrally accepted or still saved locally.
4. Tasks, alerts, and escalation continue until the physical work is resolved centrally.

## Evidence And Release Records

- Use only fictional/staging data in repository fixtures and docs.
- Do not commit real store names, customer data, tokens, connection strings, signed URLs, Expo build URLs, push tokens, raw photos, or device file URIs.
- Installed-build UAT belongs in the controlled release record. The public repo may record pass/block status and sanitized command output only.
- Guided Loja 18 UAT may record checklist state, blocker cause, next action, and public-safe evidence label only. Real product names, lot values, raw screenshots, photos, private links, and device identifiers stay out of Git.
- For the current Android/provider/camera status, read `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-UAT.md` and `docs/release/v1-readiness.md`. Older emulator/APK PASS records are historical unless the Phase 11 matrix marks the current gate as passed.
