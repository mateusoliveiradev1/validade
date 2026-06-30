# Validade Zero

## What This Is

Validade Zero é um aplicativo operacional, mobile-first, para colaboradores e lideranças de hortifruti em uma grande rede de supermercados. Ele acompanha produtos com validade por lote e localização, transforma riscos em tarefas persistentes com responsáveis e usa alertas, cobrança, auditoria e fechamento de turno até que cada pendência seja resolvida e confirmada na área de venda.

O v1.0 entregou a espinha dorsal de piloto fechado no repositório: captura mobile, tarefas de Hoje, rebaixa, operação offline, papéis, auditoria, evidências, Command Center, central truth, readiness de aparelhos, diagnóstico de push, release truth e checklist guiado de UAT. O produto continua complementando os sistemas existentes da rede e não depende de acesso a vendas, estoque ou APIs internas.

## Core Value

Garantir que nenhum produto vencido permaneça na área de venda, mantendo cada risco visível e acionável até sua resolução confirmada.

## Current Milestone: v1.1 Operação Real de Loja e Diagnóstico

**Goal:** Separar a operação diária do diagnóstico de piloto para que a Loja 18 consiga validar o app como ferramenta real, sem perder a verdade permanente de aparelhos, versões, sincronização, push e Go/No-Go.

**Target features:**
- Command Center web focado na pergunta operacional, com resumo permanente de aparelhos e abas dedicadas para Aparelhos, Atualizações e Validação.
- Mobile com área de Ajustes para conta/loja, push e lembretes, sincronização, atualizações, diagnóstico, privacidade e saída.
- Telas Hoje, preparo de turno e fechamento mostrando sync/push/build somente no peso certo: compacto quando saudável, dominante quando bloqueia a operação.
- Roteiro Loja 18 de validação real cobrindo primeiro produto, lote real, segundo aparelho, update/build, push, evidência/câmera, tarefa e fechamento.

## Requirements

### Validated

- [x] **FND-01..FND-04** - Base de engenharia com pnpm/Turborepo, TypeScript strict, contratos, runtime validation, gates, CI/security baseline e segurança para repositório público - v1.0.
- [x] **CAT-01..CAT-04** - Cadastro/reuso de produtos, lotes, códigos quando disponíveis, diferenciação entre validade formal e FLV por qualidade, e fluxo com assistência de câmera sem bloquear entrada manual - v1.0.
- [x] **LOC-01..LOC-04** - Localizações operacionais, última presença física, movimentação, retirada, perda, não encontrado e tratamento de lotes não verificados como incertos em vez de seguros - v1.0.
- [x] **RSK-01..RSK-05** - Estados de risco, janelas configuráveis, tarefas acionáveis, resolução por ação concreta, reabertura e escalonamento de risco crítico - v1.0.
- [x] **PSH-01..PSH-05** - Lembretes push, repetição/escalonamento, tela Hoje, fechamento de turno e garantia de que push nunca substitui tarefa persistente - v1.0.
- [x] **MRK-01..MRK-04** - Ciclo de rebaixa solicitado, aprovado, aplicado, confirmado em gôndola, com evidência opcional e atraso ainda visível - v1.0.
- [x] **SYN-01..SYN-03** - Cache local, comandos offline idempotentes, sync explícito e conflitos sem confirmação silenciosa de ações críticas - v1.0.
- [x] **AUD-01..AUD-04** - Trilha de auditoria, RBAC, evidência fora do Postgres, autorização por loja, checks de segurança, threat model e release gates - v1.0.
- [x] **UI-01..UI-04** - Mobile-first, área de venda segura como primeira resposta, copy operacional, acessibilidade, polish e revisão Impeccable - v1.0.
- [x] **P10/P11/P12 pilot hardening** - Fluxo real de piloto com central truth, segundo aparelho, Command Center consistente, versionamento do APK, readiness de device e blocker synthesis - v1.0.
- [x] **OPS-01..OPS-04** - Superfícies operacionais destiladas: produto/lote guiados pela apresentação real na loja, Hoje/Ajustes/Fechamento com prontidão no peso certo, fechamento seguro bloqueado por leitura central/build/autorização/checklist, e web/mobile usando o mesmo vocabulário público - Phase 15.

### Active

- [x] Separar no web a operação diária, aparelhos, atualizações e validação Go/No-Go sem esconder a prontidão dos aparelhos - Phase 13.
- [ ] Criar no mobile uma área de Ajustes que concentre push/lembretes, sync, atualizações, build, privacidade, conta e saída.
- [ ] Guiar a validação real da Loja 18 com produto/lote reais e provas externas honestas para APK, push, câmera/evidência, segundo aparelho e fechamento.

### Out of Scope

- Integração direta com vendas, estoque ou ERP na primeira versão - a rede ainda não oferece esse acesso.
- Previsão precisa de demanda ou venda por produto - sem dados transacionais, o app trabalha com presença física observada.
- Alteração automática de preço no sistema corporativo - a primeira versão acompanha solicitação, aprovação, aplicação e conferência da rebaixa.
- Controle de validade legal para FLV fresco que não possui prazo declarado - esses itens usam regras de qualidade e inspeção.
- Distribuição paga em lojas de aplicativos durante o piloto - conflita com a restrição inicial de custo zero.

## Context

- v1.0 está repository-complete: 12 fases, 54 planos e 37/37 requisitos v1 rastreados em requirements, summaries e verification.
- O audit de milestone terminou sem gaps de requisito ou integração, mas com gaps de fluxo externos: Android instalado, Maestro em aparelho conectado, push remoto, câmera/evidência real e UAT físico Loja 18.
- A fonte da verdade operacional é central e store-scoped: product truth, lot lifecycle, task projection, terminal resolution, audit, shift close, device readiness e Command Center não podem divergir.
- Push continua sendo cobrança e diagnóstico, nunca garantia de execução. A execução continua dependendo de tarefa persistente, sincronização, auditoria e confirmação física.
- A operação essencial precisa continuar em internet instável: cache local, outbox e conflitos explícitos fazem parte do produto, não são fallback cosmético.
- O piloto ainda deve operar sem custo recorrente e sem segredos ou dados reais no repositório público.
- A próxima decisão de produto deve separar claramente "repo pronto", "build instalado", "provider provado" e "operação física validada".
- O hotfix pós-v1.0 confirmou que o APK local consegue preparar turno contra a Loja 18 quando o backend usa a loja da sessão autenticada; a próxima etapa é transformar esse piloto funcional em experiência de loja real.
- Aparelhos são verdade operacional permanente, não apenas uma tela de piloto; UAT e Go/No-Go são validação de rollout e não devem competir com a rotina do corredor.
- APK local instalado fora de loja/app store não deve ser tratado como autoatualizável. A área de atualizações deve mostrar versão instalada, versão aprovada e caminho de instalação; OTA/EAS Update fica como possibilidade futura apenas para atualizações compatíveis com o mesmo runtime.
- Phase 15 confirmou o fluxo operacional destilado no repositório: cadastro de produto/lote parte da apresentação física na loja, produtos antigos continuam compatíveis, Hoje mostra apenas blockers relevantes, e fechamento seguro falha fechado sem leitura central atual, build/autorização válidos e checklist físico completo.

## Constraints

- **Custo**: O piloto deve operar sem gastos recorrentes, usando planos gratuitos e ativos gerados ou capturados pela própria operação.
- **Integração**: A primeira versão não pode depender de dados de vendas, estoque ou APIs internas da rede.
- **Plataforma**: A experiência é mobile-first, com suporte complementar a desktop e operação resiliente a internet instável.
- **Arquitetura**: Monorepo pnpm/Turborepo e monólito modular, evitando microserviços prematuros.
- **Tipagem**: Contratos e tipos fortes end-to-end, validação em runtime nas fronteiras e proibição de `any` não justificado.
- **Qualidade**: SDD, TDD nas regras críticas, cobertura E2E dos fluxos essenciais e testes de integração, contrato, segurança e mutação proporcionais ao risco.
- **Código**: Código limpo, performático e modular, aplicando SOLID e DDD quando reduzirem complexidade real, sem dogmatismo ou abstrações prematuras.
- **Segurança**: Repositório público sem segredos ou dados reais; privilégio mínimo, auditoria, isolamento por loja, threat modeling e referência a OWASP ASVS/MASVS.
- **Desempenho**: Orçamentos de desempenho, sincronização incremental, consultas indexadas e medição automatizada desde o início.
- **Confiabilidade**: Nenhum push isolado pode ser considerado garantia de execução; alertas, tarefas persistentes, escalonamento e confirmação física trabalham em conjunto.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Usar "Validade Zero" como nome de trabalho | Expressa diretamente a meta operacional do produto | Good - manteve foco durante v1.0 |
| Tratar zero vencidos na área de venda como métrica norte | Mantém priorização centrada no resultado operacional | Good - guiou Hoje, task truth e shift close |
| Modelar o app como sistema de risco e tarefas, não como estoque exato | Não há acesso às vendas e a segurança depende de conferência física | Good - evitou falsa precisão |
| Central truth antes de rollout | Um segundo aparelho e o Command Center precisam ver os mesmos fatos | Good - Phase 10 corrigiu o eixo do piloto |
| Push é cobrança, não prova | Sistemas operacionais podem aceitar/envio sem garantir execução física | Good - preservado nas fases 5, 10 e 12 |
| Offline não pode fingir confirmação central | Conectividade instável é comum na loja e ações críticas exigem ack explícito | Good - outbox e conflitos ficaram visíveis |
| Evidência e câmera são provas externas quando não rodam em aparelho real | Component tests e mocks não substituem dispositivo físico | Good - mantido como blocker honesto |
| Command Center deve explicar causa e próximo passo | Liderança precisa agir, não só olhar métricas | Good - Phase 12 sintetiza bloqueios do piloto |
| Manter Neon + Cloudflare atrás de adaptadores | Favorece custo zero e troca futura de provider | Good - staging e provider seams permaneceram substituíveis |
| Não declarar rollout físico sem Loja 18 real | Repositório verde não prova operação de corredor | Good - v1.0 fecha como repository-complete, não rollout-complete |
| Aparelhos ficam permanentes, mas detalhes saem do Command Center diário | A liderança precisa ver prontidão de aparelhos sempre, sem misturar diagnóstico com risco da área de venda | Good - Phase 13 separou Operacao e Aparelhos |
| UAT/Go-No-Go vira superfície de validação, não rotina operacional | Checklist de rollout é importante para provar loja real, mas não deve poluir o uso diário depois da validação | Good - Phase 13 criou Validacao |
| Atualizações do APK precisam ser verdade explícita | APK local não atualiza sozinho de forma confiável; operador precisa saber se está na build aprovada e como atualizar | Good - Phase 13 criou Atualizacoes |
| Classificação de produto deve partir da apresentação física na loja | O operador reconhece como o produto está exposto antes de pensar em modo técnico, validade formal ou rebaixa | Good - Phase 15 criou política determinística sem expor `ProductMode` |
| Fechamento seguro depende de leitura central atual e checklist físico | Encerrar turno não pode transformar pendência, cache local ou diagnóstico saudável em prova de área segura | Good - Phase 15 tornou leitura central, build, autorização e checklist bloqueios explícitos |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition**:
1. Requirements invalidated? Move to Out of Scope with reason.
2. Requirements validated? Move to Validated with phase reference.
3. New requirements emerged? Add to Active.
4. Decisions to log? Add to Key Decisions.
5. "What This Is" still accurate? Update if drifted.

**After each milestone**:
1. Full review of all sections.
2. Core Value check - still the right priority?
3. Audit Out of Scope - reasons still valid?
4. Update Context with current state.

---
*Last updated: 2026-06-30 after completing Phase 15*
