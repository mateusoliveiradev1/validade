# Phase 13: Web Operational Navigation and Readiness Surfaces - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-06-28T22:20:27.0893976-03:00
**Phase:** 13-Web Operational Navigation and Readiness Surfaces
**Areas discussed:** Primeira leitura do Command Center, Navegacao web, Aparelhos e atualizacoes, Validacao / Go-No-Go

---

## Primeira leitura do Command Center

| Option | Description | Selected |
|--------|-------------|----------|
| Operacao primeiro | Topo responde area segura, causas e proximas acoes; aparelhos aparecem so como resumo compacto permanente. | yes |
| Operacao + aparelhos | Topo mostra veredito operacional e prontidao de aparelhos com peso parecido. | |
| Tudo visivel | Mantem operacao, aparelhos, UAT e bloqueios bem expostos na mesma primeira tela. | |

**User's choice:** Operacao primeiro
**Notes:** The user also selected a short header strip for Aptos/Atencao/Bloqueados, strong daily blockers only when devices affect daily operation, and moving UAT/build/push-test detail out of the primary daily reading.

---

## Navegacao web

| Option | Description | Selected |
|--------|-------------|----------|
| Rotas no menu lateral | Operacao, Aparelhos, Atualizacoes, Validacao as durable shell routes. | yes |
| Abas dentro do Command Center | Keep side menu short and switch inside the Command Center. | |
| Pagina unica com ancoras | Keep one page with index/anchors and reorganized sections. | |

**User's choice:** Rotas no menu lateral
**Notes:** The user chose `Operacao` as the daily route name, menu order `Operacao -> Aparelhos -> Atualizacoes -> Validacao`, and fail-closed route capability behavior.

---

## Aparelhos e atualizacoes

| Option | Description | Selected |
|--------|-------------|----------|
| Lista por prontidao | Devices ordered Bloqueado, Atencao, Apto with cause and next action. | yes |
| Resumo por problemas | Group first by cause such as sync, push, camera, build, authorization. | |
| Um aparelho por vez | Focus on resolving the next blocking device before showing all. | |

**User's choice:** Lista por prontidao
**Notes:** The user chose to keep build/update artifact truth in `Atualizacoes`, allow APK QR/link only when public-safe and configured, and keep safe push-test action in `Aparelhos`.

---

## Validacao / Go-No-Go

| Option | Description | Selected |
|--------|-------------|----------|
| Sala de validacao de rollout | Checklist Loja 18, external gates, status, sanitized evidence, and next action. | yes |
| Painel de bloqueios | Focus primarily on blockers and causes. | |
| Roteiro operacional passo a passo | Guide execution of the real UAT in the store. | |

**User's choice:** Sala de validacao de rollout
**Notes:** The user chose explicit Go/No-Go gates, sanitized traceable evidence only, and validation that references actions in Aparelhos/Atualizacoes instead of duplicating them.

---

## the agent's Discretion

- Component extraction and route file organization are left to planning.
- The planner can decide whether to keep one shared Command Center data fetch or introduce route-specific presenters over the same projection.

## Deferred Ideas

None.
