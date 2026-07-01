---
status: complete
quick_id: 260701-ed0
completed: 2026-07-01
commit: pending-docs-commit
---

# Quick Task 260701-ed0: Release APK 147 And Deploy Staging

## Summary

Generated the local Android staging APK for build `147`, deployed the staging API Worker, deployed the Vercel web production alias used for staging, and validated the public endpoints.

## Source And Git

- Release source commit after rebase: `0fd15045 feat(release): align staging build 147`
- Quick plan commit after rebase: `18b12202 docs(260701-ed0): plan build 147 release`
- `main` was rebased onto `origin/main` without force-push.
- Push succeeded: `origin/main` advanced from `1cce16f5` to `18b12202` before deploy.

## Validation Before Deploy

| Check | Result |
|---|---|
| `cmd /c pnpm.cmd check` before rebase | Passed |
| `cmd /c pnpm.cmd check` after rebase/format normalization | Passed |
| Runtime build label scan | Current runtime defaults point to `uat17-shift-close-alerts-apk-147`; older labels remain only in tests/history fixtures |

## APK

- APK: `C:\Users\Liiiraa\Documents\estudos\validade\artifacts\validade-zero-staging-0.12.0-147.apk`
- Size: `103174512` bytes
- SHA256: `8ADCB4C49B4D9DB90B5D59953FA629F21A0E06A6A063F212A14EC34A850A5DC0`
- Package: `com.validadezero.app`
- Version: `0.12.0`
- Android versionCode: `147`
- Approved artifact label: `uat17-shift-close-alerts-apk-147`
- API target: `https://validade-zero-api-staging.validadezero.workers.dev`
- Signature check: `apksigner verify --print-certs` passed; local APK is signed with the default Android debug certificate.

## API Deploy

- Command: `cmd /c pnpm.cmd --filter @validade-zero/api deploy:staging`
- Worker: `validade-zero-api-staging`
- URL: `https://validade-zero-api-staging.validadezero.workers.dev`
- Version ID: `53700f00-b8f9-41db-8f86-8ea0bec26387`
- Bound staging vars include:
  - `VALIDADE_ZERO_APPROVED_ARTIFACT_LABEL=uat17-shift-close-alerts-apk-147`
  - `VALIDADE_ZERO_APPROVED_APP_VERSION=0.12.0`
  - `VALIDADE_ZERO_APPROVED_BUILD=147`
- Health: `GET /health` returned `200`
- Probe: `GET /probe` returned `200`

## Web Deploy

- Command: `cmd /c pnpm.cmd dlx vercel@latest --prod --yes`
- Production alias used for staging: `https://validade-five.vercel.app`
- Deployment URL: `https://validade-g7rvjkhks-mateusoliveiradev1s-projects.vercel.app`
- Deployment ID: `dpl_HsGDW2d2WPgNbE3w4Q8nQ3SyphmF`
- Alias validation: `https://validade-five.vercel.app` returned `200` and contains `Validade Zero`
- API rewrite validation: `https://validade-five.vercel.app/health` returned `200`
- Bundle validation: published JS asset contains `uat17-shift-close-alerts-apk-147` and `147`

## Still External

This release did not prove:

- APK installed on a Loja 18 Android device.
- Remote provider push receipt/open on the approved device.
- Camera evidence or accepted no-photo fallback on the approved device path.
- Second approved mobile device convergence.
- Safe shift close after central revalidation and physical checklist.
- Physical in-aisle Loja 18 UAT.

## Install Command

If an Android device is connected with USB debugging:

```powershell
adb install -r "C:\Users\Liiiraa\Documents\estudos\validade\artifacts\validade-zero-staging-0.12.0-147.apk"
```
