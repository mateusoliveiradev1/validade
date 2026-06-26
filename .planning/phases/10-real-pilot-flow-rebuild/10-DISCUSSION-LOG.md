# Phase 10: Real Pilot Flow Rebuild - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-06-26T19:19:51.9164794-03:00
**Phase:** 10-real-pilot-flow-rebuild
**Areas discussed:** Segundo aparelho e verdade central, Produto unico sem duplicata acidental, Baixa terminal de lote/tarefa, Estados de sync no mobile e web, Fechamento de turno funcional, RBAC e acesso por conta, Push para equipe e escalonamento

---

## Segundo aparelho e verdade central

| Decision | Options considered | Selected |
|----------|--------------------|----------|
| Initial load on another Android | Pacote operacional do turno; espelho amplo da loja; minimo para operar agora | Pacote operacional do turno |
| Resolved lots on another device | Some da fila ativa e aparece no historico curto; continua como resolvido hoje; some totalmente do mobile | Some da fila ativa e aparece no historico curto |
| New device without first sync | Bloquear ate conectar uma vez; permitir registro local avulso; mostrar so explicacao/contato | Bloquear ate conectar uma vez |
| Divergent device states | Leitura central pendente; dados deste aparelho; atualize para confirmar | Leitura central pendente |
| Start-of-shift path | Preparar turno; Hoje com preparo em segundo plano; Registrar lote direto | Preparar turno |
| First operational screen | Hoje como cockpit; Registrar lote; menu de caminhos | Hoje como cockpit |
| Hoje action order | Criticas primeiro e registro logo abaixo; registrar fixo; acoes iguais | Criticas primeiro e registro logo abaixo |

**User's choice:** Selected the recommended path for all questions.
**Notes:** The user challenged whether the discussion was "perfect" enough for the whole app, which expanded this area from second-device sync into the full operational spine: preparar turno -> Hoje -> registro -> resolucao -> sync -> fechamento.

---

## Produto unico sem duplicata acidental

| Decision | Options considered | Selected |
|----------|--------------------|----------|
| Registration flow | Produto primeiro; lote primeiro; tela unica produto+lote | Produto primeiro |
| Categories | Catalogo central no banco; categorias fixas no app; campo livre com sugestoes | Catalogo central no banco |
| Duplicate prevention | Comparar produtos semelhantes; bloquear nome parecido; permitir e resolver depois | Comparar produtos semelhantes |
| Who creates product | Colaborador cria rascunho e lideranca valida; so lideranca/admin; qualquer colaborador definitivo | Rascunho operacional |
| Lot on unvalidated product | Risco conservador; escondido ate validar; regra padrao sem aviso | Risco conservador |
| Where product review happens | Command Center + aviso em Hoje; so Command Center; so mobile da lideranca | Command Center + aviso em Hoje |

**User's choice:** Selected the recommended path for all questions.
**Notes:** The user explicitly called out category friction: "toda hora ter q escrever as categorias"; this locked central category catalog as part of the phase.

---

## Baixa terminal de lote/tarefa

| Decision | Options considered | Selected |
|----------|--------------------|----------|
| Loss/withdrawal sequence | Terminal + destino/motivo + reconferencia; terminal resolves everything; photo always required | Terminal + destino/motivo + reconferencia |
| Where resolved lots appear | Historico curto + auditoria/Command Center; Resolvidos hoje fixed; deep audit only | Historico curto + auditoria/Command Center |
| Offline terminal action before ack | Local progress + central block pending; keep active normal; hide and return on conflict | Local progress + central block pending |
| Which actions remove active risk | Only actions that remove sales-area risk; any observation; only loss/withdrawal | Only actions that remove sales-area risk |
| Provavel esgotado/nao encontrado | Guided recheck required; direct resolution; leadership-only pendency | Guided recheck required |
| Correction/reversal | Reopen with audit trail; edit previous fact; create new lot/product | Reopen with audit trail |

**User's choice:** Selected the recommended path for all questions.
**Notes:** The user asked whether everything must be auditable in the database and "sumir real do app"; the locked answer is yes for active queues after central ack, no for audit/history.

---

## Estados de sync no mobile e web

| Decision | Options considered | Selected |
|----------|--------------------|----------|
| Visible state taxonomy | Local/Pendente central/Sincronizado/Conflito/Descartado/Resolvido; Pendente/Enviado/Erro/Resolvido; Offline/Online/Erro/Ok | Local/Pendente central/Sincronizado/Conflito/Descartado/Resolvido |
| State allowing area safe | Only Resolvido + ack + no blocks; Sincronizado; Pendente central with warning | Only Resolvido + ack + no blocks |
| Visual priority | Conflito > Pendente central critico > Tarefa critica ativa > Local > Resolvido; task-first; chronological | Conflito-first priority |
| Command Center and unseen local pendencies | Do not invent; forecast from last known; show no pendency until received | Do not invent |
| Discarded action | Motivo obrigatorio + historico; remove silently; conflict forever | Motivo obrigatorio + historico |

**User's choice:** Selected the recommended path for all questions.
**Notes:** "Sincronizado" was clarified as central acceptance, not proof of operational resolution.

---

## Fechamento de turno funcional

| Decision | Options considered | Selected |
|----------|--------------------|----------|
| First step | Revalidate central reading; show local verdict immediately; manual checklist first | Revalidate central reading |
| Safe-close blockers | All operational blockers; only expired/critical; leadership override | All operational blockers |
| Closing with blockers | Close with assumed pendencies; force safe with reason; do not close | Close with assumed pendencies |
| Before safe close | Guided physical checklist; automatic close; photo of all areas | Guided physical checklist |
| After close display | Audit receipt in app and Command Center; status only; Command Center only | Audit receipt |

**User's choice:** Selected the recommended path for all questions.
**Notes:** Fechamento de turno was initially raised by the user as something still not functional and was pulled into this phase because it completes the area-safe truth loop.

---

## RBAC e acesso por conta

| Decision | Options considered | Selected |
|----------|--------------------|----------|
| What another account sees | Same store truth filtered by role; only self-created data; everyone sees/does everything | Same store truth filtered by role |
| Role model | Colaborador executes, leadership validates/closes, admin administers; leadership/admin equal; collaborator heavily restricted | Colaborador executes, leadership validates/closes, admin administers |
| Revocation timing | Next session/sync revalidation; next login; reinstall/clear cache | Next session/sync revalidation |

**User's choice:** Selected the recommended path for all questions.
**Notes:** The user asked directly whether another account will see lots and everything. The locked answer is same central store truth, filtered by role and store.

---

## Push para equipe e escalonamento

| Decision | Options considered | Selected |
|----------|--------------------|----------|
| Recipients for critical/expired risk | Responsible + shift team + leadership escalation; everyone always; leadership only | Responsible + shift team + leadership escalation |
| Second account receiving push | After device registration and shift participation sync; only new tasks; replay all immediately | After registration and shift participation sync |
| Push failure/not opened | Task remains visible and escalates by rule; resend until opened; mark notified and continue | Task remains visible and escalates by rule |

**User's choice:** Selected the recommended path for all questions.
**Notes:** Push remains a charge channel. It never proves execution and never marks area safe.

---

## the agent's Discretion

- The exact UI composition, route names, endpoint shape, schema/migration details, event names, final microcopy, cache policy, sync batching and UAT implementation are left to planning.
- The planner may not weaken central truth, RBAC by store, terminal-resolution auditability, push semantics or safe-close rules.

## Deferred Ideas

None - discussion stayed within phase scope.
