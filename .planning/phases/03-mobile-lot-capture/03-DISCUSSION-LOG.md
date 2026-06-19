# Phase 3: Mobile Lot Capture - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-06-19T12:38:21.2651051-03:00
**Phase:** 3-Mobile Lot Capture
**Areas discussed:** Cadastro guiado, Produto e lote, Movimentacao fisica, Consulta apos registro

---

## Cadastro guiado

| Option | Description | Selected |
|--------|-------------|----------|
| Assistencia com confirmacao | Scanner busca ou preenche produto e exige conferencia manual; desconhecido abre cadastro minimo. | [x] |
| Scanner como fluxo principal | Leitura avanca automaticamente. | |
| Cadastro manual como principal | Codigo apenas consulta produto ja escolhido. | |

**User's choice:** Assistencia com confirmacao.
**Notes:** Categoria aplica perfil padrao; dados essenciais bloqueiam lote confirmado; novo lote repete somente o contexto de produto e exige confirmar os dados do lote.

---

## Produto e lote

| Option | Description | Selected |
|--------|-------------|----------|
| Busca rapida com atalhos | Buscar nome ou codigo, com recentes ou frequentes e categoria como apoio. | [x] |
| Categorias primeiro | Escolher categoria antes da lista de produtos. | |
| Somente busca textual | Exigir nome ou codigo sempre. | |

**User's choice:** Busca rapida com atalhos.
**Notes:** Fornecedor e GTIN podem ficar pendentes; lote sem codigo impresso recebe ID interno; datas usam digitacao guiada, validacao e leitura operacional imediata.

---

## Movimentacao fisica

| Option | Description | Selected |
|--------|-------------|----------|
| Acao observada primeiro | Escolher resultado observado e pedir somente campos pertinentes. | [x] |
| Local primeiro | Escolher local antes do resultado. | |
| Confirmacao generica | Registrar um ok e detalhar depois. | |

**User's choice:** Acao observada primeiro.
**Notes:** Locais padronizados aceitam excecao identificada; quantidade aproximada e confirmada ou mantem incerteza; acoes sensiveis exigem confirmacao reforcada.

---

## Consulta apos registro

| Option | Description | Selected |
|--------|-------------|----------|
| Lista operacional recente | Ultimos registros com detalhe ao tocar. | [x] |
| Painel por indicadores | Numeros e graficos por local ou categoria. | |
| Sem lista inicial | Apenas busca manual. | |

**User's choice:** Lista operacional recente.
**Notes:** Correcoes criam nova observacao; busca por produto, codigo ou lote filtra por local; apenas pendencias, incerteza e risco critico ou vencido ganham destaque.

---

## Discricionariedade do agente

Nenhuma decisao foi delegada ao agente.

## Deferred Ideas

- OCR de etiquetas e cadastro em grade ficam para avaliacao futura.
- Evidencias, auditoria completa e roles ficam na Fase 8.
- Tarefas, tela Hoje, push e escalonamento ficam nas Fases 4 e 5.
