---
status: partial
phase: 18-controle-gpp-mobile-para-avaria-e-compras-internas
source: [18-VERIFICATION.md, 18-UAT.md]
started: 2026-07-03T03:05:00-03:00
updated: 2026-07-03T03:05:00-03:00
---

# Phase 18 Human UAT - Controle GPP Mobile

## Current Test

Awaiting physical Android and provider/web validation.

## Tests

### 1. One-hand avaria registration

expected: GPP user opens Controle GPP, registers avaria with product code, quantity/unit, finality/destination, reviews, and sees success only after central acknowledgement.
result: pending

### 2. Offline avaria pending return online

expected: Network unavailable avaria becomes `Pendente neste aparelho`; connectivity returns; `Sincronizar pendencias GPP` retries the same idempotency key.
result: pending

### 3. Code-optional purchase request

expected: Sector user submits purchase with product description, no product code, quantity/unit, and finality; central acknowledgement shows success.
result: pending

### 4. Offline purchase pending GPP web perception

expected: Offline purchase becomes `Pendente neste aparelho`; after sync, GPP web queue shows the purchase without duplicate records.
result: pending

### 5. Conflict review

expected: Central rejection retry appears as `Conflito de GPP`, offers correction/retry, and requires justification before `Descartar registro deste aparelho`.
result: pending

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps

None reported yet.
