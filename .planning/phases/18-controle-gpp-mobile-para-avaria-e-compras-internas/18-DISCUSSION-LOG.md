# Phase 18: Controle GPP Mobile para avaria e compras internas - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-07-02T23:25:25.5488676-03:00
**Phase:** 18-controle-gpp-mobile-para-avaria-e-compras-internas
**Areas discussed:** Entrada mobile do Controle GPP, Registro de avaria no mobile, Compra interna no mobile, Offline e pendente neste aparelho

---

## Entrada mobile do Controle GPP

| Option | Description | Selected |
|--------|-------------|----------|
| GPP direto | GPP users open directly into Controle GPP; collaborators keep opening in Hoje. | yes |
| Hoje primeiro | Everyone opens in Hoje and reaches GPP through a shortcut. | |
| Voce decide | Let the agent choose the option most consistent with Phase 17. | |

**User's choice:** GPP direto.
**Notes:** The user also asked to always show the recommended option during discussion.

| Option | Description | Selected |
|--------|-------------|----------|
| Atalho separado no app | Hoje remains first for collaborators/leads, with a clear Controle GPP entry in the app shell/actions. | yes |
| Dentro de Hoje | GPP buttons appear inside Hoje. | |
| So por Ajustes/menu | GPP is reachable only through settings/menu. | |

**User's choice:** Atalho separado no app.
**Notes:** Keeps validity operation and GPP operation separated.

| Option | Description | Selected |
|--------|-------------|----------|
| Hub de acoes | First Controle GPP screen shows Registrar avaria, Solicitar compra interna, Minhas pendencias, and Enviadas hoje. | yes |
| Formulario de avaria direto | Opens directly to avaria registration. | |
| Minhas pendencias primeiro | Opens with pending items/status first. | |

**User's choice:** Hub de acoes.
**Notes:** Hub matches Phase 18 success criteria.

| Option | Description | Selected |
|--------|-------------|----------|
| Esconder a entrada | Hide Controle GPP when feature flag/capability is missing. | yes |
| Mostrar bloqueado | Show disabled entry with reason. | |
| Mostrar e negar ao enviar | Show for everyone and rely on backend denial. | |

**User's choice:** Esconder a entrada.
**Notes:** Backend authorization still remains mandatory.

---

## Registro de avaria no mobile

| Option | Description | Selected |
|--------|-------------|----------|
| Formulario guiado em passos curtos | Product/code, quantity/unit, destination/finality, review and central submission. | yes |
| Formulario unico compacto | All fields on one compact screen. | |
| Comecar por destino/finalidade | User starts by choosing baixa/reaproveitamento/producao/transferencia. | |

**User's choice:** Formulario guiado em passos curtos.
**Notes:** Better fit for one-hand corridor use and reduces field errors.

| Option | Description | Selected |
|--------|-------------|----------|
| Codigo primeiro, nome como apoio | Product code is primary; name/description confirms the item. | yes |
| Nome primeiro, codigo depois | Product name leads and code is collected later. | |
| Busca igual ao cadastro de lote | Reuse the product/lot discovery flow. | |

**User's choice:** Codigo primeiro, nome como apoio.
**Notes:** GPP needs product code for baixa and grouping.

| Option | Description | Selected |
|--------|-------------|----------|
| Quantidade + unidade obrigatorias | Require numeric quantity and unit. | yes |
| Quantidade obrigatoria, unidade sugerida | Quantity required with default/suggested unit. | |
| Texto livre | Allow text like "meia caixa". | |

**User's choice:** Quantidade + unidade obrigatorias.
**Notes:** Supports saldo and baixa correctness.

| Option | Description | Selected |
|--------|-------------|----------|
| As 4 opcoes da fase 17 | Baixa GPP, Reaproveitamento, Producao interna, Transferencia. | yes |
| So Baixa GPP no primeiro release | Only baixa GPP initially. | |
| Baixa GPP + Outro | Baixa plus freeform other. | |

**User's choice:** As 4 opcoes da fase 17.
**Notes:** Keeps mobile aligned with central GPP contracts.

---

## Compra interna no mobile

| Option | Description | Selected |
|--------|-------------|----------|
| Descricao/nome primeiro, codigo opcional | Sector can request by description; GPP confirms/corrects code later. | yes |
| Codigo obrigatorio tambem | Internal purchase requires code. | |
| Catalogo/busca central primeiro | Search central catalog before request. | |

**User's choice:** Descricao/nome primeiro, codigo opcional.
**Notes:** Matches GPP-08 and Phase 17 purchase request contracts.

| Option | Description | Selected |
|--------|-------------|----------|
| Descricao + quantidade/unidade + finalidade | Minimum actionable request data. | yes |
| Descricao + quantidade apenas | Faster but loses purpose. | |
| Descricao + finalidade apenas | Purpose without quantity. | |

**User's choice:** Descricao + quantidade/unidade + finalidade.
**Notes:** Keeps requests actionable without product code.

| Option | Description | Selected |
|--------|-------------|----------|
| So depois da central confirmar | Show success only after central acknowledgement. | yes |
| Sucesso otimista imediato | Show success immediately and correct later. | |
| Tela de protocolo detalhado | Show protocol/audit details after submit. | |

**User's choice:** So depois da central confirmar.
**Notes:** Preserves central-first truth from Phase 17.

| Option | Description | Selected |
|--------|-------------|----------|
| Acompanhar status simples | Enviada, Atendida, Parcial, Sem produto, Cancelada with item/time. | yes |
| Mostrar detalhe completo do atendimento GPP | Full GPP attendance details. | |
| Nao mostrar depois de enviada | Remove from mobile after send. | |

**User's choice:** Acompanhar status simples.
**Notes:** Gives sector feedback without making mobile the full web GPP workbench.

---

## Offline e pendente neste aparelho

| Option | Description | Selected |
|--------|-------------|----------|
| Sim, mas so offline real | Save locally only when central is unreachable because the device is offline. | yes |
| Nao, bloquear tudo sem central | Block all GPP writes without central. | |
| Salvar local sempre que central falhar | Save locally on any central failure. | |

**User's choice:** Sim, mas so offline real.
**Notes:** Central validation/auth/business errors must remain visible failures.

| Option | Description | Selected |
|--------|-------------|----------|
| Pendente neste aparelho explicito | Make clear central/GPP has not received it yet. | yes |
| Salvo para enviar depois | Friendlier but less explicit. | |
| Registrado offline | Shorter but can imply completion. | |

**User's choice:** Pendente neste aparelho explicito.
**Notes:** Exact copy captured for context.

| Option | Description | Selected |
|--------|-------------|----------|
| Fila com retry manual e automatico seguro | Automatic retry when online plus manual Sincronizar, using idempotency. | yes |
| So retry manual | User must explicitly retry. | |
| So automatico em background | App retries without a manual path. | |

**User's choice:** Fila com retry manual e automatico seguro.
**Notes:** Must not duplicate central records.

| Option | Description | Selected |
|--------|-------------|----------|
| Virar conflito revisavel | Keep visible with reason and allow correction/retry or discard with justification. | yes |
| Descartar automaticamente | Remove rejected item automatically. | |
| Manter tentando indefinidamente | Keep retrying impossible records. | |

**User's choice:** Virar conflito revisavel.
**Notes:** Preserves the physical fact and makes central rejection actionable.

---

## the agent's Discretion

- The user did not choose any "Voce decide" option.
- Planner discretion remains for exact component boundaries, route names, local storage shape, queue adapter implementation, and final copy variants that preserve the locked semantics.

## Deferred Ideas

- Phase 19 owns creating GPP-linked records from Hoje after validity task resolution.
- Phase 20 owns realtime for Hoje.
- Making mobile the primary GPP baixa/attendance surface is outside Phase 18.
