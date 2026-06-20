---
status: resolved
trigger: "O atalho Recentes mostra apenas uma mensagem e não abre os lotes existentes"
created: 2026-06-19T21:40:00.0000000-03:00
updated: 2026-06-19T21:46:56.5851572-03:00
---

## Symptoms

- expected: "O atalho Recentes da busca inicial leva à lista de lotes existentes para consulta por produto, código ou lote."
- actual: "O atalho mostrava uma mensagem de apoio e mantinha a pessoa na busca de produtos."
- error_messages: "Nenhum erro técnico; a falha era de navegação e de expectativa operacional."
- timeline: "Observado durante o UAT da Fase 3 ao testar como consultar um lote já registrado."
- reproduction: "Na tela Localizar produto, tocar em Recentes."

## Current Focus

hypothesis: "ProductDiscoveryScreen reutilizava showShortcut para Recentes em vez de delegar a navegação para CaptureApp."
test: "Teste de componente pressiona Recentes e confirma o callback onOpenRecent."
expecting: "O botão chama onOpenRecent; CaptureApp muda para a tela recent."
next_action: "UAT: tocar em Recentes e confirmar que a lista Lotes recentes aparece."

## Evidence

- timestamp: 2026-06-19T21:40:00.0000000-03:00
  detail: "ProductDiscoveryScreen chamava showShortcut(captureCopy.recent), enquanto CaptureApp já possuía a tela recent."
- timestamp: 2026-06-19T21:46:56.5851572-03:00
  detail: "O teste de regressão confirmou que Recentes chama o callback de navegação em vez de renderizar a mensagem de atalho."

## Eliminated

[]

## Resolution

root_cause: "O atalho Recentes não tinha callback para a tela recent, apesar de essa tela já existir em CaptureApp."
fix: "ProductDiscoveryScreen aceita onOpenRecent e CaptureApp conecta o atalho à tela Lotes recentes."
verification: "pnpm --filter @validade-zero/mobile test; pnpm --filter @validade-zero/mobile typecheck; pnpm lint; pnpm format:check"
files_changed:
  - apps/mobile/src/capture/ProductDiscoveryScreen.tsx
  - apps/mobile/src/capture/CaptureApp.tsx
  - apps/mobile/src/capture/product-lookup.test.tsx
