---
phase: 03
slug: mobile-lot-capture
status: verified
threats_open: 0
asvs_level: 1
register_authored_at_plan_time: true
created: 2026-06-20
---

# Phase 03 — Security

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Mobile entry and barcode scan to capture contracts | Product, lot, location, quantity, and correction fields are untrusted until parsed. | Operational data and identifiers |
| Capture repository to SQLite | Validated records cross into the local durable ledger. | Local operational facts |
| Observation action to history | A physical action or correction becomes an auditable fact. | Actor, time, location, quantity, status |
| Camera permission to lookup | Hardware permission and scan output are optional aids only. | Permission state and lookup text |

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-03-01 | Tampering | Capture input schemas | mitigate | Mode-discriminated Zod contracts validate product, lot, location, identity, and observation inputs; malformed cases are covered by contract tests. | closed |
| T-03-02 | Tampering | SQLite adapter | mitigate | SQLite queries use bound parameters and parsed repository inputs; repository tests cover durable current-snapshot behavior. | closed |
| T-03-03a | Repudiation | Observation corrections | mitigate | Corrections are appended to history and require a reason in `PhysicalObservationInputSchema`. | closed |
| T-03-03b | Spoofing | Product discovery | mitigate | A discovered product must be explicitly selected and confirmed before the lot form; unknown code remains a prefill only. | closed |
| T-03-04 | Tampering | Lot form | mitigate | Required mode-specific dates and locations are validated before a local save. | closed |
| T-03-05a | Repudiation | Repeat registration | mitigate | A repeat capture resets lot facts and each save records the local actor label. | closed |
| T-03-05b | Tampering | Current lot snapshot | mitigate | Recent lots derive from append-only observations; filters and refreshed current state are tested. | closed |
| T-03-06 | Repudiation | Consequential outcomes | mitigate | Withdrawal, loss, not-found, and likely-sold-out actions require a summary confirmation before append. | closed |
| T-03-07a | Tampering | Correction path | mitigate | A correction reason is required and tests prove historical observations remain retained. | closed |
| T-03-07b | Tampering | Barcode handoff | mitigate | Scan data returns through manual lookup and still requires explicit product confirmation. | closed |
| T-03-08 | Denial of Service | Camera permission and hardware | mitigate | The barcode surface preserves a visible manual-search fallback for unavailable, denied, and failed camera paths. | closed |
| T-03-09 | Repudiation | Verification evidence | mitigate | Native Maestro, automated checks, Windows runtime constraint, and human UAT results are recorded in phase artifacts. | closed |

## Accepted Risks Log

No accepted risks.

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-20 | 12 | 12 | 0 | Codex inline security audit |

## Verification Evidence

- `packages/contracts/src/capture.ts` uses discriminated Zod schemas and enforces a correction reason.
- `apps/mobile/src/capture/sqlite-repository.ts` uses bound SQLite parameters and parses mapped records at the repository boundary.
- `apps/mobile/src/capture/ConfirmationSheet.tsx` is the explicit gate for consequential actions.
- `apps/mobile/src/capture/BarcodeLookupAssistant.tsx` retains manual fallback; the human UAT confirmed it.
- `pnpm.cmd security` passed environment-example, secret, and real-data safety checks on 2026-06-20.

## Sign-Off

- [x] All threats have a disposition.
- [x] No accepted risks require follow-up.
- [x] `threats_open: 0` confirmed.
- [x] `status: verified` set in frontmatter.

**Approval:** verified 2026-06-20
