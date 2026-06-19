<!-- GSD:project-start source:PROJECT.md -->

## Project

**Validade Zero**

Validade Zero é um aplicativo operacional, mobile-first, para colaboradores e lideranças de hortifruti em uma grande rede de supermercados. Ele acompanha produtos com validade por lote e localização, transforma riscos em tarefas com responsáveis e usa alertas fortes, cobranças e escalonamento até que cada pendência seja resolvida e confirmada na área de venda.

O aplicativo complementa os sistemas e relatórios existentes da rede. Ele não depende de acesso às vendas: trabalha com recebimentos, última presença física observada, conferências orientadas, movimentações, rebaixas, retiradas e evidências de execução.

**Core Value:** Garantir que nenhum produto vencido permaneça na área de venda, mantendo cada risco visível e acionável até sua resolução confirmada.

### Constraints

- **Custo**: O piloto deve operar sem gastos recorrentes, usando planos gratuitos e ativos gerados ou capturados pela própria operação.
- **Integração**: A primeira versão não pode depender de dados de vendas, estoque ou APIs internas da rede.
- **Plataforma**: A experiência é mobile-first, com suporte complementar a desktop e operação resiliente a internet instável.
- **Arquitetura**: Monorepo pnpm/Turborepo e monólito modular, evitando microserviços prematuros.
- **Tipagem**: Contratos e tipos fortes end-to-end, validação em runtime nas fronteiras e proibição de `any` não justificado.
- **Qualidade**: SDD, TDD nas regras críticas, cobertura E2E de todos os fluxos essenciais e testes de integração, contrato, segurança e mutação proporcionais ao risco.
- **Código**: Código limpo, performático e modular, aplicando SOLID e DDD quando reduzirem complexidade real, sem dogmatismo ou abstrações prematuras.
- **Segurança**: Repositório público sem segredos ou dados reais; privilégio mínimo, auditoria, RLS/isolamento por loja, threat modeling e referência a OWASP ASVS/MASVS.
- **Desempenho**: Orçamentos de desempenho, sincronização incremental, consultas indexadas e medição automatizada desde o início.
- **Confiabilidade**: Nenhum push isolado pode ser considerado garantia de execução; alertas, tarefas persistentes, escalonamento e confirmação física trabalham em conjunto.

<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->

## Technology Stack

## Recommendation

| Layer | Choice | Confidence | Why |
|---|---|---:|---|
| Monorepo | pnpm workspaces + Turborepo | High | Fast local workflows, clear package boundaries, cacheable tasks. |
| Mobile | Expo + React Native | High | Best fit for camera, push, offline queue, and corridor use on phones. |
| Web admin | React + Vite | High | Leaner than SSR for an internal operational panel; deploys as static assets. |
| API | Hono on Cloudflare Workers | High | Small, fast, typed, zero-cost-friendly API edge layer. |
| Database | Neon Postgres | High | Real Postgres, branching for CI/E2E, free plan is permanent, scale-to-zero wakeups. |
| ORM/migrations | Drizzle | High | Type-safe SQL-first model, migration control, strong with Postgres. |
| Contracts | Zod + Hono RPC | Medium-high | Runtime validation and end-to-end typed client/server contracts. |
| Auth | Neon Auth behind AuthProvider adapter | Medium | Free and database-native, but currently beta; keep replaceable. |
| Storage | Cloudflare R2 | High | 10 GB-month free tier and free egress for evidence photos. |
| Scheduler | Cloudflare Cron Triggers | High | Alert engine should wake independently from database activity. |
| Push | Expo Push Notifications | High | Free push gateway and simplest Expo integration. |
| Offline | Expo SQLite + outbox sync | High | Avoids data loss during poor store connectivity. |
| CI/Security | GitHub Actions, CodeQL, Dependabot, secret scanning | High | Free for public repositories and matches public-repo security goal. |

## Neon vs Supabase

## Free Cost Model

- Neon Free: database, branching, Data API, Auth quota. Main risks: 100 CU-hour cap, 0.5 GB storage, no SLA on Free.
- Cloudflare Workers Free: 100k requests/day, 10 ms CPU per invocation; good for lightweight API and cron dispatch. Source: https://developers.cloudflare.com/workers/platform/pricing/
- Cloudflare R2 Free: 10 GB-month, 1M Class A ops/month, 10M Class B ops/month, free egress. Source: https://developers.cloudflare.com/r2/pricing/
- Expo Push: free notification service, but delivery is not guaranteed by OS push systems. Source: https://docs.expo.dev/push-notifications/overview/
- GitHub public repo: Actions/CodeQL/security features are available without recurring infra cost, but workflow minute details should be verified before heavy CI.

## Type Safety Strategy

## Testing Stack

- Unit and property-style tests for domain rules: Vitest.
- Integration tests for API/use cases: Vitest + local/branch database.
- Database tests: SQL assertions for constraints, indexes, RLS-like authorization filters; pgTAP can be evaluated if supported in target Neon environment.
- Web E2E: Playwright.
- Mobile E2E: Maestro.
- Mutation testing: StrykerJS on critical domain packages.
- Static quality: TypeScript strict, ESLint type-aware rules, dependency boundary checks.
- Security: secret scanning, dependency audit, CodeQL, threat-model docs, OWASP ASVS/MASVS checklists.

## What Not To Use Initially

- Do not use microservices; use a modular monolith.
- Do not make Vercel the primary host; Cloudflare is a better fit because Workers, Pages, R2, and Cron work together in the free-cost architecture.
- Do not store photos in Postgres; store object keys in Postgres and binaries in R2.
- Do not rely on push alone; use push + in-app task queue + escalation + closing checklist.
- Do not let mobile/web talk directly to privileged database credentials.
- Do not over-share UI components across React Native and web; share tokens, copy, schemas, and business rules first.

## Source Notes

- Neon pricing: https://neon.com/pricing
- Neon scale to zero: https://neon.com/docs/introduction/scale-to-zero
- Neon Data API: https://neon.com/docs/data-api/overview
- Neon Auth: https://neon.com/docs/auth/overview
- Cloudflare Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/
- Supabase billing comparison: https://supabase.com/docs/guides/platform/billing-on-supabase
- Expo push: https://docs.expo.dev/push-notifications/overview/
- pnpm workspaces: https://pnpm.io/workspaces
- Turborepo docs: https://turbo.build/repo/docs
- TypeScript TSConfig: https://www.typescriptlang.org/tsconfig/
- Zod docs: https://zod.dev/

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

| Skill | Description | Path |
|-------|-------------|------|
| impeccable | Use when the user wants to design, redesign, shape, critique, audit, polish, clarify, distill, harden, optimize, adapt, animate, colorize, extract, or otherwise improve a frontend interface. Covers websites, landing pages, dashboards, product UI, app shells, components, forms, settings, onboarding, and empty states. Handles UX review, visual hierarchy, information architecture, cognitive load, accessibility, performance, responsive behavior, theming, anti-patterns, typography, fonts, spacing, layout, alignment, color, motion, micro-interactions, UX copy, error states, edge cases, i18n, and reusable design systems or tokens. Also use for bland designs that need to become bolder or more delightful, loud designs that should become quieter, live browser iteration on UI elements, or ambitious visual effects that should feel technically extraordinary. Not for backend-only or non-UI tasks. | `.agents/skills/impeccable/SKILL.md` |
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
