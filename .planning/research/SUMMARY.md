# Project Research Summary: Validade Zero

## Key Findings

**Stack:** Use pnpm/Turborepo, Expo mobile, React/Vite web, Hono API on Cloudflare Workers, Neon Postgres, Drizzle, Zod/Hono RPC, R2 storage, Cloudflare Cron, Expo Push, and SQLite offline outbox.

**Table Stakes:** Product/lot/location control, configurable category rules, strong push + in-app tasks, rebaixa workflow, physical verification without sales data, evidence, audit trail, offline sync, roles, and web admin.

**Watch Out For:** Push is not guaranteed; sales are unavailable; Neon Auth/Data API are beta; free tiers are not production SLAs; scanner data may not include lot/validity; fresh FLV needs quality rules, not fake expiration.

## Implications for Requirements

- Requirements must separate formal expiration control from quality/inspection control.
- Every critical risk must become a task with owner, deadline, status, and resolution.
- Shift closure must show whether the sales area is safe.
- Push must be backed by persistent in-app tasks and escalation.
- Offline actions must sync via idempotent commands.
- Evidence and audit are part of the core workflow, not optional admin features.

## Implications for Roadmap

1. Start with tooling, domain model, and type/test gates.
2. Build the mobile "Hoje" workflow before admin dashboards.
3. Add Neon/Cloudflare integration after domain rules are testable.
4. Add push pipeline early because it is core value.
5. Add web admin after the core field workflow proves useful.
6. Add polish/hardening phases with Impeccable and security checks before calling v1 complete.

## Recommended Architecture Decision

Adopt **Neon + Cloudflare** as the primary zero-cost pilot infrastructure, but keep all provider APIs behind adapters. This satisfies the user's preference for Neon while protecting the project from beta lock-in and free-tier changes.

## Research Confidence

- Stack direction: High
- Neon/Auth/Data API usage: Medium due beta status
- Domain feature set: High
- Exact supermarket operational thresholds beyond 60/15 days: Medium; needs user/store validation
- Legal/regulatory details: Medium; official sources identified, but final policy should be checked against company/legal standards before rollout

## Sources

- Neon pricing: https://neon.com/pricing
- Neon scale to zero: https://neon.com/docs/introduction/scale-to-zero
- Neon Data API: https://neon.com/docs/data-api/overview
- Neon Auth: https://neon.com/docs/auth/overview
- Supabase billing comparison: https://supabase.com/docs/guides/platform/billing-on-supabase
- Cloudflare Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/
- Expo Push: https://docs.expo.dev/push-notifications/overview/
- ANVISA/RDC 727/2022: https://www.in.gov.br/en/web/dou/-/resolucao-rdc-n-727-de-1-de-julho-de-2022-413249279
- MAPA eggs context: https://www.gov.br/agricultura/pt-br/assuntos/noticias/2025/portaria-sobre-ovos-de-consumo-representa-avanco-e-seguranca-para-o-setor-produtivo
- Procon-SP/APAS validity guidance: https://www.procon.sp.gov.br/wp-content/uploads/2026/02/CartilhaOrientativa-Final-5.pdf
- GS1 DataMatrix: https://www.gs1br.org/gs1-datamatrix

