# Phase 15: Operational Surface Distillation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-06-30T00:56:45.5393508-03:00
**Phase:** 15-operational-surface-distillation
**Areas discussed:** Entrada lote-primeiro, Classificador humano do produto, Rebaixa e validade, Loja vazia e primeiro lote real, Readiness compacta vs bloqueio real

---

## Entrada lote-primeiro

| Option | Description | Selected |
|--------|-------------|----------|
| Busca focada | Mostra so busca e leitura de codigo; criacao aparece apenas apos resultado sem reaproveitamento seguro. | yes |
| Busca com recentes | Mantem recentes/frequentes como atalhos discretos, mas ainda sem categoria/criacao antes da busca. | |
| Agente decide | O planejamento escolhe o menor ajuste que cumpra o SPEC e os testes existentes. | |

**User's choice:** Accepted the recommended option after asking for recommendations across all areas.
**Notes:** Recommendation was based on `15-SPEC.md`, Phase 13/14 context, and code scout showing `ProductDiscoveryScreen` currently gives search, scan, recent, frequent, category, and create-product similar weight.

---

## Classificador humano do produto

| Option | Description | Selected |
|--------|-------------|----------|
| Pergunta guiada antes da categoria | Render `Como esse produto esta na loja?` with the SPEC classifier choices before any category list. | yes |
| Categoria primeiro | Keep category selection first and infer policy from category. | |
| Agente decide | Let planning decide the smallest compliant UI adjustment. | |

**User's choice:** Accepted the recommended option.
**Notes:** This protects operators from technical profile names and makes product policy understandable before category refinement.

---

## Rebaixa e validade

| Option | Description | Selected |
|--------|-------------|----------|
| Politica explicita, copy humana | Keep deterministic policy in code but show only operator language for next action. | yes |
| Mode labels in UI | Continue exposing technical modes and explain them better. | |
| Agente decide | Let planning decide copy and policy boundaries. | |

**User's choice:** Accepted the recommended option.
**Notes:** `Outro/nao sei` must stay conservative: capture is allowed, silent rebaixa is not. Rebaixa remains a pre-expiry commercial task, not an expired/unsafe action.

---

## Loja vazia e primeiro lote real

| Option | Description | Selected |
|--------|-------------|----------|
| Primeiro-lote assistido | Treat empty central store as expected setup and lead to `Registrar lote`. | yes |
| Review/error copy | Keep current review-looking copy until products exist. | |
| Agente decide | Let planning tune the exact prepare-turn copy. | |

**User's choice:** Accepted the recommended option.
**Notes:** Empty store is not proof of safe area. It is a guided start state for real operation.

---

## Readiness compacta vs bloqueio real

| Option | Description | Selected |
|--------|-------------|----------|
| Ajustes owns details, Hoje shows impact | Healthy diagnostics stay compact or in Ajustes; blocker cards appear only when operation/safe-close/validation is affected. | yes |
| Hoje shows diagnostics prominently | Keep visible diagnostic cards on Hoje even when healthy. | |
| Agente decide | Let planning choose exact rendering thresholds. | |

**User's choice:** Accepted the recommended option.
**Notes:** This carries forward Phase 13/14 decisions: Operacao and Hoje are daily operation surfaces; Aparelhos, Atualizacoes, Validacao, and Ajustes own detailed diagnostics.

---

## the agent's Discretion

- Exact component boundaries, module names, policy module location, and extraction strategy for shared readiness vocabulary.
- Whether recent/frequent lookup remains as secondary UI, as long as search/scan is primary and product creation stays behind no-safe-reuse.

## Deferred Ideas

None - discussion stayed within phase scope.
