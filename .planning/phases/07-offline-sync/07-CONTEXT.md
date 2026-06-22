# Phase 07: offline-sync - Context

**Gathered:** 2026-06-21T21:07:39.1488497-03:00
**Status:** Ready for planning

<domain>
## Phase Boundary

Esta fase torna a execucao mobile de tarefas confiavel quando a loja esta com internet ruim. Ela deve manter "Hoje" operavel com cache local de tarefas ativas e trechos essenciais dos lotes, registrar acoes fisicas como comandos offline idempotentes, sincronizar pendencias quando a conexao voltar e expor conflitos sem nunca marcar uma acao critica como confirmada no sistema em silencio.

A Fase 7 nao cria um dashboard separado de sync, nao implementa auditoria completa, RBAC formal, armazenamento real de fotos/R2, historico visual completo, fechamento de turno ou integracao com vendas/estoque/ERP. Sync e suporte para o trabalho de prateleira: "Hoje" continua sendo a fonte operacional da verdade.

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**0 numbered requirements are locked in a generic `## Requirements` section.** The found spec is `07-UI-SPEC.md`, which locks the approved UI and interaction contract for offline sync.

Downstream agents MUST read `07-UI-SPEC.md` before planning or implementing. Requirements are not duplicated here.

**In scope (from `07-UI-SPEC.md`):**
- Offline/sync state directly below the sales-area safety verdict in "Hoje".
- Explicit states for offline readiness, offline mode, local save, pending sync, syncing, synced, sync failure and sync conflict.
- Compact sync queue summary inside the mobile workflow.
- Conflict panel with local action, product, lote, local, local time, remote change and safe resolution choices.
- Persistent pending markers in task row, task panel feedback and queue summary.
- Startup behavior with cached "Hoje" content under poor connectivity.
- Retry and idempotency copy that does not expose command IDs as primary UI.

**Out of scope (from `07-UI-SPEC.md`):**
- Dashboard shell, network diagnostics screen, decorative connectivity illustration, map, chart, shadcn, web-only components or generic activity feed.
- Real photo storage, URI display, R2 uploads or audit-history UI from Phase 8.
- Desktop-style admin sync monitor.
- New third-party UI blocks, copied registry snippets or network-loaded UI assets.

</spec_lock>

<decisions>
## Implementation Decisions

### Dados offline
- **D-01:** O estado "Pronto para operar sem internet" exige cache local das tarefas ativas do turno e dos trechos essenciais dos lotes necessarios para executar essas tarefas: identidade do lote, produto, local atual, acao exigida, risco e ultimo estado conhecido.
- **D-02:** Atencao futura, lista ampla de lotes recentes e tudo que o aparelho ja conhece localmente nao entram como criterio para dizer que o trabalho offline esta pronto. Eles podem existir como dados locais, mas nao podem substituir o cache operacional de "Hoje".
- **D-03:** O cache fica desatualizado ao virar o turno ou apos algumas horas sem refresh. Quando desatualizado, as tarefas salvas continuam visiveis, mas o app deve avisar que e preciso sincronizar antes de marcar a area de venda como segura.
- **D-04:** Se o app abrir sem internet e sem cache de tarefas ativas, ele deve mostrar o estado "Conecte uma vez para preparar o trabalho offline" e manter registro local manual alcancavel quando essa superficie ja estiver disponivel.
- **D-05:** O aparelho prepara e atualiza o cache automaticamente ao abrir "Hoje", ao atualizar manualmente "Hoje" e apos mudancas locais como cadastro de lote ou observacao. Nao criar um fluxo separado obrigatorio de "preparar offline" na Fase 7.

### Comandos offline
- **D-06:** Todas as acoes de tarefa ja suportadas em "Hoje" podem ser registradas sem internet, incluindo retirada, perda, presenca, movimentacao, nao encontrado, provavelmente esgotado, pedido/etapas de rebaixa e reconferencia.
- **D-07:** Uma acao offline concluida e considerada feita fisicamente no aparelho, mas pendente no sistema. A UI deve reconhecer "Acao salva no aparelho" sem declarar confirmacao central ate a sincronizacao ser reconhecida.
- **D-08:** Acoes criticas offline sao permitidas, mas precisam passar pela confirmacao, evidencia ou motivo sem foto ja exigidos pelo fluxo normal. Elas permanecem como pendencia critica visivel ate sincronizar.
- **D-09:** Cada acao fisica gera um comando local unico e idempotente. Retentativas reenviam o mesmo comando, e a copy deve explicar operacionalmente: "Tentaremos novamente sem duplicar a acao."
- **D-10:** A fila nao deve agrupar comandos por tarefa descartando etapas intermediarias quando isso apagaria historico operacional ou a cadeia de decisoes que precisa ser sincronizada.

### Pendencia em Hoje
- **D-11:** O marcador "Pendente de sincronizacao" aparece na linha da tarefa, no feedback do painel de resolucao e no resumo da fila de sincronizacao. Pendencia nao pode ficar escondida so em icone, cor ou tela secundaria.
- **D-12:** Quando uma retirada, perda ou reconferencia critica foi salva offline mas ainda nao sincronizou, o topo de "Hoje" pode reconhecer o progresso local com ressalva explicita. Ele nao pode afirmar seguranca plena do sistema ate a sincronizacao concluir.
- **D-13:** O resumo da fila de sincronizacao e um painel compacto em "Hoje", diretamente abaixo do status offline/sync. Ele mostra contagem por urgencia, conflitos primeiro, pendencia critica mais antiga e a acao "Sincronizar pendencias".
- **D-14:** Nao criar tela separada ou dashboard de sincronizacao como superficie primaria da Fase 7. A fila deve ser operacional, curta e vinculada ao trabalho de prateleira.
- **D-15:** Quando uma acao pendente sincroniza com sucesso, remover o marcador pendente e mostrar feedback curto com horario, como "Sincronizado as {horario}." Nao manter lista visual de concluidos sincronizados, pois isso puxa auditoria/historico para Phase 8.

### Conflito e retry
- **D-16:** Conflitos criticos aparecem acima de qualquer pendencia normal. Isso inclui conflitos ligados a vencido/critico, retirada, perda, rebaixa aplicada/conferida, reconferencia critica e qualquer acao que altere a seguranca da area de venda.
- **D-17:** Falha de sync sem conflito claro usa retry automatico limitado e botao manual visivel. A pendencia continua na fila e o app nunca usa retry silencioso para esconder risco.
- **D-18:** Quando o estado remoto mudou enquanto o aparelho estava offline, o conflito deve oferecer escolhas explicitas quando forem seguras: manter acao local e reenviar, atualizar pela tarefa atual ou descartar acao offline com motivo.
- **D-19:** Descartar acao offline exige confirmacao reforcada e motivo obrigatorio sempre que a acao for critica ou terminal, incluindo retirada, perda, rebaixa aplicada/conferida, reconferencia critica e presenca que muda a leitura de seguranca.
- **D-20:** O conflito deve nomear a acao local, produto, lote, local, horario local e o que mudou remotamente. A decisao humana vem antes de qualquer alteracao que possa afetar seguranca.

### the agent's Discretion
Nenhuma decisao foi delegada ao agente durante a discussao. O planejamento deve seguir as decisoes acima e o contrato aprovado em `07-UI-SPEC.md`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Escopo e requisitos
- `.planning/ROADMAP.md` - define a Fase 7, os requisitos SYN-01, SYN-02 e SYN-03 e os criterios de sucesso de cache, comandos idempotentes, conflitos explicitos e visibilidade de pendencias.
- `.planning/REQUIREMENTS.md` - define o grupo Offline and Sync e reforca que a operacao essencial deve continuar com conexao instavel por meio de fila offline sincronizavel.
- `.planning/PROJECT.md` - define o valor central de zero vencidos na area de venda e a regra de que confirmacao fisica, tarefas persistentes, alertas e escalonamento trabalham juntos.
- `AGENTS.md` - consolida as restricoes de custo zero, mobile-first, tipagem forte, qualidade, seguranca e uso obrigatorio do fluxo GSD.
- `.planning/research/STACK.md` - define Expo/React Native, Expo SQLite + outbox sync, Hono/Cloudflare, Neon, Zod/Hono RPC e os limites de custo zero.

### Contrato aprovado da fase
- `.planning/phases/07-offline-sync/07-UI-SPEC.md` - contrato visual e de interacao aprovado para offline sync; downstream MUST follow state labels, pending/conflict placement, queue summary, copy, spacing, color, accessibility and out-of-scope boundaries.

### Decisoes anteriores
- `.planning/phases/06-markdown-rebaixa-workflow/06-CONTEXT.md` - define o workflow de rebaixa, evidencia como metadado local seguro e que storage real/auditoria ficam para Phase 8.
- `.planning/phases/05-push-and-escalation/05-CONTEXT.md` - define que push e escalonamento cobram tarefas persistentes sem resolver, silenciar ou substituir confirmacao fisica.
- `.planning/phases/04-today-task-workflow/04-CONTEXT.md` - define "Hoje" como fonte operacional da verdade, tarefa por lote, resolucao compativel, reconferencia de area de venda e evidencia/motivo sem foto.
- `.planning/phases/03-mobile-lot-capture/03-CONTEXT.md` - define captura mobile, observacoes fisicas append-only, locais operacionais e base local para presenca fisica.
- `.planning/phases/02-domain-and-risk-core/02-CONTEXT.md` - define estados de risco, incerteza por presenca fisica e regra de que incerteza nao vira seguranca silenciosa.

### Codigo existente
- `apps/mobile/src/capture/repository.ts` - fronteira `CaptureRepository` atual para tarefas, rebaixa, alertas, push-open e SQLite; Phase 7 deve estender a interface sem quebrar contratos existentes.
- `apps/mobile/src/capture/sqlite-repository.ts` - persistencia local de produtos, lotes, observacoes, tarefas, workflows de rebaixa e estados de alerta; ponto principal para cache, fila offline e estado de sync.
- `apps/mobile/src/capture/sqlite-migrations.ts` - padrao atual para migracoes idempotentes de tabelas locais.
- `apps/mobile/src/capture/TodayScreen.tsx` - superficie onde status offline/sync, pendencias, conflitos e resumo compacto da fila devem aparecer sem deslocar o veredito de seguranca.
- `apps/mobile/src/capture/TaskResolutionPanel.tsx` - fluxo que registra acoes fisicas, confirmacoes reforcadas e evidencia/motivo; Phase 7 deve salvar comandos offline sem trocar o CTA fisico por "sync".
- `apps/mobile/src/capture/today-copy.ts` - vocabulario operacional PT-BR para "Hoje", alertas, rebaixa, evidencia e acoes de tarefa; Phase 7 deve acrescentar copy de sync nesse estilo.
- `packages/contracts/src/tasks.ts` - contratos Zod para tarefas, resolucao e evidencia; comandos offline precisam manter validacao runtime nas fronteiras.
- `packages/domain/src/tasks.ts` - regras puras de tarefa, prioridade, resolucoes compativeis e recheck; sync nao deve duplicar essas regras na UI.
- `packages/domain/src/alerts.ts` - politica de alerta/escalonamento ja existente; pendencias offline nao devem encerrar ou silenciar cobranca indevidamente.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CaptureRepository` ja concentra as operacoes de tarefa, rebaixa, alerta e push-open. A Fase 7 deve adicionar capacidades de cache/sync nessa fronteira, mantendo os consumidores mobile tipados.
- `sqlite-repository.ts` ja usa SQLite local para produtos, lotes, observacoes, tarefas, workflows de rebaixa, alert states e tentativas de alerta. A outbox de comandos e estados de sync devem seguir esse padrao local-first.
- `TaskResolutionPanel.tsx` ja separa a acao fisica do feedback de conclusao, exige confirmacao reforcada para acoes de risco e pede evidencia/motivo para reconferencia e rebaixa. Ele e o lugar natural para salvar a acao no aparelho e anexar "Pendente de sincronizacao".
- `TodayScreen.tsx` ja mostra o veredito de seguranca primeiro, aviso de push, linhas de tarefa e estados de alerta. A fase deve inserir offline/sync logo abaixo do veredito, como o UI-SPEC exige.
- `today-copy.ts` concentra copy operacional de "Hoje". Labels como "Acao salva no aparelho", "Pendente de sincronizacao" e "Sincronizado as {horario}" devem entrar ali ou em arquivo local equivalente.

### Established Patterns
- O app mobile e local-first em SQLite e usa contratos Zod nas fronteiras.
- "Hoje" e a fonte operacional da verdade; push, alerta e agora sync sao suportes visiveis, nao prova de execucao por si so.
- Observacoes fisicas e resolucoes importantes preservam historico; a Fase 7 nao deve compactar a outbox de forma que apague a cadeia operacional.
- Codigo e enums usam ingles tecnico; copy visivel usa portugues-BR operacional, preferencialmente ASCII-normalizado conforme o UI-SPEC.
- `packages/domain` permanece puro, sem React Native, SQLite, provider SDK ou logica de transporte/sync.
- Dados reais, fotos reais, device tokens reais e payloads crus de sync nao entram no repositorio publico.

### Integration Points
- `refreshTodayTasks` e suas fontes (`today_open`, `manual_refresh`, `lot_change`, `observation_change`) sao o caminho escolhido para preparar/atualizar o cache offline.
- `resolveTodayTask`, `requestMarkdown`, `decideMarkdown`, `recordMarkdownApplication` e `confirmMarkdownOnShelf` precisam poder produzir comandos offline idempotentes em vez de depender de conectividade imediata.
- O resumo de fila se conecta a "Hoje" abaixo do status offline/sync e acima das tarefas/conflitos conforme prioridade operacional.
- Conflitos precisam ligar um comando local a tarefa/lote/produto/local/horario e ao estado remoto atual antes de oferecer manter, atualizar ou descartar.
- Tests existentes de repository, task resolution, markdown workflow, alert state e Today screen sao pontos naturais para regressao da Fase 7.

</code_context>

<specifics>
## Specific Ideas

- O cache minimo de trabalho offline deve responder "posso executar as tarefas ativas do turno neste aparelho?" e nao "tenho uma copia ampla do mundo".
- A linguagem desejada para acao offline e dupla: reconhecer trabalho fisico local e deixar claro que o sistema central ainda nao confirmou.
- Exemplo de ressalva no topo: "Retirada salva neste aparelho. Area de venda ainda pendente de sincronizacao."
- O resumo da fila deve permanecer compacto em "Hoje", com conflitos criticos primeiro e sem virar tela administrativa.
- Retry deve explicar idempotencia de forma operacional: "Tentaremos novamente sem duplicar a acao."
- A Fase 7 pode sincronizar metadados de evidencia ja existentes (`photo_recorded_placeholder` ou `no_photo_reason`), mas nao deve introduzir storage real de foto.

</specifics>

<deferred>
## Deferred Ideas

- Auditoria completa, timeline historica, lista de concluidos sincronizados, RBAC formal, storage real de evidencia/R2 e fechamento de turno pertencem a Phase 8.
- Integracao com vendas, estoque, ERP ou alteracao automatica de preco continua fora do v1.
- Dashboard administrativo de sync, monitoramento tecnico de rede e diagnostics screen ficam fora da Phase 7.

</deferred>

---

*Phase: 07-offline-sync*
*Context gathered: 2026-06-21T21:07:39.1488497-03:00*
