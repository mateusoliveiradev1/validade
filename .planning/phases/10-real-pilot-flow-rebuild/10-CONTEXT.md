# Phase 10: Real Pilot Flow Rebuild - Context

**Gathered:** 2026-06-26T19:19:51.9164794-03:00
**Status:** Ready for UI contract and planning

<domain>
## Phase Boundary

Esta fase reconstrui o fluxo real do piloto do Validade Zero para que uma conta nova, outro Android, o mobile principal e o Command Center leiam a mesma verdade central da loja. O app deve sair do estado "funciona localmente" para um ciclo operacional completo: entrar com acesso real, preparar o turno, abrir Hoje, encontrar ou criar produto sem duplicar, registrar lote, gerar risco/tarefa, resolver com baixa terminal auditavel, sincronizar com a central, remover o item da fila ativa apenas quando o risco saiu da area de venda, preservar historico/auditoria, cobrar por push sem fingir execucao, e fechar o turno sem declarar seguranca falsa.

A fase e sobre fluxo real de piloto, nao sobre SaaS publico, integracao com vendas/ERP, app store publica, previsao de demanda, BI avancado ou multiempresa self-service. Tambem nao reabre a identidade visual da Fase 9; ela deve preservar a direcao "Operacao de risco zero" e tornar os fluxos principais funcionais, confiaveis e consistentes entre mobile, web, API e banco.

</domain>

<decisions>
## Implementation Decisions

### Espinha operacional do app
- **D-01:** O caminho principal do app deve ser: login/acesso -> Preparar turno -> Hoje como cockpit -> produto/categoria -> lote -> risco/tarefa -> baixa terminal -> sync central -> historico/Command Center -> fechamento do turno.
- **D-02:** O comeco do turno passa por **Preparar turno** antes de operar. O app deve carregar a verdade central, pendencias abertas, leitura central pendente, participacao do turno e aptidao do aparelho antes de liberar execucao como se estivesse pronto.
- **D-03:** Depois de Preparar turno, a primeira superficie operacional e **Hoje como cockpit de execucao**, nao menu solto, nao dashboard passivo e nao cadastro como primeira tela.
- **D-04:** Dentro de Hoje, a hierarquia e: veredito da area de venda, estado de leitura central/sync, pendencias criticas, depois `Registrar lote`, `Conferir recentes` e `Fechamento do turno`.
- **D-05:** Qualquer tela ou copy que sugira "area segura" antes da leitura central, resolucao valida e bloqueios zerados e bloqueadora da fase.

### Segundo aparelho e verdade central
- **D-06:** Um Android recem-instalado com acesso da mesma loja deve carregar um **pacote operacional do turno**: produtos/lotes necessarios, tarefas ativas, pendencias de sync, resolucoes recentes e historico curto suficiente para nao recriar risco ja baixado.
- **D-07:** Um aparelho novo sem primeira sincronizacao nao pode operar como se conhecesse a loja. Ele deve mostrar que precisa conectar uma vez para preparar o turno.
- **D-08:** Lote ja resolvido por perda, retirada, rebaixa concluida ou outra baixa terminal valida some da fila ativa em todos os aparelhos somente apos ack central e criterio operacional cumprido.
- **D-09:** Lote resolvido permanece visivel no historico curto do turno e em auditoria/Command Center quando relevante, com motivo, pessoa, horario e trilha.
- **D-10:** Quando dois aparelhos divergem por atraso de sync, a interface prioriza o estado **Leitura central pendente**. Nenhum aparelho deve converter divergencia em falso verde.

### Produto, categoria e duplicata
- **D-11:** O fluxo de registro novo e **produto primeiro, depois lote**: buscar/reusar produto existente -> comparar semelhantes -> criar rascunho se necessario -> confirmar produto -> registrar lote.
- **D-12:** Categorias ficam no banco como catalogo central, com categorias base preparadas para o piloto e ajuste controlado por lideranca/admin. O operador nao deve digitar categoria repetidamente no corredor.
- **D-13:** Categoria nao e apenas organizacao visual: ela define regra operacional, janela de risco, modo de produto e como o lote vira tarefa.
- **D-14:** Antes de criar produto novo, o app deve mostrar produtos semelhantes por nome/codigo/categoria e exigir escolha consciente: reutilizar ou criar novo mesmo assim.
- **D-15:** Colaborador pode criar produto novo como **rascunho operacional**, para nao travar o corredor. Lideranca/admin valida depois.
- **D-16:** Lote criado em produto ainda nao validado entra como risco conservador ate validacao; ele nao fica escondido e nao usa regra silenciosa como se fosse confiavel.
- **D-17:** Produtos em rascunho aparecem em fila curta no Command Center e tambem em Hoje quando afetam o turno.

### Baixa terminal de lote e tarefa
- **D-18:** Perda e retirada exigem acao terminal, destino/motivo e reconferencia de area. Um toque isolado nao pode esconder vencido da gondola.
- **D-19:** A baixa terminal precisa ser auditavel no banco. O item some da fila ativa, mas nao some da verdade do sistema.
- **D-20:** Depois de baixa terminal + ack central + reconferencia, o lote aparece em historico curto do turno e auditoria/Command Center, nao na fila ativa.
- **D-21:** Se a baixa foi feita offline e ainda nao recebeu ack central, o app pode reconhecer "acao salva neste aparelho", mas deve manter bloqueio de seguranca central pendente.
- **D-22:** Somente acoes que removem o risco da area de venda tiram o lote da fila ativa: perda, retirada, movimentacao para local seguro, rebaixa concluida com conferencia, provavel esgotado com confirmacao forte, e nao encontrado apos reconferencia.
- **D-23:** `Provavel esgotado` e `nao encontrado` sempre exigem reconferencia guiada antes de resolver. Sem reconferencia, permanecem como incerteza visivel.
- **D-24:** Correcao ou reversao de baixa terminal nunca edita o fato antigo. Ela cria novo evento auditavel, preserva a trilha original e reabre tarefa se ainda houver risco.

### Estados de sync no mobile e web
- **D-25:** A taxonomia visivel oficial e: **Local**, **Pendente central**, **Sincronizado**, **Conflito**, **Descartado**, **Resolvido**.
- **D-26:** `Local` significa salvo no aparelho e ainda nao enviado.
- **D-27:** `Pendente central` significa enviado ou tentando, mas ainda nao aceito como verdade central.
- **D-28:** `Sincronizado` significa aceito pela central, mas nao necessariamente resolvido.
- **D-29:** `Conflito` significa que a central recusou ou exige decisao humana antes de aplicar.
- **D-30:** `Descartado` significa que a acao local nao sera aplicada, sempre com motivo obrigatorio e historico preservado.
- **D-31:** `Resolvido` significa risco/tarefa encerrado com criterio operacional valido, ack central e sem bloqueios aplicaveis.
- **D-32:** Area segura so pode aparecer com `Resolvido` + ack central + ausencia de bloqueios. `Sincronizado` sozinho nao permite area segura.
- **D-33:** Prioridade visual em Hoje: Conflito > Pendente central critico > Tarefa critica ativa > Local > Resolvido.
- **D-34:** Command Center nao inventa pendencias locais que ainda nao recebeu. Ele mostra ultima leitura central, lacuna, leitura pendente ou stale state; silencio nao vira "sem pendencia".

### Fechamento de turno funcional
- **D-35:** Fechamento do turno comeca com revalidacao central antes de mostrar veredito.
- **D-36:** Area segura e bloqueada por tarefa critica ativa, pendencia central critica, conflito de sync, produto em revisao afetando o turno, rebaixa aberta, reconferencia aberta, evidencia pendente/falha ou leitura central desatualizada.
- **D-37:** Com bloqueio, lideranca pode encerrar turno com pendencias assumidas, registrando motivo, responsavel de continuidade, prazo e passagem. Isso nunca declara area segura.
- **D-38:** Mesmo com central limpa, area segura exige checklist fisico guiado final.
- **D-39:** Fechamento gera recibo auditavel no app e no Command Center, com veredito, bloqueios/itens verificados, responsavel, horario, passagem e link para historico/auditoria.

### RBAC e acesso por conta
- **D-40:** Outra conta da mesma loja ve a mesma verdade central da loja, filtrada por papel. Produtos, lotes, tarefas, resolucoes e status central pertencem a loja, nao ao aparelho ou criador individual.
- **D-41:** Colaborador registra produto/lote, resolve tarefas, adiciona evidencia e trabalha offline/sync dentro da loja vinculada.
- **D-42:** Lideranca faz o que o colaborador faz e tambem valida produtos, aprova/reprova etapas quando aplicavel, assume pendencias, consulta contexto ampliado e fecha turno.
- **D-43:** Administracao cuida de usuarios, categorias, regras, politicas e auditoria/admin. Admin nao vira lideranca operacional automaticamente sem vinculo explicito de lideranca naquela loja.
- **D-44:** Mudanca ou revogacao de acesso vale na proxima revalidacao de sessao/sync e bloqueia novas acoes proibidas. Cache pode existir como leitura limitada e marcada, nunca como autorizacao.
- **D-45:** Outra loja nao ve nada da loja piloto. IDs conhecidos de outra unidade nao devem vazar existencia de recurso.

### Push para equipe e escalonamento
- **D-46:** Push vai para responsavel + equipe do turno, com escalonamento para lideranca se nao resolver. Nao disparar tudo para todo mundo sempre.
- **D-47:** Segunda conta no turno passa a receber push depois de registrar dispositivo e sincronizar participacao no turno. Ela recebe novas cobrancas/escalonamentos sem replay barulhento do historico antigo.
- **D-48:** Falha de push, push nao aberto, ticket aceito ou recibo do provider nao resolvem tarefa. Hoje, Command Center e escalonamento continuam ate resolucao central.
- **D-49:** Push e canal de cobranca; tarefa persistente e leitura central continuam sendo a fonte da verdade.

### the agent's Discretion
O planejamento pode definir composicao exata das telas, nomes finais de componentes, formato dos endpoints, tabelas, migracoes, eventos de auditoria, copy final de microestados, batch size de sync, politicas de cache e detalhes de UAT, desde que preserve todas as decisoes acima. Nao esta delegado ao agente enfraquecer Preparar turno, verdade central, RBAC por loja, baixa terminal auditavel, fechamento verdadeiro, ou semantica de sync.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Escopo, produto e stack
- `.planning/ROADMAP.md` - define a Fase 10, seu objetivo, UI hint, dependencias e criterios de sucesso.
- `.planning/REQUIREMENTS.md` - define os requisitos v1 envolvidos em catalogo, lotes, tarefas, sync, auditoria, RBAC, push e UI.
- `.planning/PROJECT.md` - define o valor central de zero vencidos na area de venda, restricoes de custo, no sales integration, mobile-first, seguranca e confiabilidade.
- `AGENTS.md` - consolida as regras obrigatorias do repo, stack e workflow GSD.
- `.planning/research/STACK.md` - define Expo/React Native, React/Vite, Hono/Cloudflare, Neon, Drizzle, Zod, R2, Cron, Expo Push e SQLite/outbox.
- `PRODUCT.md` - define usuarios, personalidade, anti-referencias, principios de design e acessibilidade.

### Decisoes anteriores que a Fase 10 nao pode quebrar
- `.planning/phases/09-impeccable-hardening-and-v1-readiness/09-CONTEXT.md` - fixa produto real, auth, privacidade, Command Center, Android APK e direcao visual.
- `.planning/phases/08-audit-roles-and-shift-close/08-CONTEXT.md` - fixa auditoria append-only, RBAC por loja, evidencia e fechamento verdadeiro.
- `.planning/phases/07-offline-sync/07-CONTEXT.md` - fixa acao local vs ack central, pendencia, conflito e idempotencia.
- `.planning/phases/06-markdown-rebaixa-workflow/06-CONTEXT.md` - fixa etapas de rebaixa e conferencia.
- `.planning/phases/05-push-and-escalation/05-CONTEXT.md` - fixa que push cobra, mas nao resolve.
- `.planning/phases/04-today-task-workflow/04-CONTEXT.md` - fixa Hoje como fonte operacional, area segura e tarefas acionaveis.
- `.planning/phases/03-mobile-lot-capture/03-CONTEXT.md` - fixa captura de produto/lote e observacoes fisicas.

### Runbooks operacionais
- `docs/operations/shift-close.md` - define fechamento seguro, fechamento com pendencias, reabertura e bloqueios.
- `docs/operations/push-alerts.md` - define push como cobranca, privacidade de notificacao, limites de provider e limitacao atual de fan-out remoto.
- `docs/operations/audit-and-access.md` - define escopo de acesso, administracao de vinculos, linha de auditoria e resposta a incidente.
- `docs/release/v1-readiness.md` - registra que release depende de validacao real de Android, sync, notificacoes, permissao de camera e offline.

### Mobile atual
- `apps/mobile/App.tsx` - entrada mobile para auth/session gate e preparacao do turno.
- `apps/mobile/src/auth/AuthGate.tsx` - gate atual de auth e sessao.
- `apps/mobile/src/capture/CaptureApp.tsx` - roteamento mobile atual para inserir Preparar turno, Hoje, registro, fechamento e historico curto.
- `apps/mobile/src/capture/TodayScreen.tsx` - cockpit operacional que deve liderar com veredito, sync, tarefas, registro e fechamento.
- `apps/mobile/src/capture/ProductDiscoveryScreen.tsx` - fluxo atual de busca, atalhos e confirmacao de produto; precisa evoluir para semelhante/rascunho/catalogo central.
- `apps/mobile/src/capture/ProductFormScreen.tsx` - base do cadastro de produto; precisa distinguir rascunho operacional e validacao posterior.
- `apps/mobile/src/capture/LotRegistrationScreen.tsx` - registro de lote depois do produto confirmado.
- `apps/mobile/src/capture/TaskResolutionPanel.tsx` - fluxo de resolucao fisica, evidencia/motivo, rebaixa e baixa terminal.
- `apps/mobile/src/capture/ShiftCloseScreen.tsx` - fechamento de turno que deve ser tornado funcional com revalidacao central e recibo.
- `apps/mobile/src/capture/ShiftCloseReceipt.tsx` - base de recibo auditavel do fechamento.
- `apps/mobile/src/capture/offline-sync-ui.tsx` - componentes/copy de estados offline/sync/conflito.
- `apps/mobile/src/capture/repository.ts` - fronteira tipada do mobile para produto, lote, tarefas, evidencia, sync e fechamento.
- `apps/mobile/src/capture/sqlite-repository.ts` - persistencia local de produtos, lotes, tarefas, outbox, sync, evidencia e fechamento.
- `apps/mobile/src/capture/sync-engine.ts` - engine de envio de comandos pendentes.
- `apps/mobile/src/capture/http-sync-transport.ts` - transporte HTTP de sync para a API central.

### API, contratos, banco e web
- `apps/api/src/index.ts` - Hono app atual, incluindo `/sync/commands`, `/command-center`, auth, membership e rotas operacionais.
- `apps/api/src/command-center.ts` - service atual do Command Center baseado em auditoria/sync.
- `apps/api/src/auth.ts` - seam de sessao/autorizacao.
- `apps/api/src/authentication.ts` - rotas de auth/first access/recovery/session.
- `apps/api/src/memberships.ts` - administracao de vinculos e papeis.
- `packages/contracts/src/sync.ts` - contratos de comando offline, fila, conflito, ack/retry/descartado.
- `packages/contracts/src/command-center.ts` - projection atual do Command Center.
- `packages/contracts/src/capture.ts` - contratos de produto, lote e localizacao operacional.
- `packages/contracts/src/tasks.ts` - contratos de tarefa/resolucao/evidencia.
- `packages/contracts/src/authorization.ts` - papeis, capacidades, sessao e membership.
- `packages/contracts/src/authentication.ts` - convite, login, first access, recovery e session refresh.
- `packages/database/src/schema.ts` - schema central existente para auth, membership, audit, evidence e demais tabelas.
- `packages/database/src/auth-repository.ts` - repositorio central de auth/session/invite.
- `packages/database/src/membership-repository.ts` - repositorio central de vinculos/papeis.
- `packages/database/src/audit-repository.ts` - repositorio de auditoria append-only.
- `apps/web/src/command-center/CommandCenter.tsx` - superficie web para veredito, gargalos, sync, evidencia e fechamento.
- `apps/web/src/memberships/MembershipAdministration.tsx` - admin de vinculos e papeis.
- `apps/web/src/memberships/InviteAdministration.tsx` - admin de convites.
- `apps/web/src/audit/AuditWorkbench.tsx` - investigacao/auditoria complementar.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ProductDiscoveryScreen.tsx` ja busca produto, lista frequentes/categorias e exige confirmacao de candidato; e a base para comparacao de semelhantes e criacao de rascunho.
- `repository.ts` ja concentra produto, lote, tarefa, markdown, alerta, evidencia, shift close e sync em uma fronteira tipada.
- `sqlite-repository.ts` ja persiste produtos, lotes, observacoes, tarefas e outbox local; precisa ganhar/ajustar campos centrais de rascunho, validacao, pacote do turno e historico curto.
- `sync-engine.ts` e `http-sync-transport.ts` ja modelam envio em batch, retry, ack e conflito; a Fase 10 deve expandir verdade central sem quebrar idempotencia.
- `CommandCenter.tsx` e `command-center.ts` ja projetam gargalos a partir de eventos de sync/auditoria; precisam receber produtos em revisao, pendencias de leitura central, resolvidos/historico e fechamento.
- `authorization.ts`, `authentication.ts`, `membership-repository.ts` e `auth-repository.ts` ja dao base para outra conta, sessao, papel e revogacao.
- `docs/operations/shift-close.md`, `push-alerts.md` e `audit-and-access.md` ja contem copy e regras operacionais aproveitaveis.

### Established Patterns
- Mobile e local-first, mas a verdade de seguranca vem de ack central quando o fluxo declara resolucao ou area segura.
- Copy visivel deve ser PT-BR operacional, direta e semanticamente verdadeira.
- Auditoria e correcoes sao append-only; nao editar fatos historicos.
- Role + loja + capacidades sao decididos no servidor; cliente nao informa papel confiavel.
- Command Center falha fechado (`needs_review`/leitura pendente) quando a central nao tem dados suficientes.
- Push e alerta cobram tarefas persistentes, mas nao substituem Hoje, sync ou confirmacao fisica.

### Integration Points
- Inserir "Preparar turno" entre AuthGate e Hoje/CaptureApp para baixar pacote operacional e revalidar sessao/capacidades.
- Criar/ajustar endpoints centrais para pacote do turno, catalogo de categorias, rascunhos de produto, validacao de produto, resolucoes terminais e historico curto.
- Fazer produto/lote/tarefa/resolucao viajar por sync central, nao ficar restrito ao SQLite do primeiro aparelho.
- Ligar baixa terminal a eventos auditaveis e projections que removem fila ativa sem apagar historico.
- Conectar RBAC a mobile, API e web para que outra conta da mesma loja veja a mesma verdade, mas aja conforme papel.
- Atualizar push fan-out para participacao do turno, dispositivos registrados e escalonamento por regra.
- Tornar fechamento dependente de leitura central, bloqueios, checklist fisico e recibo auditavel.

</code_context>

<specifics>
## Specific Ideas

- O usuario pediu "fluxo perfeito" porque o app ainda nao esta bom: a fase deve ser tratada como reparo de jornada real, nao ajuste cosmetico.
- O fluxo perfeito esperado e: preparar turno -> Hoje -> produto/categoria -> lote -> risco/tarefa -> baixa terminal -> sync central -> historico/Command Center -> fechamento.
- Categorias devem vir de catalogo central no banco para evitar digitar toda hora e para preservar regra operacional.
- Outra conta deve enxergar os mesmos lotes e tarefas da loja conforme papel, nao dados locais de um aparelho.
- Push deve chegar ao publico certo do turno e escalar, nao a todos sempre.
- Fechamento de turno ficou explicitamente dentro da fase porque sem ele o ciclo de area segura nao fecha.
- UAT precisa cobrir outro Android/conta, categoria central, produto rascunho, lote em risco conservador, baixa terminal, ack central, historico, RBAC, push e fechamento.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 10-Real Pilot Flow Rebuild*
*Context gathered: 2026-06-26T19:19:51.9164794-03:00*
