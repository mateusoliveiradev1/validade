# Free Pilot Limits

The Phase 1 foundation is designed for a zero recurring cost pilot. These limits can change, so verify provider pricing and quotas before turning on live services, heavy CI, or frequent scheduled jobs.

## Current Provider Stance

| Provider                 | Planned Use                                            | Phase 1 Stance                                                  | Limit To Verify                                                                                       |
| ------------------------ | ------------------------------------------------------ | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Neon                     | Postgres, branching, possible Neon Auth/Data API later | No live database required in Phase 1; keep URLs fake.           | Free storage, compute/CU-hour cap, branch behavior, auth/data API quotas, and scale-to-zero behavior. |
| Cloudflare Workers       | API and future cron dispatch                           | Hono API is scaffolded, but no production deploy is required.   | Free request count, CPU time, cron limits, and worker compatibility.                                  |
| Cloudflare R2            | Future evidence photo storage                          | No bucket or real object is required in Phase 1.                | Free storage, Class A/B operation limits, egress model, and access controls.                          |
| Cloudflare Cron Triggers | Future alert engine wakeups                            | Not enabled in Phase 1.                                         | Trigger frequency, free quota, and worker CPU impact.                                                 |
| Expo Push                | Future push reminders                                  | No push credential or real device token is required in Phase 1. | Free service posture, OS delivery caveats, rate limits, and token handling.                           |
| GitHub Actions           | CI, CodeQL, dependency review                          | Public-repo workflows run the baseline quality suite.           | Public repo minute policy, cache limits, CodeQL availability, and dependency review availability.     |

## Operating Rules

- Do not create paid resources for Phase 1.
- Do not commit provider credentials.
- Prefer fake adapters and placeholders until a later phase explicitly needs live integration.
- Keep CI focused on deterministic quality gates.
- Keep Playwright browser, Maestro emulator/device, and Stryker mutation runs documented as local or later-release checks unless the CI budget is reviewed.
- Re-check free tier limits before enabling scheduled cron, image upload, longer E2E matrices, mutation thresholds, or live provider tests.

## Readiness Gates

Before a future live pilot:

- Confirm current Neon, Cloudflare, Expo, and GitHub limits.
- Confirm no production secret is present in git history or repository settings.
- Confirm `.env.example` still uses fake placeholders.
- Confirm evidence storage uses object keys in Postgres and binaries outside Postgres.
- Confirm high and critical security findings are closed.
