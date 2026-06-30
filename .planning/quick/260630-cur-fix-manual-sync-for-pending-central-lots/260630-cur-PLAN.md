---
quick_id: 260630-cur
status: complete
created: 2026-06-30
---

# Quick Task 260630-cur: Fix Manual Sync For Pending Central Lots

## Goal

Fix the live issue where the app can show local command queue `0` while a newly registered lot remains pending central sync and its expected Today task does not appear.

## Root Cause

Manual sync from Hoje/Ajustes called only `syncPendingCommands`. Pending central lot replay uses `repository.syncPendingCentralLots`, which was only attempted by the automatic sync effect. If that automatic effect had already run before the lot was registered, tapping manual sync could report an empty queue without sending the pending lot.

## Tasks

1. Make manual sync from Hoje call `syncPendingCentralLots` as well as `syncPendingCommands`.
2. Make manual sync from Ajustes do the same, including the "Conferir fila local" empty-command path.
3. Add regression tests for pending central lot sync in Hoje and Ajustes.
4. Run focused mobile tests/typecheck.
5. Rebuild the local Android APK so the fix is installable.

## Verification

- Focused mobile tests pass.
- Mobile typecheck passes.
- Local APK is rebuilt and checksum recorded in SUMMARY.
