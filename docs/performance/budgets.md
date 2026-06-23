# Performance Budgets

The v1 checks use deterministic local fixtures and never call provider services.

| Surface                                            |                              Budget | Automated evidence                                                              |
| -------------------------------------------------- | ----------------------------------: | ------------------------------------------------------------------------------- |
| Web Command Center and authenticated shell         |        JavaScript under 160 KB gzip | `pnpm performance:budgets` after `pnpm build`                                   |
| Web Command Center and audit filter feedback       | 5 seconds in local browser fixtures | `pnpm test:e2e:web`                                                             |
| Mobile app/session resolution and Hoje composition |      deterministic component render | `pnpm --filter @validade-zero/mobile test -- mobile-release-journeys auth-flow` |
| Offline/sync and evidence error truth              |       deterministic component tests | `pnpm --filter @validade-zero/mobile test -- sync evidence`                     |

Run `pnpm build && pnpm performance:budgets` for the bundle measurement. The script reports only aggregate asset sizes, never URLs, identifiers, evidence metadata, or credentials.

Physical-device startup, real push delivery, provider latency, private storage upload, and an internal APK install remain manual release checks. Their result must be recorded as passed or blocked; a local fixture does not prove provider behavior.
