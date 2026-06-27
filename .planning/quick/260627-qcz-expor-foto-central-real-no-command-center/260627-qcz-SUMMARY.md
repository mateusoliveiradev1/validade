---
status: complete
completed: 2026-06-27
commit: pending
---

# Quick Task 260627-qcz: Expor foto central real no Command Center - Summary

## Resultado

O Command Center web agora mostra uma "Foto da central" antes dos graficos e funis operacionais.

- Contrato/API expõem `centralSnapshot` com origem, readiness, cache, contagem de produtos, rascunhos, lotes, tarefas, conflitos, descartes, histórico resolvido, comandos pendentes e bloqueios.
- O web destaca quando ha 0 lotes centrais e explica que outro aparelho tambem vera 0 lotes se a central nao tem lote salvo.
- O veredito da API nao trata catalogo/produto central sem lote como area segura.
- Nenhuma migration nova foi criada ou aplicada.

## Deploy

- API staging publicada no Worker `validade-zero-api-staging`, versão `847b73f2-d1b4-4125-9f91-c7f2b081b122`.
- Web publicada na Vercel e aliased para `https://validade-five.vercel.app`.

## Verificacao

- `pnpm.cmd --filter @validade-zero/contracts test -- command-center` - passou.
- `pnpm.cmd --filter @validade-zero/api test -- command-center sync` - passou, 69 testes.
- `pnpm.cmd --filter @validade-zero/web test -- command-center` - passou, 31 testes.
- `pnpm.cmd test:e2e:web -- v1-readiness` - passou, 6 testes.
- Playwright desktop 1366x900 e mobile 390x844 com fixture de 0 lotes centrais - passou sem overflow horizontal.
- `pnpm.cmd check` - passou: 513 testes, 267 smokes, build, lint, format, seguranca e performance budgets.
- Health externo do Worker staging - 200.
- Home externa da Vercel - 200.
- Neon staging: `central_products=1`, `central_product_drafts=1`, `central_lots=0`, `central_observations=0`, `active_tasks=0`, `sync_conflicts=0`, `device_snapshots=2`.
