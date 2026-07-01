# Phase 16: Loja 18 Validation Runbook and Go/No-Go Proof - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-07-01T07:24:44-03:00
**Phase:** 16-Loja 18 Validation Runbook and Go/No-Go Proof
**Areas discussed:** Roteiro no corredor, Evidencia publica segura, Gates externos honestos, Veredito Go/No-Go

---

## Roteiro no corredor

| Option | Description | Selected |
|--------|-------------|----------|
| Sequencia guiada obrigatoria | Seguir uma ordem clara, so avancando quando o passo anterior estiver passado ou marcado como bloqueio externo. | yes |
| Checklist flexivel por blocos | Lideranca pode executar em qualquer ordem, e a tela consolida o que falta. | |
| Hibrido | Produto/lote/tarefa/fechamento seguem ordem obrigatoria, mas push, camera, update/build e segundo aparelho podem ser provados quando der. | |

**User's choice:** Sequencia guiada obrigatoria
**Notes:** The runbook should avoid confusing "test done" with "rollout proven."

| Option | Description | Selected |
|--------|-------------|----------|
| Web Validacao conduz, mobile executa | Lideranca acompanha a sequencia no web; operador usa os fluxos reais no mobile. | yes |
| Modo Validacao dentro do mobile | O proprio celular mostra o roteiro passo a passo. | |
| Runbook/documento fora do app | Gera um roteiro claro para seguir manualmente, e o app so mostra os estados. | |

**User's choice:** Web Validacao conduz, mobile executa
**Notes:** Keeps validation separate from the daily corridor flow.

| Option | Description | Selected |
|--------|-------------|----------|
| Automatico quando a central consegue provar | Preparar turno, build, segundo aparelho, tarefa resolvida, Command Center e fechamento passam por leitura central. | yes |
| Lideranca marca manualmente no web | Mais rapido para UAT real, but riskier as a source of truth. | |
| Misto com confirmacao manual so para prova externa | Central passes what it can; leadership records sanitized external status. | |

**User's choice:** Automatico quando a central consegue provar
**Notes:** Manual "passed" should not become rollout truth.

| Option | Description | Selected |
|--------|-------------|----------|
| Falha fechado e aponta a rota dona | Fica pendente, bloqueado ou bloqueio externo, com proximo passo para Aparelhos, Atualizacoes, Operacao ou execucao fisica. | yes |
| Permite avancar com observacao da lideranca | Lideranca pode seguir o roteiro registrando nota sanitizada, mesmo sem prova central. | |
| Pausa o roteiro inteiro | Qualquer etapa sem prova trava tudo ate ser resolvida. | |

**User's choice:** Falha fechado e aponta a rota dona
**Notes:** The runbook should keep moving only through proven states or honest blockers.

---

## Evidencia publica segura

| Option | Description | Selected |
|--------|-------------|----------|
| Status sanitizado + etiqueta de referencia | Registra passou/bloqueado/externo, horario, rota dona, aparelho mascarado e etiqueta segura, sem foto/nome real. | yes |
| Resumo operacional um pouco mais rico | Registra tipo generico de produto/lote, mas nunca nome real. | |
| Evidencia real fora do repo com ponte segura | App/painel aponta para cofre externo/manual, repo guarda so etiqueta sanitizada. | |

**User's choice:** Status sanitizado + etiqueta de referencia
**Notes:** Public artifacts should prove enough for decision without exposing store material.

| Option | Description | Selected |
|--------|-------------|----------|
| So confirmacao sanitizada | Passos passam apenas se a central observar fatos reais, mas o registro publico fica sem nome do produto, lote legivel ou foto. | yes |
| Categoria generica e politica | Registra modo generico sem nome real. | |
| Hash ou codigo mascarado | Registra identificador irreversivel ou mascarado para comparacao futura. | |

**User's choice:** So confirmacao sanitizada
**Notes:** The phase proves the real flow, not a public inventory of Loja 18.

| Option | Description | Selected |
|--------|-------------|----------|
| Nunca guardar foto real no repo; so status sanitizado | Camera passa quando aparelho aprovado registra evidencia ou motivo sem foto, mas o publico ve so etiqueta/estado. | yes |
| Permitir print/foto editada manualmente | Creates leakage risk. | |
| Manter camera sempre como bloqueio externo na v1.1 | Does not attempt to pass camera in this phase. | |

**User's choice:** Nunca guardar foto real no repo; so status sanitizado
**Notes:** The public proof is the safe event label, not the raw file.

| Option | Description | Selected |
|--------|-------------|----------|
| Mascarar tudo e usar papeis genericos | Aparelho como Aparelho Loja 18 #1 and usuario como Operacao Loja 18 or Lideranca Loja 18. | yes |
| Mostrar primeiro nome/funcao | Helps recognition, but may become personal data. | |
| Nao mostrar aparelho nem ator | Strong privacy, but weakens second-device and authorship proof. | |

**User's choice:** Mascarar tudo e usar papeis genericos
**Notes:** Use role/device labels instead of real person or raw device data.

---

## Gates externos honestos

| Option | Description | Selected |
|--------|-------------|----------|
| Somente por aparelho real reportando build aprovado | Precisa aparecer na leitura central com versao/build compativel; APK gerado localmente sem instalacao real fica external_blocked. | yes |
| Build gerado ja conta parcialmente | Artefato local/EAS gerado conta como pronto para instalar, mas nao como instalado. | |
| Manual pela lideranca | Lideranca marca que instalou, com etiqueta sanitizada. | |

**User's choice:** Somente por aparelho real reportando build aprovado
**Notes:** Build generated and APK installed are separate truths.

| Option | Description | Selected |
|--------|-------------|----------|
| So com timeline de push seguro aceita/aberta em aparelho aprovado | Provider/local state precisa vir do aparelho/central. | yes |
| Provider accepted basta | Expo/provider accepted is enough even without device opening. | |
| Push nao precisa passar na v1.1 | Leaves push as an external blocker and proceeds without proving it. | |

**User's choice:** So com timeline de push seguro aceita/aberta em aparelho aprovado
**Notes:** Provider acceptance alone is not physical execution.

| Option | Description | Selected |
|--------|-------------|----------|
| Mesmo fato central visivel em outro aparelho aprovado | Segundo aparelho precisa preparar turno/ler central e mostrar produto/lote/tarefa/resolucao compativeis. | yes |
| Apenas aparecer como aparelho apto | Authorized and current build is enough. | |
| Web Command Center substitui segundo aparelho | Web seeing the fact is enough for convergence. | |

**User's choice:** Mesmo fato central visivel em outro aparelho aprovado
**Notes:** Web helps leadership but does not substitute mobile convergence.

| Option | Description | Selected |
|--------|-------------|----------|
| So quando todos os gates centrais e externos exigidos passaram | If APK, push, camera, second device, or close lack proof, validation stays Aguardando prova externa or No-Go. | yes |
| Pode passar com blockers documentados | Operation can pass even with push/camera still external. | |
| Separar UAT operacional e rollout | Operation passes internally, but rollout Go/No-Go remains blocked. | |

**User's choice:** So quando todos os gates centrais e externos exigidos passaram
**Notes:** Phase 16 is the complete Go/No-Go proof for v1.1.

---

## Veredito Go/No-Go

| Option | Description | Selected |
|--------|-------------|----------|
| Todos os passos passaram e todos os aparelhos/gates estao aptos | Checklist completo, sem blocker critico/externo, build atual, segundo aparelho provado e fechamento seguro confirmado. | yes |
| Operacao principal passou | Produto/lote/tarefa/fechamento are enough; push/camera/update stay as observations. | |
| Go manual final da lideranca | System suggests, leadership confirms. | |

**User's choice:** Todos os passos passaram e todos os aparelhos/gates estao aptos
**Notes:** `Go` must be a strong, defensible claim.

| Option | Description | Selected |
|--------|-------------|----------|
| Bloqueio critico acionavel | Central read blocked, critical sync conflict, incompatible build, invalid authorization, unresolved task, unsafe close, or actionable blocked UAT step. | yes |
| Qualquer coisa faltando | Even missing external proof becomes No-Go. | |
| So falha operacional grave | Product/lot/task/close failure only; push/camera/APK excluded. | |

**User's choice:** Bloqueio critico acionavel
**Notes:** Missing external proof should not sound like operational failure.

| Option | Description | Selected |
|--------|-------------|----------|
| Quando nao ha bloqueio critico, mas falta prova externa ou etapa pendente | APK instalado, push remoto, camera, segundo aparelho fisico, UAT fisico or sanitized evidence still unproven. | yes |
| So quando depende de terceiro fora do time | Example Firebase/Expo/EAS; store-owned gaps become No-Go. | |
| Usar pouco; preferir No-Go | Everything that is not Go becomes No-Go. | |

**User's choice:** Quando nao ha bloqueio critico, mas falta prova externa ou etapa pendente
**Notes:** This is the honest waiting state.

| Option | Description | Selected |
|--------|-------------|----------|
| Operacional e direta, com proximo passo | Ainda nao e Go porque falta prova X. Faca Y em Z. Sem tom de culpa. | yes |
| Mais formal/auditavel | Criterio VAL-03 nao atendido; evidencia externa pendente. | |
| Mais forte/urgente | Rollout bloqueado ate resolver X. | |

**User's choice:** Operacional e direta, com proximo passo
**Notes:** The runbook should name the missing proof and the next action.

---

## the agent's Discretion

- Exact component boundaries, helper names, and plan slicing are left to planner discretion.
- Exact test layering is left to planner discretion, as long as VAL-01..VAL-04 and public-safe evidence boundaries are covered.

## Deferred Ideas

None - discussion stayed within phase scope.
