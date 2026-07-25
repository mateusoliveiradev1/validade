---
status: partial
phase: 18-controle-gpp-mobile-para-avaria-e-compras-internas
source: [18-VERIFICATION.md, 18-UAT.md, 18-06-SUMMARY.md]
started: 2026-07-10T07:40:00-03:00
updated: 2026-07-25T09:37:28-03:00
---

# Phase 18 Human UAT - Post-170 Conflict Discard

## Current Test

[testing paused — native device unavailable]

## Tests

### 1. Native justified conflict discard

expected: On an approved post-170 Android build, central rejection appears as `Conflito de GPP`; empty justification keeps discard disabled; after a reason is entered, one press on `Descartar registro deste aparelho` removes the active conflict, shows device-local discard confirmation, and does not claim central success.
result: blocked
blocked_by: physical-device
reason: "APK 171 was built and verified, but the only attached AVD remains offline because this host has no nested virtualization/WHPX support; adb install returns device offline."

## Existing Evidence

- Prior Android/local-central UAT passed avaria, offline retry, code-optional purchase, and GPP web perception.
- The exact conflict-discard route passes integrated renderer regression and repository persistence assertions.
- Deliberate artifact `validade-zero-staging-0.12.0-171.apk` was built from stabilized `main`.
- APK metadata: package `com.validadezero.app`, version `0.12.0`, versionCode `171`, target SDK `36`.
- APK signature verification passed with Android APK Signature Scheme v2.
- SHA-256: `DED8A05E87FE031F309206DFC5EA11E0EBCECC939DFAAB92C5A7852B631F1428`.
- Native install attempt failed with `adb.exe: device offline`.
- Host diagnostics: Hypervisor present, but nested virtualization extensions/SLAT are unavailable; x86 AVD cannot use WHPX and the ARM AVD is incompatible with the x86_64 host.
- The remaining item is native proof on build 171, not a known repository implementation gap.

## Summary

total: 1
passed: 0
issues: 0
pending: 0
skipped: 0
blocked: 1

## Gaps

None reported. Native verification is blocked until build 171 can be installed on a physical Android device or an accelerated x86_64 AVD.
