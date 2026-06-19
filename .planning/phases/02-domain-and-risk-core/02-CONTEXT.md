# Phase 2: Domain and Risk Core - Context

**Gathered:** 2026-06-19T08:56:21.3747241-03:00
**Status:** Ready for planning

<domain>
## Phase Boundary

Esta fase entrega o nucleo de dominio do Validade Zero: modelos e regras puras para produtos, categorias, perfis de validade/qualidade, janelas de risco e calculo de estado operacional. O resultado deve viver em `packages/domain`, ser testado com TDD, e permanecer independente de UI, banco de dados, Hono, Neon, Cloudflare, Expo, provider SDKs ou persistencia real.

A fase nao cria cadastro mobile, banco real, tarefas persistentes, push, rebaixa completa, offline sync, auditoria persistida ou telas operacionais. Ela define a linguagem e as regras que essas fases vao consumir.

</domain>

<decisions>
## Implementation Decisions

### Tipos de produto e validade
- **D-01:** O dominio deve separar explicitamente produtos com validade formal de produtos controlados por qualidade/inspecao, evitando um modelo unico com campos opcionais ambiguos.
- **D-02:** A Fase 2 deve reconhecer tres modos operacionais base: `formal_validity`, `flv_inspection` e `receiving_monitored`.
- **D-03:** A categoria define o modo e o perfil de regra padrao, mas um produto especifico pode sobrescrever quando houver excecao operacional.
- **D-04:** Produto ou lote com informacao essencial ausente nao pode ser considerado seguro. Falta de validade formal, data de recebimento, janela de qualidade ou outro dado obrigatorio gera risco `uncertain` bloqueante e comando de correcao/conferencia.

### Janelas e estados de risco
- **D-05:** O motor deve calcular estados progressivos por severidade: `safe`, `radar`, `markdown_due`, `critical`, `expired` e `uncertain`.
- **D-06:** `uncertain` e um estado especial para dado insuficiente, confirmacao fisica vencida ou impossibilidade de afirmar seguranca; ele nao deve ser tratado como seguro silencioso.
- **D-07:** Quando multiplas regras se aplicarem ao mesmo lote, sempre vence o estado mais grave. Um lote vencido domina radar, rebaixa ou outros motivos secundarios.
- **D-08:** Perfis de regra devem nascer por categoria, com valores padrao e sobrescrita por produto.
- **D-09:** A janela padrao inicial deve ser 60 / 15 / 3 / 0 dias: radar ate 60 dias antes, rebaixa por volta de 15 dias, critico nos ultimos 3 dias e vencido apos a data/prazo aplicavel.

### Incerteza por presenca fisica
- **D-10:** A recencia maxima de conferencia fisica deve ser configuravel por categoria/produto, permitindo frequencias diferentes para ovos, FLV fresco e outros perfis.
- **D-11:** Quando a recencia de conferencia vence, o dominio deve produzir `uncertain` com acao obrigatoria de conferencia fisica.
- **D-12:** Confirmacao fisica valida exige uma acao concreta com resultado observado: presente com quantidade aproximada, movido, retirado, perda, nao encontrado ou provavelmente esgotou. Check-in generico nao resolve incerteza.
- **D-13:** `not_found` e `probably_sold_out` resolvem a pendencia imediata apenas de forma condicional e rastreavel; a regra pode exigir reconferencia futura e o dominio nao deve transformar esses resultados em certeza definitiva.

### Vocabulario operacional do dominio
- **D-14:** O resultado do dominio deve expor estado calculado, comando operacional recomendado e motivos estruturados.
- **D-15:** Os comandos minimos da Fase 2 sao `check_presence`, `request_markdown`, `withdraw_now`, `monitor` e `correct_data`.
- **D-16:** Codigo, tipos e enums devem usar ingles tecnico estavel; labels e copy humana devem ser portugues-BR.
- **D-17:** Motivos devem ser estruturados e testaveis, por exemplo `expires_in_15_days`, `presence_stale`, `missing_required_date` ou `expired`. Texto pronto de UI nao deve ser a fonte da regra.
- **D-18:** A Fase 2 deve deixar claro para fases futuras qual e o comando operacional, mas sem criar tarefas persistentes, telas, notificacoes ou workflows de execucao.

### Discricionariedade do agente
Nenhuma decisao foi delegada ao agente durante a discussao. O planejamento deve seguir as decisoes acima.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planejamento e escopo
- `.planning/ROADMAP.md` - define o limite da Fase 2, requisitos CAT-04, LOC-04, RSK-01, RSK-02 e criterios de sucesso.
- `.planning/REQUIREMENTS.md` - define os requisitos de catalogo, localizacao/presenca, risco/tarefas, constraints de qualidade e rastreabilidade v1.
- `.planning/PROJECT.md` - define valor central, constraints, contexto operacional e decisoes de produto.
- `AGENTS.md` - consolida instrucoes do projeto e obrigatoriedade de usar fluxo GSD antes de edicoes.

### Contexto anterior e stack
- `.planning/phases/01-engineering-foundation/01-CONTEXT.md` - trava a Fase 1 como fundacao tecnica e preserva a regra de que `packages/domain` nao depende de UI, banco, provider SDKs ou apps.
- `.planning/research/STACK.md` - define estrategia de tipos fortes, dominio separado de persistencia, Vitest para regras de dominio e StrykerJS para regras criticas.

### Codigo existente
- `packages/domain/src/index.ts` - boundary reservado para regras futuras de risco, lote, tarefa e auditoria.
- `packages/contracts/src/index.ts` - contratos Zod existentes para actor/store/audit context que podem orientar fronteiras futuras, sem puxar dominio para contratos prematuramente.
- `packages/test-utils/src/fixtures.ts` - fixtures ficticias seguras para exemplos de produto, lote, loja, usuario e evidencia.
- `scripts/check-boundaries.mjs` - valida que `packages/domain` nao importe apps, UI, provider SDKs, banco ou adapters.
- `eslint.config.mjs` - reforca `no-explicit-any`, lint type-aware e restricoes de import para o pacote de dominio.

No separate `02-SPEC.md` exists; requirements are captured in roadmap, requirements, prior context and the decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/domain` ja existe como pacote reservado, com `DOMAIN_BOUNDARY` e scripts basicos. A Fase 2 deve substituir o placeholder por modelos, funcoes puras e testes reais.
- `packages/test-utils` ja oferece dados ficticios de loja, usuario, produto, lote e evidencia. Novos fixtures devem continuar marcados como ficticios/exemplo.
- `packages/contracts` ja contem actor/store/audit context em Zod. A Fase 2 pode usar isso como referencia de linguagem, mas nao deve acoplar regras puras a API, banco ou provider.

### Established Patterns
- TypeScript strict, lint type-aware, proibicao de `any` injustificado e dependency-boundary checks ja estao ativos.
- O pacote de dominio deve continuar puro: sem React, React Native, Hono, Drizzle, Neon, Cloudflare, Expo ou adapters.
- Testes de dominio devem ser Vitest e preparar estrutura mutation-ready para StrykerJS nas regras criticas.

### Integration Points
- A implementacao principal conecta em `packages/domain/src/index.ts` e arquivos internos novos no mesmo pacote.
- Scripts root `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:mutation` e `pnpm check` devem continuar sendo a forma de verificar a fase.
- Fases futuras devem consumir o dominio para cadastro mobile, tarefas, push, rebaixa, offline sync e auditoria, mas esta fase so entrega regras puras.

</code_context>

<specifics>
## Specific Ideas

- A regra central da fase e: nada vira seguro por silencio, dado incompleto ou ausencia de venda/estoque.
- "Nao encontrado" e "provavelmente esgotou" precisam aliviar a pendencia imediata sem apagar incerteza operacional nem rastreabilidade.
- A copy humana deve ja nascer com vocabulos operacionais em portugues-BR, mas o codigo deve preservar enums e tipos em ingles tecnico.
- O dominio deve produzir motivos estruturados para explicar cada resultado e facilitar testes, auditoria e UI futura.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 2-Domain and Risk Core*
*Context gathered: 2026-06-19T08:56:21.3747241-03:00*
