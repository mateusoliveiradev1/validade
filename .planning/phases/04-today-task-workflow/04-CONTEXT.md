# Phase 4: Today Task Workflow - Context

**Gathered:** 2026-06-19T22:38:21.0407486-03:00
**Status:** Ready for planning

<domain>
## Phase Boundary

Esta fase transforma os riscos calculados e as observações físicas já existentes em uma tela mobile "Hoje" que direciona o trabalho de prateleira no turno atual. Ela deve criar tarefas persistentes por lote acionável, mostrar se a área de venda está segura, orientar a pessoa para a ação correta e impedir que um risco crítico pareça resolvido sem confirmação física compatível.

A Fase 4 não implementa push, lembretes recorrentes, escalonamento externo, workflow completo de rebaixa, fila offline, auditoria completa, roles avançadas, fechamento de turno ou armazenamento/sincronização completa de evidências. Essas capacidades pertencem às fases posteriores do roadmap. A Fase 4 pode preparar os contratos e a UI para evidência visual, mas não deve puxar toda a infraestrutura de foto/R2/auditoria para dentro desta fase.

</domain>

<decisions>
## Implementation Decisions

### Geração e prioridade das tarefas
- **D-01:** Somente riscos acionáveis viram tarefa na Fase 4: `expired`, `critical`, `markdown_due` e `uncertain`.
- **D-02:** `radar` não vira tarefa do turno. Ele pode aparecer como atenção futura ou monitoramento discreto, sem misturar com a execução do "Hoje".
- **D-03:** A lista "Hoje" prioriza risco real na área de venda acima de qualquer outro critério: vencido na área de venda, crítico na área de venda e presença incerta na área de venda aparecem antes de rebaixa e demais locais.
- **D-04:** Cada tarefa nasce por lote. A UI pode agrupar visualmente por produto/local, mas não pode esconder lotes individuais dentro de uma tarefa grande.
- **D-05:** As tarefas são geradas ou atualizadas ao abrir "Hoje", ao atualizar a tela e depois de cada registro de lote ou observação física. A Fase 4 não depende de push, cron ou escalonamento.

### Resolução permitida e validação forte
- **D-06:** Uma tarefa só fecha com ação compatível com o risco. Confirmar presença não resolve lote vencido; vencido exige retirada/perda; incerteza exige observação física concreta compatível; rebaixa pendente pode fechar a tarefa atual com "rebaixa solicitada" nesta fase.
- **D-07:** Ações condicionais fecham a tarefa atual, mas deixam nova pendência de reconferência ou acompanhamento quando ainda não existe segurança final. Isso vale para "não encontrado", "provavelmente esgotou" e "rebaixa solicitada".
- **D-08:** Ações críticas exigem confirmação reforçada antes de concluir, mostrando produto, lote, local, quantidade, ação escolhida e consequência em linguagem direta.
- **D-09:** Se a pessoa tenta resolver com uma ação incompatível, a UI deve bloquear, explicar por quê e sugerir a ação correta. Exemplo: "Este lote está vencido. Para proteger a área de venda, retire ou registre perda."
- **D-10:** Para lote vencido que estava na área de venda, retirada não basta sozinha. A tarefa de retirada exige confirmação reforçada, destino obrigatório `Retirada/perda` e cria uma tarefa curta de reconferência da área de venda.
- **D-11:** O topo "Área de venda segura" só pode voltar ao estado seguro após a reconferência do item vencido/crítico que estava na área de venda.
- **D-12:** A reconferência de área de venda deve pedir evidência visual quando possível, como foto da prateleira/área ou do produto retirado. Se a foto não puder ser feita, a pessoa precisa registrar motivo explícito, por exemplo câmera indisponível, permissão operacional ausente ou ambiente sem autorização de foto.
- **D-13:** Foto/evidência nesta fase é uma exigência operacional e de contrato/UX. Armazenamento, sincronização offline, R2, controle de acesso e auditoria completa da evidência ficam para fases posteriores.

### Tela "Hoje" e sensação operacional
- **D-14:** O topo da tela "Hoje" responde primeiro o estado da área de venda: "Área de venda segura" ou uma mensagem direta com o número/tipo de riscos na área de venda.
- **D-15:** Quando não há risco crítico na área de venda, mas ainda existem tarefas do turno, o topo separa segurança de trabalho pendente: "Área de venda segura, ainda há tarefas do turno."
- **D-16:** Risco crítico na área de venda ativa modo visual dominante: banner forte, primeira tarefa em destaque e CTA direto como "Retirar agora" ou "Conferir agora". Não usar modal bloqueante por padrão.
- **D-17:** A tela organiza tarefas por urgência operacional, com seções como "Retirar agora", "Conferir na área de venda", "Pedir rebaixa" e "Acompanhar".
- **D-18:** Cada card mostra de cara ação, produto/lote, local e prazo/severidade. O card deve ser pequeno, mas não misterioso.
- **D-19:** A copy é direta, operacional e sem culpa. Exemplos de tom: "Retirar agora", "Conferir presença", "Pedir rebaixa", "Rever em 2h". Evitar tanto linguagem punitiva quanto texto administrativo frio.
- **D-20:** `radar` aparece no fim da tela como faixa discreta "Atenção futura", sem virar tarefa.
- **D-21:** Quando não há tarefas acionáveis, o empty state diz "Área de venda segura agora" e oferece caminho para registrar ou conferir lotes.

### Responsável e prazo
- **D-22:** A tarefa nasce com dono operacional simples: "equipe do turno". Ela pode ser assumida por um colaborador com nome/label local, sem RBAC pesado nesta fase.
- **D-23:** O colaborador pode resolver direto; assumir é opcional e automático ao agir. Se a tarefa estava sem dono individual, o app registra a pessoa da ação como responsável local.
- **D-24:** Prazo nasce por severidade e ação exigida: retirada/vencido é "agora"; crítico é ainda no turno; rebaixa é hoje; acompanhamento usa janela curta configurável.
- **D-25:** Tarefa atrasada fica fixada no topo e muda copy/visual para atrasada. A Fase 4 cobra dentro da tela "Hoje"; push e escalonamento ficam para a Fase 5.

### Discricionariedade do agente
Nenhuma decisão foi delegada ao agente durante a discussão. O planejamento deve seguir as decisões acima.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planejamento e escopo
- `.planning/ROADMAP.md` - define a Fase 4 como "Today Task Workflow", seus requisitos RSK-03, RSK-04, PSH-03, UI-01, UI-02 e UI-03, e seus critérios de sucesso.
- `.planning/REQUIREMENTS.md` - define requisitos de tarefas, tela "Hoje", ações concretas, mobile-first, copy operacional e limites v1.
- `.planning/PROJECT.md` - define o valor central de zero vencido na área de venda, a ausência de vendas/estoque, o papel da presença física e a regra de que push não substitui tarefa persistente.
- `AGENTS.md` - consolida stack, qualidade, segurança, restrições do projeto e obrigatoriedade de usar o fluxo GSD antes de edições.

### Decisões anteriores
- `.planning/phases/03-mobile-lot-capture/03-CONTEXT.md` - trava captura mobile, lista recente, observações físicas append-only, locais operacionais, quantidade estimada e a decisão de que tarefas nascem apenas na Fase 4.
- `.planning/phases/02-domain-and-risk-core/02-CONTEXT.md` - trava estados de risco, comandos operacionais, incerteza por presença física, `not_found`/`probably_sold_out` condicionais e a regra de que incerteza nunca vira segurança silenciosa.
- `.planning/phases/01-engineering-foundation/01-CONTEXT.md` - trava tipagem estrita, dados fictícios, testes, boundaries e domínio puro.
- `.planning/research/STACK.md` - define Expo/React Native, contratos Zod, domínio tipado, testes e limites da arquitetura de custo zero.

### Código existente
- `apps/mobile/App.tsx` - ponto de entrada Expo atual que instancia o repositório SQLite e renderiza `CaptureApp`.
- `apps/mobile/src/capture/CaptureApp.tsx` - orquestra o fluxo mobile atual de descoberta, cadastro, lote, lista recente, detalhe e observação; a tela "Hoje" deve se integrar sem apagar o fluxo de captura.
- `apps/mobile/src/capture/RecentLotList.tsx` - lista lotes recentes por produto/código/lote/local e já mostra última observação, quantidade e atenção de presença incerta.
- `apps/mobile/src/capture/LotDetailScreen.tsx` - mostra detalhe de lote e aciona nova observação; é referência para abrir uma tarefa em detalhe.
- `apps/mobile/src/capture/ObservationComposer.tsx` - fluxo existente para observações físicas e ações como presente, mover, retirar, perda, não encontrado e provavelmente esgotado.
- `apps/mobile/src/capture/ConfirmationSheet.tsx` - referência de confirmação reforçada já usada na captura.
- `apps/mobile/src/capture/repository.ts` - define `CaptureRepository`, snapshots/detalhes de lote, observações e queries recentes que a Fase 4 pode estender ou adaptar.
- `apps/mobile/src/capture/sqlite-repository.ts` - persistência local atual de produtos, lotes e observações; a Fase 4 deve preservar a lógica de snapshots e observações append-only.
- `apps/mobile/src/capture/capture-copy.ts` - vocabulário PT-BR operacional, locais, ações de observação e formatação de tempo/local.
- `apps/mobile/src/capture/capture-ui.tsx` - primitives atuais de UI mobile, ações, seleção, campos e avisos.
- `packages/domain/src/types.ts` - define estados de risco, comandos operacionais, motivos e tipos de produto/lote.
- `packages/domain/src/risk.ts` - calcula risco, severidade, comando operacional e incerteza por presença física.
- `packages/domain/src/presence.ts` - define confirmação física e recência.
- `packages/contracts/src/capture.ts` - schemas Zod de produto, lote, localização e observação física.

No separate `04-SPEC.md` exists; requirements are captured in roadmap, requirements, prior context and the decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/domain/src/risk.ts` já calcula `RiskAssessment` com `state`, `command` e `reasons`. A geração de tarefas deve consumir essa saída em vez de duplicar regras de risco na UI.
- `packages/domain/src/types.ts` já define `expired`, `critical`, `markdown_due`, `uncertain`, `radar` e comandos como `check_presence`, `request_markdown`, `withdraw_now`, `monitor` e `correct_data`.
- `apps/mobile/src/capture/repository.ts` e `sqlite-repository.ts` já persistem produtos, lotes, última observação e histórico de observações localmente. A Fase 4 pode adicionar uma camada de tarefas sem quebrar o ledger de observações.
- `RecentLotList`, `LotDetailScreen`, `ObservationComposer`, `ConfirmationSheet`, `capture-copy.ts` e `capture-ui.tsx` oferecem primitives e linguagem operacional para reaproveitar na tela "Hoje".

### Established Patterns
- O app mobile atual é local-first em SQLite e usa contratos Zod nas fronteiras de captura.
- Observações físicas são append-only e atualizam apenas o snapshot atual do lote, preservando fatos anteriores.
- Código e enums ficam em inglês técnico; copy humana fica em português-BR.
- Dados reais, fotos reais e segredos não entram no repositório público. Evidências devem ser simuladas/fictícias em testes.
- `packages/domain` deve continuar puro: sem React Native, Expo, SQLite, UI ou provider SDKs.

### Integration Points
- `CaptureApp` precisa ganhar uma entrada para "Hoje" sem remover o fluxo de registro/lotes recentes.
- A Fase 4 deve criar ou estender contratos para tarefa, resolução de tarefa, reconferência e possível evidência visual mínima, mantendo storage real de evidências para fases posteriores.
- A tela "Hoje" deve chamar ações de observação física existentes quando a resolução da tarefa exigir presença, retirada, perda, não encontrado ou provavelmente esgotado.
- A geração de tarefas deve usar `calculateLotRisk` com os lotes e últimas observações já persistidos, priorizando área de venda.

</code_context>

<specifics>
## Specific Ideas

- A tela "Hoje" é a fonte operacional da verdade na Fase 4: ela deve responder se a área de venda está segura antes de listar tarefas.
- O produto deve impedir o "clique mágico" em que alguém toca em retirar e o risco some sem validação forte.
- Para vencido/crítico na área de venda, segurança só volta depois de retirada/perda com destino correto e reconferência da área de venda, preferencialmente com foto ou motivo explícito quando foto não for possível.
- A experiência deve ser mobile-first, de corredor, com CTAs fortes, estados críticos claros e copy direta sem culpabilizar a equipe.
- A Fase 4 deve manter o caminho aberto para push/escalonamento, rebaixa completa, offline sync e auditoria/evidência completa, mas não deve implementar essas fases agora.

</specifics>

<deferred>
## Deferred Ideas

- Push, lembretes recorrentes, repetição e escalonamento ficam para a Fase 5.
- Workflow completo de rebaixa, aprovação, aplicação e foto de etiqueta fica para a Fase 6.
- Fila offline, comandos idempotentes e conflitos de sync ficam para a Fase 7.
- Auditoria completa, roles formais, evidências com armazenamento controlado e fechamento de turno ficam para a Fase 8.
- Impeccable hardening final de UI/copy/acessibilidade fica para a Fase 9, embora a Fase 4 já deva nascer com copy e acessibilidade operacional fortes.

</deferred>

---

*Phase: 4-Today Task Workflow*
*Context gathered: 2026-06-19T22:38:21.0407486-03:00*
