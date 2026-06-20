# Phase 6: Markdown/Rebaixa Workflow - Context

**Gathered:** 2026-06-20T18:56:41.2002490-03:00
**Status:** Ready for planning

<domain>
## Phase Boundary

Esta fase transforma a tarefa simples de "Pedir rebaixa" em um workflow completo de markdown/rebaixa por lote. Ela deve acompanhar a solicitacao, aprovacao, aplicacao e conferencia final na area de venda, mantendo cada etapa visivel em "Hoje", com responsavel operacional, prazo, historico, evidencia operacional e escalonamento quando atrasar.

A Fase 6 nao implementa integracao com ERP, alteracao automatica de preco, RBAC formal, auditoria completa, armazenamento controlado de evidencias em R2, fila offline ou resolucao de conflitos. Essas capacidades continuam nas fases posteriores do roadmap. A evidencia desta fase prepara contrato e UX, mas permanece como metadado local seguro.

</domain>

<decisions>
## Implementation Decisions

### Quando a rebaixa nasce
- **D-01:** A rebaixa normal nasce quando o lote entra em `markdown_due`, usando a janela configurada de categoria/produto ja calculada pelo dominio.
- **D-02:** Pedido antecipado existe como excecao justificada e rastreavel. Ele nao substitui a regra normal, mas cobre situacoes reais como excesso, qualidade ruim, embalagem afetada ou orientacao operacional.
- **D-03:** Um colaborador pode sinalizar a excecao antecipada, mas a lideranca precisa aprovar para ela virar rebaixa de fato.
- **D-04:** Lote com presenca fisica incerta ou desatualizada nao pode abrir rebaixa diretamente. O app deve exigir "Conferir presenca" antes de criar ou avancar a solicitacao.
- **D-05:** Quando elegivel, a acao de rebaixa aparece em "Hoje" e tambem no detalhe do lote. "Hoje" continua sendo a fonte operacional da verdade, enquanto o detalhe do lote atende a pessoa que chegou pelo fluxo de consulta.

### Estados e responsaveis
- **D-06:** O workflow usa esteira bloqueada: `solicitada -> aprovada -> aplicada -> conferida_na_area_de_venda`. Cada etapa abre a proxima e impede marcar a rebaixa como resolvida sem confirmacao final.
- **D-07:** Colaborador solicita e registra aplicacao; lideranca aprova ou reprova; a conferencia final exige evidencia ou motivo explicito sem foto.
- **D-08:** Quando a rebaixa e aprovada, o app fecha a etapa de aprovacao e cria a tarefa "Aplicar rebaixa" para a equipe do turno. Isso evita depender de uma pessoa especifica antes da fase de roles formais.
- **D-09:** Quando a lideranca reprova a rebaixa, a solicitacao fecha com motivo obrigatorio e o lote volta ao monitoramento normal pelas regras de risco. A reprovacao nao deve ficar cobrando uma acao que a lideranca decidiu nao executar.

### Atrasos e cobranca
- **D-10:** Cada etapa tem prazo proprio. Aprovar, aplicar e conferir precisam poder ficar atrasadas separadamente, com copy e visual indicando onde o processo travou.
- **D-11:** Tarefas atrasadas de rebaixa usam a cadencia e o modelo de escalonamento da Fase 5. Atraso nunca resolve, silencia ou esconde a pendencia.
- **D-12:** Aplicacao atrasada e conferencia final atrasada cobram mais forte do que aprovacao atrasada, porque o produto pode continuar sem etiqueta correta ou sem confirmacao na area de venda.
- **D-13:** O fluxo usa uma tarefa ativa por etapa. Ao aprovar, fecha "Aprovar rebaixa" e abre "Aplicar rebaixa"; ao aplicar, abre "Conferir etiqueta na area de venda". O historico preserva a cadeia completa.
- **D-14:** A cobranca vai para o responsavel da etapa e escala para a lideranca quando passar do limite. Depois de escalada, segue cobrando responsavel e lideranca, conforme a decisao da Fase 5.

### Evidencia de etiqueta/prateleira
- **D-15:** O app solicita foto na aplicacao e na conferencia final. Na aplicacao, a foto representa a etiqueta/preco rebaixado; na conferencia final, representa a etiqueta junto do produto/local na area de venda.
- **D-16:** Foto e preferencial, nao absolutamente obrigatoria. Quando a foto nao puder ser feita, a pessoa precisa registrar motivo explicito, reaproveitando o padrao de reconferencia da area de venda.
- **D-17:** A evidencia nao pode ser generica. Ela deve apontar para etiqueta/preco aplicado e, na etapa final, para contexto de gondola suficiente para reduzir duvida sobre onde a rebaixa foi executada.
- **D-18:** Nesta fase, evidencia e metadado local seguro: placeholder de foto ou motivo sem foto no historico da etapa, sem guardar binario real em testes, fixtures ou repositorio. Storage real, controle de acesso e auditoria completa ficam para a Fase 8.

### Discricionariedade do agente
Nenhuma decisao foi delegada ao agente durante a discussao. O planejamento deve seguir as decisoes acima.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Escopo e requisitos
- `.planning/ROADMAP.md` - define a Fase 6, os requisitos MRK-01, MRK-02, MRK-03 e MRK-04 e os criterios de sucesso de solicitacao, aprovacao, aplicacao, conferencia, evidencia e atraso.
- `.planning/REQUIREMENTS.md` - define o grupo Markdown/Rebaixa, incluindo pedido de rebaixa, status solicitado/aprovado/aplicado/conferido, evidencia opcional e visibilidade/escalonamento de atrasos.
- `.planning/PROJECT.md` - define o valor central de zero vencidos na area de venda, a ausencia de integracao com vendas/estoque/ERP e a necessidade de confirmacao fisica.
- `AGENTS.md` - consolida as restricoes de custo zero, mobile-first, tipagem forte, dados seguros, qualidade e uso obrigatorio do fluxo GSD.

### Decisoes anteriores
- `.planning/phases/05-push-and-escalation/05-CONTEXT.md` - define que push/escalonamento cobra tarefas persistentes sem resolver, silenciar ou substituir confirmacao fisica.
- `.planning/phases/04-today-task-workflow/04-CONTEXT.md` - define `markdown_due` como tarefa acionavel, a tela "Hoje" como fonte operacional da verdade, tarefas por lote, resolucoes compativeis e evidencia operacional para reconferencia.
- `.planning/phases/03-mobile-lot-capture/03-CONTEXT.md` - define captura de lote, presenca fisica append-only, locais operacionais e a regra de que observacoes reais sustentam risco e execucao.
- `.planning/phases/02-domain-and-risk-core/02-CONTEXT.md` - define estados de risco, janelas de radar/rebaixa/critico/vencido, incerteza por presenca fisica e perfis por categoria/produto.

### Codigo existente
- `packages/domain/src/tasks.ts` - define `markdown_due`, `request_markdown`, prazos, prioridade e compatibilidade de resolucao que a Fase 6 deve estender para o ciclo de rebaixa.
- `packages/domain/src/alerts.ts` - define cadencia, publico de alerta e escalonamento reutilizados por tarefas atrasadas de rebaixa.
- `packages/contracts/src/tasks.ts` - define contratos de tarefas, resolucao, historico e `EvidencePromptMetadataSchema`; a Fase 6 deve evoluir contratos sem quebrar validacao runtime.
- `apps/mobile/src/capture/repository.ts` - define a fronteira `CaptureRepository`, criacao/resolucao de tarefas, reconferencia, evidencia e estados de alerta.
- `apps/mobile/src/capture/sqlite-repository.ts` - persiste tarefas locais, historico de resolucao, alert states e indices; a Fase 6 deve preservar a fonte local de verdade.
- `apps/mobile/src/capture/TodayScreen.tsx` - superficie operacional onde as etapas de rebaixa devem aparecer como tarefas claras e escalaveis.
- `apps/mobile/src/capture/TaskResolutionPanel.tsx` - fluxo atual de resolucao compativel e evidencia de reconferencia; a Fase 6 deve criar/ajustar UI especifica de rebaixa sem permitir resolucao magica.
- `apps/mobile/src/capture/today-copy.ts` - vocabulario PT-BR de "Hoje", incluindo "Pedir rebaixa", evidencias, atrasos e labels de alerta.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/domain/src/tasks.ts`: ja modela tarefas acionaveis por lote, `requiredResolution`, `dueBucket`, prioridade e `request_markdown`; a fase deve estender essa linguagem para etapas de workflow em vez de criar uma fila paralela opaca.
- `packages/domain/src/alerts.ts`: ja fornece cadencia `now`/`shift`/`today`/`follow_up`, audiencia responsavel/equipe/lideranca e escalonamento para `responsible_and_leadership`.
- `packages/contracts/src/tasks.ts`: ja possui `EvidencePromptMetadataSchema` com `photo_recorded_placeholder` e `no_photo_reason`, que combina com a decisao de metadado local seguro.
- `TaskResolutionPanel.tsx` e `today-copy.ts`: ja demonstram o padrao de bloquear acao incompativel, pedir confirmacao reforcada e usar copy direta em portugues operacional.

### Established Patterns
- O app mobile e local-first em SQLite; tarefas e historico local sao a fonte de verdade ate a fase de sync.
- Observacoes fisicas e resolucoes importantes sao append-only ou preservam historico, sem apagar fatos anteriores.
- A UI usa copy operacional, sem culpa, com acoes explicitas como "Pedir rebaixa", "Aplicar rebaixa" e "Conferir etiqueta".
- Evidencia real ainda nao deve entrar como binario no repositorio, fixtures ou testes. Use placeholders/metadados seguros ate a fase de storage/auditoria.
- `packages/domain` deve continuar puro, sem React Native, SQLite, Expo Push ou SDKs de provider.

### Integration Points
- A tarefa `request_markdown` em "Hoje" deve abrir o novo workflow, nao apenas fechar uma tarefa simples.
- O detalhe do lote precisa expor a mesma entrada de rebaixa quando o lote estiver elegivel ou quando houver excecao justificavel.
- Aprovacao/reprovacao e aplicacao devem produzir novas tarefas ou fechar tarefas existentes por etapa, preservando historico e alert state.
- A escalada de atraso deve reutilizar o pipeline de alertas da Fase 5 e nunca considerar push como prova de execucao.

</code_context>

<specifics>
## Specific Ideas

- Labels esperados: "Solicitar rebaixa", "Aprovar rebaixa", "Aplicar rebaixa", "Conferir etiqueta na area de venda", "Rebaixa atrasada".
- Pedido antecipado deve soar como excecao operacional, nao como atalho livre: a pessoa sinaliza e justifica, a lideranca decide.
- A evidencia final ideal mostra etiqueta/preco junto do produto/local, para evitar uma foto ambigua que nao prove onde a rebaixa foi aplicada.

</specifics>

<deferred>
## Deferred Ideas

- Integracao com ERP ou alteracao automatica de preco continua fora do v1.
- Armazenamento real de fotos, R2, controle de acesso, auditoria completa e roles formais pertencem a Fase 8.
- Fila offline, comandos idempotentes e conflitos de sincronizacao pertencem a Fase 7.
- Fechamento de turno e visao completa de seguranca pela lideranca pertencem a Fase 8.

</deferred>

---

*Phase: 6-Markdown/Rebaixa Workflow*
*Context gathered: 2026-06-20T18:56:41.2002490-03:00*
