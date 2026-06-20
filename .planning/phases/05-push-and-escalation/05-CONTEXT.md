# Phase 5: Push and Escalation - Context

**Gathered:** 2026-06-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Esta fase adiciona lembretes push e escalonamento operacional para tarefas persistentes do "Hoje", para que risco crítico não resolvido continue cobrando atenção até haver resolução física compatível. A Fase 5 amplia a cobrança sobre tarefas existentes; não substitui a tarefa in-app por push e não implementa RBAC formal, workflow de rebaixa, sincronização offline, armazenamento de evidências, auditoria completa ou fechamento de turno.

</domain>

<decisions>
## Implementation Decisions

### Cadência por gravidade
- **D-01:** A cobrança usa uma escada por gravidade. Tarefas com prazo `now` notificam ao nascer, repetem após 15 minutos e escalam após 30 minutos; tarefas com prazo `shift` notificam ao nascer, repetem a cada 60 minutos e escalam após 2 horas.
- **D-02:** Fora do turno, apenas tarefas vencidas, críticas ou de reconferência na área de venda continuam notificando. As demais permanecem persistentes e retomam a cobrança no próximo turno.
- **D-03:** Uma ação parcial não silencia o risco. Quando a resolução cria uma reconferência, a nova tarefa começa sua própria cadência imediatamente; somente resolução física compatível encerra a cobrança.
- **D-04:** A escada é o padrão seguro do piloto, com exceções declaradas no perfil operacional por categoria ou produto. A Fase 5 não cria uma tela administrativa para essa configuração.

### Destinatário e escalonamento
- **D-05:** A notificação inicial vai ao responsável individual quando houver; enquanto não houver, vai aos dispositivos da equipe do turno.
- **D-06:** Ao vencer o limite de escalonamento, a tarefa sobe para a liderança do turno configurada localmente, sem antecipar RBAC ou gerenciamento completo de usuários.
- **D-07:** Depois de escalada, a cobrança continua para o responsável e para a liderança; ela não vira broadcast para toda a equipe.
- **D-08:** A liderança pode confirmar o recebimento e assumir a cobrança, e o app registra hora dessa confirmação. Isso nunca encerra nem reduz a exigência de resolução física compatível.

### Confiabilidade do canal push
- **D-09:** O app explica a utilidade dos alertas na tela "Hoje" e só então solicita a permissão do sistema.
- **D-10:** Se a permissão for negada, o token estiver indisponível ou o canal de push falhar, "Hoje" exibe aviso persistente e acionável para tentar novamente ou abrir as configurações do aparelho. As tarefas permanecem ativas.
- **D-11:** Falhas temporárias de envio usam retentativas limitadas e registram estado visível de alerta pendente/falho. Falha de push nunca marca uma tarefa como resolvida.
- **D-12:** Tocar no push abre a tarefa atual. Se ela mudou ou já foi resolvida, o app abre "Hoje" com explicação de que a pendência foi atualizada.

### Conteúdo e ação do alerta
- **D-13:** O push prioriza ação e urgência, exibindo ação, produto, lote, local e contexto de prioridade; detalhes adicionais permanecem no app.
- **D-14:** A linguagem é direta, operacional e sem culpa, com verbos como "Retirar agora" e "Conferir área de venda". Urgência vem da prioridade real, não de tom alarmista repetitivo.
- **D-15:** Na tela bloqueada, o alerta mostra apenas ação, produto e local. Lote e detalhes aparecem após desbloquear e abrir o app.
- **D-16:** A única ação explícita na notificação é "Abrir tarefa". Nenhuma retirada, perda, reconferência ou resolução pode ser concluída na tela bloqueada.

### Discricionariedade do agente
Nenhuma decisão foi delegada ao agente durante a discussão. O planejamento deve seguir as decisões acima.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Escopo e requisitos
- `.planning/ROADMAP.md` - define a Fase 5, os requisitos RSK-05, PSH-01, PSH-02 e PSH-05 e os critérios de sucesso de push e escalonamento.
- `.planning/REQUIREMENTS.md` - define a obrigação de push para tarefas atribuídas/críticas, repetição/escalonamento e a regra de que push não substitui tarefa persistente.
- `.planning/PROJECT.md` - define o valor central de zero vencidos na área de venda, o contexto sem dados de venda e o papel de alertas persistentes e confirmação física.
- `AGENTS.md` - consolida as restrições de custo zero, mobile-first, tipagem forte, testes, segurança e uso obrigatório do fluxo GSD.

### Decisões anteriores
- `.planning/phases/04-today-task-workflow/04-CONTEXT.md` - define as tarefas acionáveis, seus prazos `now`/`shift`/`today`/`follow_up`, a prioridade da área de venda e a regra de reconferência após retirada/perda.
- `.planning/phases/03-mobile-lot-capture/03-CONTEXT.md` - define o registro de observações físicas append-only e os locais operacionais que continuam sendo a base da confirmação.
- `.planning/phases/02-domain-and-risk-core/02-CONTEXT.md` - define estados de risco, perfis por categoria/produto, presença física e a regra de que incerteza não pode virar segurança silenciosa.
- `.planning/research/STACK.md` - define Expo, Expo Push, Cloudflare Cron, contratos Zod e os limites de custo zero do piloto.

### Código existente
- `apps/mobile/App.tsx` - entrada Expo que instancia o repositório SQLite local.
- `apps/mobile/src/capture/CaptureApp.tsx` - orquestra a navegação mobile a partir de "Hoje" e deve receber abertura de tarefa via push sem apagar os fluxos existentes.
- `apps/mobile/src/capture/repository.ts` - define a fronteira do repositório, refresh de tarefas, resolução, reconferência e parsing de contratos.
- `apps/mobile/src/capture/sqlite-repository.ts` - mantém tarefas locais persistentes, histórico de resolução, índices e transação de criação de reconferência.
- `apps/mobile/src/capture/TodayScreen.tsx` - superfície in-app que precisa refletir disponibilidade, falha e atualização de alertas.
- `apps/mobile/src/capture/TaskResolutionPanel.tsx` - fluxo seguro de resolução; notificações devem sempre encaminhar para esta confirmação, não resolver diretamente.
- `apps/mobile/src/capture/today-copy.ts` - vocabulário operacional PT-BR para títulos, prazos e ações de tarefa.
- `packages/domain/src/tasks.ts` - define prioridades, severidade, prazos e resoluções compatíveis das tarefas do "Hoje".
- `packages/contracts/src/tasks.ts` - define contratos runtime-validated das tarefas, comandos de resolução e metadados de atualização.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/domain/src/tasks.ts` já oferece `severity`, `dueBucket`, prioridade e resoluções compatíveis; a política de lembrete deve consumir essa linguagem em vez de duplicá-la em UI ou provider.
- `packages/contracts/src/tasks.ts` e `apps/mobile/src/capture/repository.ts` oferecem fronteiras Zod e métodos de tarefas persistentes para extensão com estado de alerta/escalonamento.
- `apps/mobile/src/capture/sqlite-repository.ts` já persiste tarefas, status, responsável local e histórico de resolução em SQLite, preservando uma tarefa in-app como fonte de verdade.
- `apps/mobile/src/capture/TodayScreen.tsx`, `TaskResolutionPanel.tsx` e `today-copy.ts` fornecem o caminho e a linguagem operacional para abrir uma pendência a partir de uma notificação.

### Established Patterns
- O app é local-first e mobile-first, usa SQLite e contratos Zod nas fronteiras.
- A resolução de tarefa exige ação compatível e, para riscos de área de venda, pode criar reconferência obrigatória com evidência ou motivo explícito de não haver foto.
- Não há Expo Push configurado ainda; a Fase 5 deve introduzi-lo sem permitir que entrega de push se torne prova de execução.
- Código e tipos usam inglês técnico; copy visível usa português-BR direto, operacional e sem culpa.

### Integration Points
- A fase deve conectar o registro/permissão de dispositivo, o agendamento de lembretes e o processamento de abertura ao `CaptureApp`, à tela "Hoje" e ao repositório de tarefas existente.
- A política de cadência usa os perfis de risco por categoria/produto e precisa criar estado persistente o bastante para não duplicar, encerrar ou perder a cobrança indevidamente.
- Um worker/cron e o provider Expo devem ficar atrás de adaptadores para manter o piloto de custo zero e a arquitetura substituível.

</code_context>

<specifics>
## Specific Ideas

- Exemplo de alerta: "Retirar agora: Ovos — área de venda". O lote só aparece após desbloquear e abrir a tarefa.
- A escalada deve ser operacionalmente clara: "Liderança avisada" com horário não é confirmação de resolução.
- O celular não pode ser tratado como a única garantia de execução; a tarefa em "Hoje" continua sendo a fonte de verdade.

</specifics>

<deferred>
## Deferred Ideas

- Tornar os atalhos "Frequentes" e "Por categoria" funcionais na busca de produto. Eles foram entregues como placeholders na Fase 3 e serão corrigidos como tarefa rápida GSD imediatamente após o contexto da Fase 5, fora do escopo de push e escalonamento.
- Workflow completo de rebaixa, estados de aprovação/aplicação e evidência de etiqueta pertencem à Fase 6.
- Fila offline, comandos idempotentes e resolução de conflitos pertencem à Fase 7.
- RBAC formal, auditoria completa, armazenamento controlado de evidências e fechamento de turno pertencem à Fase 8.

</deferred>

---

*Phase: 5-Push and Escalation*
*Context gathered: 2026-06-20*
