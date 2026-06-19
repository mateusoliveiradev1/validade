# Phase 1 Threat Model

Phase 1 creates the engineering foundation for Validade Zero. It does not process real store data, real customer data, real user data, real product data, or real evidence photos.

## Scope

In scope:

- Public repository safety.
- Local developer environment and `.env.example`.
- Mobile, web, and API smoke surfaces.
- Shared contracts, config, adapters, domain placeholder, and test fixtures.
- Future Neon, Cloudflare R2, Cloudflare Workers, Expo Push, auth, evidence, and offline sync boundaries.
- CI, CodeQL, dependency review, secret scanning, and real-data checks.

Out of scope:

- Production authentication.
- Real database access.
- Real evidence upload.
- Persisted audit events.
- Offline command synchronization.
- Role enforcement.

## Release Blocking Rule

Any open `high` or `critical` security finding blocks release readiness for the phase or release candidate. Medium findings must become a documented accepted risk or tracked backlog item before readiness is declared.

This project uses OWASP ASVS Level 1 as proportional web/API guidance and OWASP MASVS as proportional mobile guidance. Full ASVS/MASVS coverage deepens in later phases when auth, roles, evidence, and offline sync exist.

## Trust Boundaries

| Boundary | Description | Current Control |
| --- | --- | --- |
| Public repo -> developer machine | Anyone can clone the repo, so committed content must be safe by default. | `.gitignore`, `.env.example`, secret scan, real-data scan, and docs. |
| Developer env -> app runtime | Local env values must be fake unless a future provider setup doc says otherwise. | Env parser and `.env.example` safety check. |
| Mobile/web -> API | Client apps must never receive privileged database credentials. | Smoke apps call API surfaces only; provider access belongs behind API/adapters. |
| API -> provider adapters | Neon, R2, Workers Cron, and Push integrations are future provider boundaries. | Phase 1 uses fake/local adapters and placeholders only. |
| Test fixtures -> public repo | Fixtures can look operational if not visibly fake. | Fixture tests require `FICTICIO` or `EXEMPLO`. |
| Evidence assets -> storage | Real shelf photos and labels are sensitive operational evidence. | Real evidence assets are forbidden from the repo; future storage uses object keys only. |
| Offline queue -> sync API | Future offline commands can replay or conflict. | Phase 1 documents the boundary; idempotency and conflict handling start in later phases. |
| CI -> pull request code | CI runs untrusted changes from pull requests. | Frozen install, quality gates, dependency review, and CodeQL. |

## STRIDE Register

| ID | STRIDE | Component | Severity | Risk | Mitigation | Owner Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| TM-01 | Spoofing | Future auth and roles | high | A user could appear as another collaborator or lead once auth exists. | Keep auth behind replaceable provider adapter, require role tests when roles are implemented, and align with ASVS identity controls. | Future auth plan |
| TM-02 | Tampering | CI workflows and package graph | high | Pull requests could weaken checks or add vulnerable dependencies. | Baseline CI runs frozen install and all quality gates; dependency review blocks high and critical findings. | `.github/workflows/ci.yml` |
| TM-03 | Repudiation | Future task and audit events | medium | Users could dispute who moved, withdrew, or confirmed a lot. | Phase 1 documents audit conventions: actor, store, timestamp, action, target, and evidence reference. Persistence is deferred. | Future audit plan |
| TM-04 | Information Disclosure | Public repo examples | critical | Secrets, real store data, or real evidence photos could leak through examples. | Secret scan, real-data scan, fake fixtures, `.gitignore`, and public-repo safety docs. | `docs/security/public-repo-safety.md` |
| TM-05 | Denial of Service | Free-tier providers and CI | medium | Heavy checks or provider usage could exceed zero-cost pilot limits. | Keep Phase 1 checks lightweight and document provider limits to verify before live use. | `docs/operations/free-pilot-limits.md` |
| TM-06 | Elevation of Privilege | Future API/database access | high | Mobile or web code could bypass API controls if privileged credentials leak. | Never expose privileged database credentials to client apps; keep provider credentials server-side. | `.env.example` |
| TM-07 | Tampering | Future offline sync | high | Offline actions could be replayed or silently overwrite critical state. | Future sync commands must be idempotent and conflict-aware; no silent confirmation of critical actions. | Phase 7 plan |
| TM-08 | Information Disclosure | Future evidence photos | high | Shelf photos or labels could expose operational details. | Store binaries outside Postgres, commit no real media, and keep only controlled object references. | Future evidence plan |

## Audit Conventions Prepared For Later Phases

Future audit events should include:

- Event id.
- Actor id.
- Store id.
- Timestamp.
- Entity type and id.
- Action name.
- Previous and next status when applicable.
- Evidence object key when applicable.
- Source surface such as mobile, web, API, cron, or sync.

Phase 1 documents these conventions only. It does not implement audit persistence.

## Phase 1 Verification

- `pnpm check`
- `pnpm security`
- GitHub dependency review for pull requests
- CodeQL JavaScript/TypeScript analysis

