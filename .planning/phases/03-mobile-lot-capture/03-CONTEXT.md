# Phase 3: Mobile Lot Capture - Context

**Gathered:** 2026-06-19T12:38:21.2651051-03:00
**Status:** Ready for planning

<domain>
## Phase Boundary

Esta fase entrega o primeiro fluxo mobile do Validade Zero para localizar ou cadastrar produtos, registrar lotes e confirmar sua presenca fisica por localizacao. O fluxo deve capturar a ultima observacao com usuario, horario, local e quantidade aproximada, deixando os riscos e pendencias visiveis sem transforma-los ainda em tarefas.

A fase nao cria tarefas persistentes, push, escalonamento, workflow Hoje, rebaixa, fila offline, auditoria completa, roles, upload de evidencias ou painel analitico. Essas capacidades pertencem as fases posteriores do roadmap.

</domain>

<decisions>
## Implementation Decisions

### Cadastro guiado
- **D-01:** A camera ou leitura de codigo deve assistir a busca do produto, nunca registrar algo automaticamente; a pessoa sempre confirma o produto antes de informar o lote.
- **D-02:** Quando um codigo nao encontrar produto, o fluxo abre um cadastro minimo de produto e retorna diretamente ao cadastro do lote.
- **D-03:** A categoria deve aplicar o perfil operacional padrao do produto; sobrescritas de perfil existem apenas como excecoes explicitas por produto.
- **D-04:** Um lote confirmado exige produto, identificacao de lote, quantidade aproximada, local inicial e as datas exigidas pelo modo do produto. Dados essenciais ausentes nao podem gerar um lote confirmado.
- **D-05:** Apos salvar, o app deve confirmar brevemente o registro e oferecer cadastrar outro lote mantendo produto, categoria e perfil, mas exigindo nova confirmacao de lote, data, quantidade e local.

### Produto e lote
- **D-06:** Sem camera, a pessoa encontra produtos por busca de nome ou codigo, com atalhos para produtos recentes ou frequentes e navegacao por categoria como apoio.
- **D-07:** Nome, categoria e perfil operacional sao obrigatorios no produto; fornecedor e GTIN podem faltar quando indisponiveis, mas devem ficar visivelmente pendentes para completar.
- **D-08:** O codigo impresso do lote deve ser registrado quando existir. Sem codigo legivel, o sistema gera uma identificacao interna clara para o agrupamento fisico, sem apresenta-la como codigo de fornecedor.
- **D-09:** Validade, recebimento e inspecao devem usar digitacao guiada com teclado ou picker, validacao de formato, data por extenso e janela operacional calculada imediatamente.

### Movimentacao fisica
- **D-10:** A conferencia comeca pela acao observada: presente, mover, retirar, perda, nao encontrado ou provavelmente esgotou. O fluxo pede apenas os campos pertinentes antes da confirmacao final.
- **D-11:** Os locais rapidos sao Area de venda, estoque, camara fria, ilha promocional e retirada/perda. Outro local e permitido somente com um nome identificavel.
- **D-12:** A quantidade deve ser uma estimativa explicita e rastreavel: a ultima quantidade e pre-preenchida, mas uma nova estimativa e confirmada nas acoes de presenca ou movimentacao. Nao estimavel mantem o lote incerto.
- **D-13:** Retirada, perda, nao encontrado e provavelmente esgotou exigem confirmacao reforcada com resumo de lote, acao, local e quantidade. Evidencia fotografica formal fica para a Fase 8.

### Consulta apos registro
- **D-14:** A visao inicial apos registros e uma lista operacional recente com produto, lote, ultima acao, local, horario, quantidade aproximada e pendencia ou incerteza; tocar abre o detalhe.
- **D-15:** Correcoes devem ser novas observacoes com motivo, preservando o registro anterior e atualizando a ultima presenca; a auditoria completa e a visualizacao extensa do historico pertencem a Fase 8.
- **D-16:** A consulta deve buscar por produto, codigo ou lote e filtrar pela localizacao atual, mantendo a lista recente como atalho inicial.
- **D-17:** A lista deve destacar apenas o que exige cuidado operacional: cadastro pendente, presenca incerta ou vencida e estados criticos ou vencidos. Ela nao cria tarefas nesta fase.

### Discricionariedade do agente
Nenhuma decisao foi delegada ao agente durante a discussao. O planejamento deve seguir as decisoes acima.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planejamento e escopo
- `.planning/ROADMAP.md` - define o objetivo, os requisitos CAT-01, CAT-02, CAT-03, LOC-01, LOC-02 e LOC-03, e os criterios de sucesso da Fase 3.
- `.planning/REQUIREMENTS.md` - define requisitos de catalogo, lote, localizacao, presenca, qualidade e limites de v1.
- `.planning/PROJECT.md` - define o valor central, o contexto de hortifruti, os locais operacionais, a entrada hibrida e as constraints do piloto.
- `AGENTS.md` - define stack, seguranca, qualidade, experiencia mobile-first e obrigatoriedade do fluxo GSD.

### Decisoes anteriores e arquitetura
- `.planning/phases/02-domain-and-risk-core/02-CONTEXT.md` - trava os modos de produto, estados de risco, comandos operacionais, recencia de presenca e a regra de que incerteza nunca vira seguranca silenciosa.
- `.planning/phases/01-engineering-foundation/01-CONTEXT.md` - define tipagem estrita, dados ficticios, adaptadores e limites de dependencia do dominio.
- `.planning/research/STACK.md` - define Expo, Zod, contratos tipados, estrategia de testes e limites da arquitetura do piloto.

### Codigo existente
- `apps/mobile/App.tsx` - ponto de entrada Expo atual que a Fase 3 deve substituir pelo primeiro fluxo operacional mobile.
- `packages/domain/src/types.ts` - define modos de produto, entradas de lote, estados de risco e vocabulario de confirmacao fisica.
- `packages/domain/src/presence.ts` - define a confirmacao fisica e sua classificacao de recencia.
- `packages/domain/src/risk.ts` - calcula risco, incerteza e o tratamento condicional de nao encontrado ou provavelmente esgotou.
- `packages/domain/src/index.ts` - define a fronteira pura de dominio e exporta os modulos reutilizaveis.
- `packages/contracts/src/index.ts` - fornece schemas Zod existentes para actor, loja e eventos auditaveis futuros.
- `packages/test-utils/src/fixtures.ts` - fornece fixtures ficticias de loja, usuario, produto, lote e evidencia.

No separate `03-SPEC.md` exists; requirements are captured in roadmap, requirements, prior context and the decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/domain/src/types.ts`, `packages/domain/src/presence.ts` e `packages/domain/src/risk.ts` ja fornecem o vocabulario de produto, lote, presenca e risco que a interface deve consumir, sem duplicar regras em componentes.
- `packages/contracts/src/index.ts` ja possui schemas Zod de actor e loja que podem orientar fronteiras de captura sem acoplar a UI a infraestrutura futura.
- `packages/test-utils/src/fixtures.ts` oferece dados seguros para testes e exemplos do fluxo mobile.

### Established Patterns
- `packages/domain` permanece puro e nao pode importar React Native, apps, banco ou SDKs de provedores.
- O app mobile atual e somente um smoke Expo com `StyleSheet`; nao ha design system nem navegacao existentes para preservar.
- Tipagem estrita, validacao nas fronteiras, proibicao de `any` injustificado e dados inteiramente ficticios sao padroes ativos do repositorio.

### Integration Points
- `apps/mobile/App.tsx` e o ponto de entrada da primeira experiencia de captura mobile.
- O novo fluxo deve mapear suas escolhas de produto, lote e confirmacao para os tipos e regras de `packages/domain`.
- Contratos de actor e loja devem manter o caminho aberto para persistencia e auditoria posteriores, sem antecipar seus provedores ou UI completa.

</code_context>

<specifics>
## Specific Ideas

- A leitura por camera ajuda, mas o humano confirma produto, lote, data, quantidade e local; o fluxo nao depende de scanner ou OCR.
- O cadastro repetido do mesmo produto deve ser rapido sem reutilizar silenciosamente dados do lote anterior.
- A interface deve usar labels operacionais em portugues-BR; enums e tipos do dominio continuam em ingles tecnico estavel.
- A consulta deve tornar a incerteza visivel, mas a fila de tarefas por risco so nasce na Fase 4.

</specifics>

<deferred>
## Deferred Ideas

- Leitura automatica de datas por OCR e cadastro de lotes em grade podem ser reavaliados depois de validar a rotina real, mas nao entram nesta fase.
- Evidencias fotografias, trilha completa de auditoria e roles pertencem a Fase 8.
- Priorizacao de tarefas, tela Hoje, push e escalonamento pertencem as Fases 4 e 5.

</deferred>

---

*Phase: 3-Mobile Lot Capture*
*Context gathered: 2026-06-19T12:38:21.2651051-03:00*
