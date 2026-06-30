---
quick_id: 260630-dsq
status: complete
completed: 2026-06-30
---

# Quick Task 260630-dsq Summary

## Outcome

Fixed manual sync silence/ambiguity for pending central lots and produced the next Android artifact `0.12.0 (134)`.

## Root Causes

- Pending central lots are counted in sync totals but are not ordinary `sync_commands`, so the queue could show a pending count without an explanatory row.
- Hoje only handled a subset of manual sync result states, leaving no feedback in some no-command or offline paths.
- Manual central-lot replay could run before refreshing the central prepare-turn cache, so a product that already existed centrally might not be discovered on that attempt.

## Changes

- Hoje and Ajustes refresh central device state silently before manual sync attempts.
- Hoje and Ajustes now show explicit feedback whenever a pending central lot remains.
- Offline sync UI now explains pending central lots even when there are no command rows.
- Approved pilot build metadata moved to `uat15-sync-feedback-apk-134`.
- Android `versionCode` moved to `134`.
- Generated local APK `artifacts/validade-zero-staging-0.12.0-134.apk`.

## Verification

- Mobile tests: 36 files, 239 tests passed.
- API Command Center tests: 12 files, 84 tests passed.
- Web Command Center tests: 9 files, 38 tests passed.
- Database repository tests: 2 files, 43 tests passed.
- Mobile, API, web, and database typecheck passed.
- `git diff --check` passed.
- APK build passed.
- `aapt dump badging` confirmed `com.validadezero.app`, `versionName='0.12.0'`, `versionCode='134'`.
- `apksigner verify --print-certs` passed.

## APK

- Path: `artifacts/validade-zero-staging-0.12.0-134.apk`
- Android package: `com.validadezero.app`
- Version: `0.12.0`
- Version code: `134`
- Size: `103151020`
- SHA256: `61FCB75820D8EF49F43C748E08C93A8BD50D16234A4B82831C4B07111D062A7E`

## Deployments

- API Worker staging version: `83b48fd3-c376-44e1-a599-a63e505548d8`
- API URL: `https://validade-zero-api-staging.validadezero.workers.dev`
- Vercel deployment: `dpl_BYEHr5NKbg6if2u499r5vLRHKfc1`
- Vercel URL: `https://validade-ejl03drgw-mateusoliveiradev1s-projects.vercel.app`
- Public web alias: `https://validade-five.vercel.app`

## Boundaries

- No USB install was performed because the device is not connected.
- No physical Loja 18 UAT was performed in this quick task.
