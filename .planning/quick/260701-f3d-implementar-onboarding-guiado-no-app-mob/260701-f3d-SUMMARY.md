---
status: complete
quick_id: 260701-f3d
completed: 2026-07-01
implementation_commit: ffe60e10
---

# Quick Task 260701-f3d: Guided Mobile Onboarding And Build 148

## Summary

Implemented the guided operational onboarding inside the mobile app, kept the invite/login flow separate, bumped the approved staging artifact to build `148`, generated the installable APK, and deployed the aligned API/web staging surfaces.

## Product Behavior

- Added `Primeiros passos da loja` as an in-app guided onboarding route.
- The guide walks through invite access, central read, real lot registration, Hoje review, and safe shift close.
- Empty central first-store setup now opens the guide before product search/registration.
- Hoje keeps `Registrar lote` as the direct action and adds a contextual `Guia de primeiros passos` entry when there are no active tasks and the shift is not closed.
- The guide preserves the operational truth that zero tasks does not mean a safe sales area without physical confirmation.

## Build Identity

- App version: `0.12.0`
- Android versionCode/build: `148`
- Approved artifact label: `uat18-guided-onboarding-apk-148`
- Build ref: `guided-onboarding-148`
- API target: `https://validade-zero-api-staging.validadezero.workers.dev`

## Validation

| Check | Result |
|---|---|
| Focused mobile tests for onboarding/Hoje/prepare-turn/release journey | Passed |
| `pnpm.cmd check` | Passed |
| Runtime label scan | No old `uat17-shift-close-alerts-apk-147` runtime/default references remain |
| API `/health` | `200` |
| API `/probe` | `200` |
| Web alias `/` | `200`, contains `Validade Zero` |
| Web alias `/health` | `200` |
| Published web JS asset | Contains `uat18-guided-onboarding-apk-148` and `148` |

## APK

- APK: `C:\Users\Liiiraa\Documents\estudos\validade\artifacts\validade-zero-staging-0.12.0-148.apk`
- Size: `103179916` bytes
- SHA256: `FDDDFAFFDBA63C19FBE64DF87DB9EA02F83B4CD750604CBF31F30D4BCA768E67`
- Package: `com.validadezero.app`
- Version: `0.12.0`
- Android versionCode: `148`
- Signature check: `apksigner verify --print-certs` passed with the local Android debug certificate.
- Signer SHA-256 digest: `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`

## API Deploy

- Command: `pnpm.cmd --filter @validade-zero/api deploy:staging`
- Worker: `validade-zero-api-staging`
- URL: `https://validade-zero-api-staging.validadezero.workers.dev`
- Version ID: `e3273022-27ad-4af5-a0b1-42812dbda913`
- Bound staging vars include:
  - `VALIDADE_ZERO_APPROVED_ARTIFACT_LABEL=uat18-guided-onboarding-apk-148`
  - `VALIDADE_ZERO_APPROVED_APP_VERSION=0.12.0`
  - `VALIDADE_ZERO_APPROVED_BUILD=148`

## Web Deploy

- Command: `pnpm.cmd dlx vercel@latest --prod --yes`
- Production alias used for staging: `https://validade-five.vercel.app`
- Deployment URL: `https://validade-beihxvtw2-mateusoliveiradev1s-projects.vercel.app`
- Deployment ID: `dpl_QfB1iDwBKH3y3APCoNyYfaCvvW9g`
- Published JS asset checked: `/assets/index-D04rSvzN.js`

## Still External

This quick task did not prove:

- APK installed on a Loja 18 Android device.
- Remote provider push receipt/open on the approved device.
- Camera evidence or accepted no-photo fallback on the approved device path.
- Second approved mobile device convergence.
- Safe shift close after central revalidation and physical checklist.
- Physical in-aisle Loja 18 UAT.

## Install Command

If an Android device is connected with USB debugging:

```powershell
adb install -r "C:\Users\Liiiraa\Documents\estudos\validade\artifacts\validade-zero-staging-0.12.0-148.apk"
```
