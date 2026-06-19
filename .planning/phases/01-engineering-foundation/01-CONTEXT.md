# Phase 1: Engineering Foundation - Context

**Gathered:** 2026-06-18T23:39:48.9055420-03:00
**Status:** Ready for planning

<domain>
## Phase Boundary

Esta fase entrega a fundacao tecnica do Validade Zero: monorepo pnpm/Turborepo, apps base, pacotes compartilhados, quality gates, CI, seguranca de repositorio publico, configuracao segura e estrutura inicial de testes. Ela nao implementa regras de negocio, banco real, auditoria persistida, telas operacionais completas ou integracoes obrigatorias com provedores.

</domain>

<decisions>
## Implementation Decisions

### Formato do monorepo inicial
- **D-01:** Criar uma estrutura completa minima desde a Fase 1, com `apps/mobile`, `apps/web`, `apps/api` e pacotes compartilhados essenciais.
- **D-02:** Cada app deve ter smoke real: mobile Expo bootavel, web Vite bootavel e API Hono com endpoint de health check.
- **D-03:** Criar pacotes compartilhados explicitos para contratos, configuracao, utilidades de teste e um espaco preparado para dominio, sem antecipar regras da Fase 2.
- **D-04:** Documentar um README operacional completo com instalacao, comandos de dev, checks, `.env`, limites do piloto gratuito e regras contra segredos ou dados reais.

### Rigor dos quality gates
- **D-05:** Quality gates devem ser bloqueantes desde o inicio: typecheck, lint, format check, testes basicos, auditoria/secret checks e CI falham quando algo quebra.
- **D-06:** TypeScript deve operar com `strict: true`, lint type-aware, validacao em fronteiras e regra contra `any` injustificado. Excecoes precisam de justificativa explicita.
- **D-07:** Dependency boundaries devem ser automatizados desde ja, impedindo imports indevidos entre apps/pacotes, protegendo `domain` de UI/infra e mantendo contratos compartilhados limpos.
- **D-08:** GitHub Actions deve executar o baseline completo: install, typecheck, lint, format check, testes, build/smoke e checks de seguranca compativeis com custo zero.
- **D-09:** Achados de seguranca `high` ou `critical` bloqueiam aprovacao. Achados medios viram risco documentado ou backlog.

### Estrategia inicial de testes
- **D-10:** A Fase 1 deve preparar a piramide completa, com smoke inicial: Vitest para unit/dominio, integracao preparada para API/banco, Playwright para web, Maestro para mobile e StrykerJS reservado para regras criticas.
- **D-11:** Nesta fase, os testes devem ser smokes e exemplos minimos onde fizer sentido; nao deve haver cobertura artificial de funcionalidades ainda inexistentes.
- **D-12:** TDD e contrato de trabalho para regras criticas: a Fase 1 cria scripts, exemplos e documentacao; da Fase 2 em diante, regras criticas devem nascer com testes antes ou junto da implementacao.
- **D-13:** Fixtures e dados de teste devem ser fake operacional seguro, em portugues, sem nomes reais da rede, lojas reais, usuarios reais, fotos reais ou dados operacionais verdadeiros.
- **D-14:** Cobertura deve ser baseline visivel nesta fase, sem meta global artificial. Metas mais fortes entram quando regras criticas existirem.
- **D-15:** A matriz E2E futura deve cobrir todos os fluxos operacionais criticos quando nascerem: cadastro/lote, Hoje/tarefas, rebaixa, push/escalonamento, offline/sync e auditoria/fechamento.

### Seguranca de repo publico e configuracao
- **D-16:** Segredos e dados reais tem tolerancia zero desde o inicio: `.env.example` sem valores reais, `.gitignore` forte, validacao de env, secret scanning, docs de operacao segura e fixtures explicitamente ficticias.
- **D-17:** Neon, Cloudflare, R2 e Expo Push devem nascer por adaptadores, variaveis de ambiente e mocks/fakes, sem credenciais reais nem conexao obrigatoria nesta fase.
- **D-18:** Incluir threat model leve ja na Fase 1, cobrindo repo publico, auth futura, dados de loja, evidencias/fotos e offline sync, com referencia proporcional a OWASP ASVS/MASVS.
- **D-19:** Dados reais ficam proibidos no repo. Exemplos permitidos: produtos, lojas e usuarios ficticios, fotos sinteticas ou placeholders.
- **D-20:** Preparar convencoes para auditoria futura, sem implementar audit log completo: IDs, timestamps, actor/store context e eventos auditaveis. Persistencia e UI de auditoria ficam para fases futuras.

### Discricionariedade do agente
Nenhuma decisao foi delegada ao agente durante a discussao. O planejamento deve seguir as decisoes acima.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planejamento e escopo
- `.planning/ROADMAP.md` - define o limite da Fase 1, requisitos cobertos e criterios de sucesso.
- `.planning/REQUIREMENTS.md` - define FND-01, FND-02, FND-03, FND-04, AUD-04 e restricoes de v1.
- `.planning/PROJECT.md` - define valor central, contexto operacional, constraints e decisoes de produto.

### Stack e convencoes operacionais
- `.planning/research/STACK.md` - define stack recomendada: pnpm/Turborepo, Expo, React/Vite, Hono, Neon, Drizzle, Zod/Hono RPC, Cloudflare, R2, Expo Push, GitHub Actions e estrategia de testes/seguranca.
- `AGENTS.md` - consolida instrucoes do projeto, constraints, stack, convencoes e obrigatoriedade de fluxo GSD antes de edicoes.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Nenhum asset de codigo ainda. O repositorio contem principalmente arquivos de planejamento, `.codex`, `.agents`, `AGENTS.md` e a pasta da fase.

### Established Patterns
- A arquitetura ainda nao esta implementada. Os padroes vigentes vem dos documentos de planejamento: monorepo pnpm/Turborepo, monolito modular, tipos fortes end-to-end, validacao Zod nas fronteiras, adaptadores para provedores e custo zero no piloto.
- Nao existem mapas em `.planning/codebase/*.md`; planner e executor devem criar a fundacao em vez de procurar componentes existentes.

### Integration Points
- Criar os pontos iniciais de integracao: workspaces pnpm, pipeline Turbo, apps `mobile`, `web` e `api`, pacotes compartilhados, env validation, CI, scripts de teste e documentacao.
- Provedores externos devem entrar apenas como interfaces/adaptadores/mocks nesta fase.

</code_context>

<specifics>
## Specific Ideas

- A base deve ser real o suficiente para rodar e testar, mas sem escopo funcional de negocio.
- A linguagem de exemplos, fixtures e documentacao operacional deve ser portugues-BR.
- O projeto deve proteger o futuro dominio desde cedo: `domain` nao pode depender de UI, banco, provider SDK ou infra.
- O README deve orientar um colaborador tecnico a instalar, rodar, validar e evitar vazamento de segredos/dados reais.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 1-Engineering Foundation*
*Context gathered: 2026-06-18T23:39:48.9055420-03:00*
