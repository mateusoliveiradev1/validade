# Pitfalls Research: Validade Zero

## Pitfall 1: Treating Push as Guaranteed

**Risk:** OS-level push can be delayed, muted, dropped, or disabled.

**Warning signs:** Users say "I did not receive the notification"; tasks are only visible in notification history; no in-app pending view.

**Prevention:** Push is a reminder, not the source of truth. Use in-app task inbox, repeated reminders, escalation, and shift close gates.

**Phase impact:** Address in the first usable mobile slice.

## Pitfall 2: Pretending to Know Sales Without Sales Data

**Risk:** The app marks a lot as safe because it assumes it sold.

**Warning signs:** No last_seen_at, no physical confirmation, no uncertain state.

**Prevention:** Model observed presence, not sales. A lot is safe only after physical confirmation, withdrawal, movement, or verified absence.

**Phase impact:** Core domain model.

## Pitfall 3: Barcode Overconfidence

**Risk:** EAN/GTIN identifies product but not necessarily lot/validity.

**Warning signs:** Scanner workflow has no manual correction path.

**Prevention:** Use scanning to speed selection, but require human-confirmable lot/validity entry unless GS1 DataMatrix/QR includes those fields.

**Phase impact:** Entry UX and validation.

## Pitfall 4: Treating Fresh FLV Like Packaged Expiration

**Risk:** Apples and other fresh items are forced into legal validity workflows they do not have.

**Warning signs:** All categories require expiration date.

**Prevention:** Separate formal validity, quality window, received date, and inspection cadence.

**Phase impact:** Product/category rule model.

## Pitfall 5: Free Tier as Production Guarantee

**Risk:** The project promises zero cost but later depends on SLA, storage, or compute beyond free limits.

**Warning signs:** No usage budget, no fallback, no upgrade threshold.

**Prevention:** Define pilot limits, monitor Neon CU-hours/storage, R2 storage/ops, Worker requests, and Expo push behavior. Keep migration paths open.

**Phase impact:** Infrastructure and monitoring.

## Pitfall 6: Beta Lock-in

**Risk:** Neon Auth or Data API changes affect the app.

**Warning signs:** Domain and UI import provider-specific SDKs directly.

**Prevention:** Use ports/adapters: AuthProvider, DatabaseClient, StorageProvider, PushProvider.

**Phase impact:** Architecture foundation.

## Pitfall 7: Overmodularization

**Risk:** "Full modular" becomes dozens of abstractions before behavior exists.

**Warning signs:** Many packages with one file each; interfaces only used once; hard-to-follow flow.

**Prevention:** Modular monolith with real bounded contexts; extract only stable boundaries.

**Phase impact:** Workspace and code standards.

## Pitfall 8: 100% E2E as a Metric Trap

**Risk:** Too many slow brittle E2E tests, weak unit tests, and low developer velocity.

**Warning signs:** E2E tests validate trivial rendering but miss domain edge cases.

**Prevention:** 100% of critical user journeys E2E; 100%/mutation focus on critical domain rules; component and integration tests elsewhere.

**Phase impact:** Testing strategy.

## Pitfall 9: Public Repo Secret Leakage

**Risk:** Service keys, tokens, test data, or evidence URLs are committed.

**Warning signs:** .env committed; real photos in fixtures; service role key used locally in frontend.

**Prevention:** .env.example, secret scanning, pre-commit secret checks, fake fixtures, no production data in repo.

**Phase impact:** Tooling foundation.

## Pitfall 10: UI That Looks Good but Fails in Store

**Risk:** Beautiful dashboard that is too slow or ambiguous during actual shelf work.

**Warning signs:** Small touch targets, low contrast, charts as first screen, vague copy like "manage item".

**Prevention:** Mobile "Hoje" workflow, direct copy, strong states, high contrast, one-hand actions, Impeccable critique/polish/harden passes.

**Phase impact:** UI design contract and first mobile slice.

