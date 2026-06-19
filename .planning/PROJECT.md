# Validade Zero

## What This Is

Validade Zero é um aplicativo operacional, mobile-first, para colaboradores e lideranças de hortifruti em uma grande rede de supermercados. Ele acompanha produtos com validade por lote e localização, transforma riscos em tarefas com responsáveis e usa alertas fortes, cobranças e escalonamento até que cada pendência seja resolvida e confirmada na área de venda.

O aplicativo complementa os sistemas e relatórios existentes da rede. Ele não depende de acesso às vendas: trabalha com recebimentos, última presença física observada, conferências orientadas, movimentações, rebaixas, retiradas e evidências de execução.

## Core Value

Garantir que nenhum produto vencido permaneça na área de venda, mantendo cada risco visível e acionável até sua resolução confirmada.

## Requirements

### Validated

- [x] Validated in Phase 1: Base de engenharia com pnpm/Turborepo, TypeScript strict, quality gates, CI/security baseline e segurança para repositório público.
- [x] Validated in Phase 2: O domínio diferencia produtos com validade formal, FLV por qualidade/inspeção e recebimento monitorado.
- [x] Validated in Phase 2: Regras de risco por categoria/produto suportam janelas configuráveis, incluindo radar de 60 dias, rebaixa de 15 dias, crítico nos últimos 3 dias e retirada após vencimento.
- [x] Validated in Phase 2: Lotes arriscados com dados essenciais ausentes ou presença física vencida permanecem `uncertain` em vez de seguros.

### Active

- [ ] Colaboradores podem cadastrar e acompanhar produtos com validade por produto, lote, quantidade e localização.
- [ ] Cada risco gera uma tarefa com responsável, prazo, status, histórico e confirmação de execução.
- [ ] Alertas push, lembretes recorrentes, caixa de tarefas e escalonamento continuam cobrando enquanto a pendência não for resolvida.
- [ ] A tela principal mostra o que precisa ser conferido, rebaixado ou retirado no turno atual.
- [ ] Colaboradores podem confirmar presença física, quantidade aproximada, esgotamento, movimentação, rebaixa, retirada e perda.
- [ ] O fechamento do turno evidencia se a área de venda está segura ou ainda possui itens críticos pendentes.
- [ ] O aplicativo funciona principalmente no celular e também oferece uma experiência adequada no desktop.
- [ ] A operação essencial continua com conexão instável por meio de uma fila offline sincronizável.
- [ ] Lideranças podem auditar quem realizou cada ação, quando, onde e com qual evidência.
- [ ] A interface, a experiência e a copy são tratadas como requisitos de qualidade e passam pelos fluxos da skill Impeccable.

### Out of Scope

- Integração direta com vendas, estoque ou ERP na primeira versão - a rede ainda não oferece esse acesso.
- Previsão precisa de demanda ou venda por produto - sem dados transacionais, o app trabalha com presença física observada.
- Alteração automática de preço no sistema corporativo - a primeira versão acompanha a solicitação, aprovação, aplicação e conferência da rebaixa.
- Controle de validade legal para FLV fresco que não possui prazo declarado - esses itens usam regras de qualidade e inspeção.
- Distribuição paga em lojas de aplicativos durante o piloto - conflita com a restrição inicial de custo zero.

## Context

- A rede possui sistemas e relatórios, mas a rotina do setor ainda depende de pedir relatórios e conferir datas manualmente.
- O objetivo nasceu da necessidade concreta de nunca mais encontrar ovos vencidos na área de venda e se estende a qualquer produto com validade.
- A política operacional trabalha preventivamente com uma janela de até 60 dias, mas ovos e outras categorias exigem regras próprias baseadas em pesquisa e configuração.
- A solicitação de rebaixa deve começar aproximadamente 15 dias antes do vencimento e ser acompanhada até a aplicação e conferência na área de venda.
- Como não há integração de vendas, um lote só deixa de ser risco quando sua ausência, esgotamento, movimentação ou retirada é confirmada fisicamente.
- A entrada será híbrida: leitura por câmera/código quando disponível, com confirmação manual de lote, validade e quantidade.
- Locais relevantes incluem área de venda, estoque, câmara fria, ilha promocional e área segregada para retirada/perda.
- Push é parte central do sistema operacional, mas a tela "Hoje" e o registro de tarefas são a fonte da verdade.
- A arquitetura em avaliação usa Expo/React Native, React/Vite, Neon Postgres, Cloudflare Workers/R2/Cron e Expo Push.

## Constraints

- **Custo**: O piloto deve operar sem gastos recorrentes, usando planos gratuitos e ativos gerados ou capturados pela própria operação.
- **Integração**: A primeira versão não pode depender de dados de vendas, estoque ou APIs internas da rede.
- **Plataforma**: A experiência é mobile-first, com suporte complementar a desktop e operação resiliente a internet instável.
- **Arquitetura**: Monorepo pnpm/Turborepo e monólito modular, evitando microserviços prematuros.
- **Tipagem**: Contratos e tipos fortes end-to-end, validação em runtime nas fronteiras e proibição de `any` não justificado.
- **Qualidade**: SDD, TDD nas regras críticas, cobertura E2E de todos os fluxos essenciais e testes de integração, contrato, segurança e mutação proporcionais ao risco.
- **Código**: Código limpo, performático e modular, aplicando SOLID e DDD quando reduzirem complexidade real, sem dogmatismo ou abstrações prematuras.
- **Segurança**: Repositório público sem segredos ou dados reais; privilégio mínimo, auditoria, RLS/isolamento por loja, threat modeling e referência a OWASP ASVS/MASVS.
- **Desempenho**: Orçamentos de desempenho, sincronização incremental, consultas indexadas e medição automatizada desde o início.
- **Confiabilidade**: Nenhum push isolado pode ser considerado garantia de execução; alertas, tarefas persistentes, escalonamento e confirmação física trabalham em conjunto.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Usar "Validade Zero" como nome de trabalho | Expressa diretamente a meta operacional do produto | - Pending |
| Tratar zero vencidos na área de venda como métrica norte | Mantém priorização centrada no resultado operacional | - Pending |
| Modelar o app como sistema de risco e tarefas, não como estoque exato | Não há acesso às vendas e a segurança depende de conferência física | - Pending |
| Usar entrada híbrida por câmera/código e confirmação manual | Códigos comuns nem sempre carregam lote e validade | - Pending |
| Manter regras de alerta configuráveis por categoria e produto | Ovos, embalados e FLV fresco possuem comportamentos diferentes | - Pending |
| Adotar monólito modular em pnpm/Turborepo | Entrega isolamento, tipagem e testabilidade sem custo operacional de microserviços | - Pending |
| Preferir Neon + Cloudflare como hipótese de infraestrutura gratuita | Favorece branching de banco, API edge, cron e storage gratuito com baixo acoplamento | - Pending |
| Isolar provedores atrás de adaptadores | Neon Auth e Data API estão em beta e devem ser substituíveis | - Pending |
| Usar Impeccable para formar e revisar UI/UX/copy | A interface precisa ser operacionalmente clara e visualmente excelente | - Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check - still the right priority?
3. Audit Out of Scope - reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-19 after Phase 2 completion*
