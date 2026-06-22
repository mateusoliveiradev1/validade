# Phase 8: Audit, Roles, and Shift Close - Context

**Gathered:** 2026-06-22T00:12:46.0060434-03:00
**Status:** Ready for planning

<domain>
## Phase Boundary

Esta fase entrega a camada de confianca e supervisao do piloto: trilha de auditoria para os eventos operacionais relevantes, autorizacao por papel e loja, armazenamento controlado de evidencias fora do Postgres e um fechamento de turno que distingue encerrar o trabalho de declarar a area de venda segura.

A lideranca deve conseguir entender quem fez cada acao, quando ela ocorreu fisicamente, quando chegou ao sistema e qual evidencia a sustenta. O fechamento pode registrar um turno com pendencias, mas seguranca nunca pode ser afirmada diante de risco bloqueante, reconferencia aberta, cache desatualizado, conflito critico, sincronizacao critica pendente ou checklist fisico incompleto.

A fase nao adiciona integracao com vendas, estoque ou ERP, comparacao entre lojas, provisionamento organizacional amplo ou analytics avancado. O hardening visual, de acessibilidade e de release permanece na Fase 9.

</domain>

<decisions>
## Implementation Decisions

### Fechamento do turno
- **D-01:** O fim do horario nao obriga uma declaracao falsa de seguranca. Se houver impedimentos, o turno pode ser encerrado como `nao seguro`, com pendencias visiveis e passagem obrigatoria.
- **D-02:** Risco vencido ou critico, reconferencia aberta, conflito critico, sincronizacao critica pendente, cache operacional desatualizado ou checklist fisico incompleto impedem o selo de area segura.
- **D-03:** Fechar como `area segura` exige validacao do sistema e checklist fisico orientado pela lideranca nas areas criticas, incluindo riscos vencidos/criticos, reconferencias e rebaixas aplicadas na area de venda.
- **D-04:** Um fechamento `nao seguro` exige motivo, responsavel pela continuidade, prazo e observacao operacional. A proxima lideranca confirma o recebimento, mas a cobranca continua ate a resolucao fisica.
- **D-05:** O fechamento e um retrato imutavel. Problema ou erro descoberto depois gera reabertura auditada com motivo, autor e resumo do que mudou; o registro original nao e reescrito.

### Permissoes por papel e loja
- **D-06:** O colaborador ve as tarefas operacionais da equipe no turno, registra acoes fisicas, anexa evidencias e solicita rebaixa. Nao aprova rebaixa, fecha turno, altera papeis ou acessa a auditoria completa.
- **D-07:** A lideranca pode executar as acoes comuns do colaborador e tambem atribuir ou reatribuir tarefas, aprovar/reprovar rebaixas, assumir escalonamentos, consultar auditoria/evidencias da propria loja e realizar o fechamento.
- **D-08:** O administrador governa usuarios, papeis, lojas, regras e politicas de evidencia e pode consultar auditoria global quando autorizado. Ele nao ganha poder operacional automatico: para executar ou fechar um turno, precisa de vinculo explicito de lideranca naquela loja.
- **D-09:** Permissoes combinam papel e escopo de loja. Nenhum papel pode atravessar lojas apenas por conhecer um identificador de tarefa, lote, fechamento ou evidencia.
- **D-10:** Superficies alheias ao papel ficam ocultas. Uma acao relevante ao contexto pode aparecer bloqueada com explicacao de quem pode realiza-la. A API aplica a regra de verdade e registra tentativas negadas como eventos de seguranca.

### Historico de auditoria
- **D-11:** A auditoria registra eventos operacionais e de seguranca relevantes: criacao/atribuicao de tarefa, acao fisica, etapas de rebaixa, alerta/escalonamento, conflito/sincronizacao, evidencia, decisao de acesso, fechamento, passagem e reabertura.
- **D-12:** Abertura de tela, navegacao, filtros e cliques comuns nao entram na trilha. Auditoria acompanha mudancas de dominio e decisoes sensiveis, nao telemetria indiscriminada da interface.
- **D-13:** Tarefa, lote, evidencia e fechamento exibem sua linha do tempo contextual. A lideranca tambem possui uma visao geral da loja filtravel por periodo, pessoa, tipo de evento e item afetado.
- **D-14:** Cada evento mostra pessoa e papel no momento da acao, data/hora, loja, acao, alvo, resumo da mudanca, motivo, mudanca de responsavel e vinculo com evidencia quando houver.
- **D-15:** IDs internos, payloads brutos, detalhes de dispositivo e dados tecnicos completos ficam ocultos por padrao e so aparecem em diagnostico autorizado.
- **D-16:** Acoes offline preservam dois momentos: quando ocorreram fisicamente no aparelho e quando foram recebidas pelo sistema central. Ate ack, o evento permanece explicitamente pendente ou em conflito.
- **D-17:** Eventos auditaveis sao append-only. Correcao, invalidacao ou reabertura gera outro evento ligado ao anterior, sem apagar ou editar o fato historico.

### Controle das evidencias
- **D-18:** O acesso a evidencias e limitado por funcao e loja. Colaborador ve evidencias das tarefas operacionais acessiveis no turno; lideranca ve as da propria loja; administracao atravessa lojas apenas por funcao autorizada de auditoria/suporte.
- **D-19:** Consulta administrativa entre lojas e acesso excepcional a evidencia tambem geram evento auditavel.
- **D-20:** Foto capturada offline usa fila de upload separada da fila de comandos. Acao e foto podem ser salvas no aparelho, mas a evidencia aparece como `aguardando envio` ate confirmacao central; falha exige retry visivel.
- **D-21:** O sistema nao declara uma foto centralmente disponivel com base apenas no registro local ou na conectividade. Somente o ack do storage muda o estado para enviada.
- **D-22:** Evidencia errada, ilegivel ou associada ao item incorreto e invalidada pela lideranca com motivo e pode ser substituida. A evidencia anterior permanece no historico, mas deixa de valer como prova atual.
- **D-23:** A retencao padrao do piloto e de 90 dias, configuravel por politica. Depois da remocao do arquivo, metadados, autoria, hash, vinculo, estados e motivo de invalidacao permanecem na auditoria.
- **D-24:** Binarios ficam fora do Postgres em storage controlado; o banco preserva apenas referencias e metadados necessarios para autorizacao, auditoria e ciclo de vida.

### Discricionariedade do agente
Nenhuma decisao de produto foi delegada ao agente. O planejamento pode definir nomes de tipos, composicao visual, distribuicao complementar entre mobile e web, formato dos adaptadores, estrategia de URLs temporarias e mecanica de expiracao, desde que preserve todas as decisoes acima e a prioridade mobile-first.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Escopo, requisitos e arquitetura
- `.planning/ROADMAP.md` - define a Fase 8, os requisitos AUD-01, AUD-02, AUD-03 e PSH-04 e seus criterios de sucesso.
- `.planning/REQUIREMENTS.md` - exige auditoria do ciclo de tarefa, acesso por papel, evidencia fora do Postgres e veredito de seguranca antes do fechamento.
- `.planning/PROJECT.md` - define o valor central de zero vencidos, isolamento por loja, privilegio minimo e confirmacao fisica como fonte de seguranca.
- `AGENTS.md` - consolida custo zero, mobile-first, resiliencia offline, tipagem forte, seguranca e workflow GSD obrigatorio.
- `.planning/research/STACK.md` - define Expo/React Native, React/Vite, Hono/Cloudflare, Neon, R2, SQLite/outbox e adaptadores substituiveis.

### Decisoes anteriores
- `.planning/phases/07-offline-sync/07-CONTEXT.md` - define cache operacional, comandos idempotentes, conflitos explicitos e a proibicao de confundir acao local com confirmacao central.
- `.planning/phases/06-markdown-rebaixa-workflow/06-CONTEXT.md` - define etapas de rebaixa, responsabilidades e evidencia local que esta fase deve promover para storage controlado.
- `.planning/phases/05-push-and-escalation/05-CONTEXT.md` - define que confirmacao da lideranca e entrega de push nao resolvem risco fisico.
- `.planning/phases/04-today-task-workflow/04-CONTEXT.md` - define o veredito de seguranca, tarefas por lote, reconferencia e resolucao fisica compativel.

### Contratos, dominio e API existentes
- `packages/contracts/src/index.ts` - ja possui `ActorRoleSchema`, `ActorContextSchema`, `StoreContextSchema` e um `AuditEventSchema` minimo para evolucao.
- `packages/contracts/src/tasks.ts` - define tarefas, historico de resolucao, evidencia placeholder e metadados de sync usados como fontes de eventos.
- `packages/contracts/src/sync.ts` - define comandos offline, ack, retry e conflito que precisam alimentar os dois tempos da auditoria.
- `packages/domain/src/tasks.ts` - define as regras puras de tarefa, prioridade, responsavel e resolucoes compativeis que sustentam o fechamento.
- `apps/api/src/index.ts` - Hono atual possui seams in-memory de sync e alertas; autorizacao, auditoria e evidencia devem entrar por portas testaveis equivalentes.

### Mobile, persistencia e superficies
- `apps/mobile/src/capture/repository.ts` - fronteira local-first para lotes, tarefas, rebaixa, alertas e sync; precisa ganhar portas de auditoria, fechamento e evidencia sem espalhar provider SDKs.
- `apps/mobile/src/capture/sqlite-repository.ts` - persistencia local de observacoes, tarefas, historicos, rebaixa, alertas e outbox; ponto de integracao para eventos locais e fila de upload.
- `apps/mobile/src/capture/sqlite-migrations.ts` - padrao de migracoes idempotentes usado pelas extensoes locais.
- `apps/mobile/src/capture/TodayScreen.tsx` - superficie do veredito de seguranca e das pendencias que deve conduzir a lideranca ao fechamento sem enfraquecer `Hoje`.
- `apps/mobile/src/capture/TaskResolutionPanel.tsx` - coleta acoes fisicas e evidencia/motivo; deve usar identidade autorizada e gerar eventos auditaveis.
- `apps/mobile/src/capture/offline-sync-ui.tsx` - padrao existente para estados pendente, falho, conflito e retry que a fila de evidencia deve manter consistente.
- `apps/web/src/App.tsx` - web ainda e apenas smoke; pode receber a visao complementar de auditoria da lideranca sem substituir o fechamento mobile-first.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ActorRoleSchema`, `ActorContextSchema`, `StoreContextSchema` e `AuditEventSchema` ja estabelecem o vocabulario minimo de ator, papel, loja e evento.
- `TodayTaskRecord.resolutionHistory`, workflows de rebaixa, estados de alerta e registros de sync ja carregam fatos que podem produzir eventos auditaveis sem duplicar regra de dominio.
- `CaptureRepository` concentra as operacoes mobile e oferece uma fronteira tipada para acrescentar fechamento, consulta de auditoria e ciclo de evidencia.
- `TodayScreen` ja calcula o veredito da area de venda e apresenta cache, conflitos e pendencias diretamente abaixo dele.
- A outbox da Fase 7 ja separa acao local de ack central; a fila de upload de evidencia pode reutilizar a mesma linguagem de estado sem misturar os dois ciclos.
- A configuracao ja contempla R2 e as fixtures possuem object keys ficticias, sem binarios ou dados reais no repositorio.

### Established Patterns
- O mobile e local-first em SQLite; contratos Zod validam fronteiras e `packages/domain` permanece puro.
- Acoes fisicas e observacoes relevantes preservam historico em vez de sobrescrever fatos anteriores.
- `Hoje` e a fonte operacional da verdade; push, sync, evidencia e fechamento apoiam esse fluxo sem substituir confirmacao fisica.
- Copy visivel usa portugues operacional; codigo, tipos e enums usam ingles tecnico.
- Os papeis existem nos contratos e fixtures, mas a UI ainda usa labels locais fixos e nao ha aplicacao formal de RBAC por loja.
- A API atual e uma seam piloto in-memory; nao existe persistencia central duravel de auditoria nem upload real de evidencia.

### Integration Points
- Substituir labels fixos como `Colaborador local` e `Lideranca local` por contexto de ator/loja validado e aplicado na API.
- Gerar eventos no mesmo limite transacional das mudancas de tarefa, rebaixa, alerta, sync, evidencia e fechamento.
- Projetar eventos locais pendentes no mobile e reconciliar `occurredAt` com `receivedAt` depois do ack central.
- Ligar o checklist e o snapshot de fechamento ao veredito existente de `TodayScreen`, incluindo bloqueios de cache, sync e evidencia.
- Introduzir porta de storage/evidence upload atras de adaptador, mantendo binario fora dos contratos de comando e do Postgres.
- Usar a web como superficie complementar possivel para a busca geral de auditoria, sem tirar do celular o fechamento do turno.

</code_context>

<specifics>
## Specific Ideas

- O produto deve distinguir visual e semanticamente `Area segura para fechar` de `Turno encerrado com pendencias`.
- A passagem de turno deve mostrar pendencia, motivo, responsavel, prazo e confirmacao de recebimento sem sugerir resolucao.
- Na auditoria offline, usar linguagem equivalente a `Realizada no aparelho as {hora}` e `Recebida pelo sistema as {hora}`.
- Estados de evidencia precisam incluir pelo menos aguardando envio, enviando, enviada, falha e invalidada.
- A linha do tempo contextual deve privilegiar linguagem operacional; payloads tecnicos ficam em diagnostico autorizado.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 8-Audit, Roles, and Shift Close*
*Context gathered: 2026-06-22T00:12:46.0060434-03:00*
