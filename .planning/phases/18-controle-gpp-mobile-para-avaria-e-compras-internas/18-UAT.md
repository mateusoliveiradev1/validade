---
status: partial
phase: 18-controle-gpp-mobile-para-avaria-e-compras-internas
source: [18-VALIDATION.md, 18-05-PLAN.md]
started: 2026-07-03T02:47:00-03:00
updated: 2026-07-03T02:47:00-03:00
---

# Phase 18 UAT - Controle GPP Mobile

## Current Test

Awaiting physical/manual UAT in an aisle-like mobile session with central API available and then unavailable.

## Tests

### 1. One-hand avaria registration
expected: GPP user opens directly in Controle GPP, taps `Registrar avaria`, enters product code, quantity/unit, finality/destination, reviews, and sees central success only after acknowledgement.
result: pending

### 2. Offline avaria pending and return online
expected: With network unavailable, valid avaria submission becomes `Pendente neste aparelho`; after connectivity returns, `Sincronizar pendencias GPP` retries with the same idempotency key.
result: pending

### 3. Code-optional purchase request
expected: Sector user submits `Solicitar compra interna` with product name/description, no product code, quantity/unit, and finality; central acknowledgement shows success.
result: pending

### 4. Offline purchase pending and GPP web perception
expected: Offline purchase becomes `Pendente neste aparelho`; after central sync, GPP web queue shows the purchase without duplicate records.
result: pending

### 5. Conflict review
expected: Central rejection after retry appears as `Conflito de GPP`, offers correction/retry, and requires justification before `Descartar registro deste aparelho`.
result: pending

### 6. Today boundary
expected: `Hoje` contains no `Registrar avaria`, `Solicitar compra interna`, GPP baixa, or GPP-linked validity task resolution entry in Phase 18.
result: automated-pass

## Summary

total: 6
passed: 1
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps

Manual physical/network/provider proof remains pending; repository tests do not prove real device network transitions or GPP web perception.
