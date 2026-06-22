# Phase 8 threat model: audit, roles, evidence, and shift close

## Release rule

Any unresolved high or critical Phase 8 finding blocks release readiness. The controls below complement the project ASVS/MASVS baseline; they do not turn a local fake provider into production authorization.

| ID    | Risk                                      | Primary controls                                                                 | Automated evidence                              | Residual/manual check                                    |
| ----- | ----------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------- |
| T8-01 | Forged role or store scope                | Server-resolved active membership, store-scoped authorization                    | API authorization and membership tests          | Validate production identity issuer mapping              |
| T8-02 | Admin gains lead operations               | Separate role capabilities and explicit lead binding                             | Membership downgrade test and web E2E           | Review role assignments before pilot start               |
| T8-03 | Cross-store disclosure                    | Scoped queries and generic denials                                               | Cross-store membership API denial               | Exercise real provider identities in a second store      |
| T8-04 | History tampering                         | Append-only audit, close, handoff, and mutation tables                           | Schema and migration guard checks               | Inspect database trigger deployment on disposable branch |
| T8-05 | Replay/duplicate effects                  | Idempotency keys and immutable receipts                                          | Shift-close and membership replay tests         | Check retry behavior on real mobile network loss         |
| T8-06 | Evidence binary or private reference leak | Metadata-only contracts, private adapter, source scan                            | Evidence contract tests and `security:evidence` | Review R2 access policy and logs                         |
| T8-07 | Oversized or invalid upload               | MIME, size, hash validation before acknowledgement                               | Evidence service tests                          | Validate configured R2 limits                            |
| T8-08 | Device path enters central data           | Outbox separates local path from command payload                                 | Mobile evidence and source scan tests           | Inspect an encrypted device database during UAT          |
| T8-09 | False safe shift close                    | Central revalidation, blockers, ordered physical checklist, no offline safe path | Domain, API, mobile shift-close tests           | Run native handoff and stale-cache walkthrough           |
| T8-10 | Denial or exceptional access repudiation  | Sanitized denial recorder and exceptional-access audit                           | API authorization/evidence tests                | Review audit retention and operator incident procedure   |

## Incident actions

1. Preserve append-only audit events and provider logs.
2. Remove or downgrade the affected store membership through the versioned administration path.
3. Keep open tasks and escalations visible while access is investigated.
4. Invalidate suspect evidence with a reason and preserve metadata/audit history.
5. Revalidate any shift marked safe during the incident window; reopen creates a linked revision.

## Manual provider and device gates

- Test the production auth provider with a collaborator, lead, administrator and cross-store identity.
- Apply migrations only on a disposable Neon branch before production approval; verify append-only guards and indexes.
- Verify the R2 bucket is private, lifecycle expiry is 90 days, and no object identifiers reach public logs.
- Run the mobile flow on a physical device through offline unsafe close, reconnect acknowledgement, and handoff.
