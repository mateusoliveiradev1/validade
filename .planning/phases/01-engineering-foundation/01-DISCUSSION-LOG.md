# Phase 1: Engineering Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-06-18T23:39:48.9055420-03:00
**Phase:** 1-Engineering Foundation
**Areas discussed:** Formato do monorepo inicial, Rigor dos quality gates, Estrategia inicial de testes, Seguranca de repo publico e configuracao

---

## Formato do monorepo inicial

| Question | Options considered | Selected |
|----------|--------------------|----------|
| Para a Fase 1, como voce quer que a estrutura nasca? | Estrutura completa minima; Fundacao enxuta; Voce decide | Estrutura completa minima |
| Como quer organizar os pacotes compartilhados no comeco? | Essenciais e explicitos; So infraestrutura; Voce decide | Essenciais e explicitos |
| Qual deve ser o criterio de pronto para cada app nessa Fase 1? | Smoke real por app; So build/check; Voce decide | Smoke real por app |
| Quer que a Fase 1 ja documente o fluxo local de desenvolvimento? | README operacional completo; README curto; Voce decide | README operacional completo |

**User's choice:** estrutura completa minima, pacotes compartilhados essenciais, smoke real por app e README operacional completo.
**Notes:** A base deve estar pronta para as fases seguintes sem implementar regras de negocio antes da Fase 2.

---

## Rigor dos quality gates

| Question | Options considered | Selected |
|----------|--------------------|----------|
| Qual nivel de bloqueio voce quer ja na Fase 1? | Bloqueante desde o inicio; Advisorio no comeco; Voce decide | Bloqueante desde o inicio |
| Para lint e regras de TypeScript, qual postura voce quer? | Strict sem any injustificado; Strict moderado; Voce decide | Strict sem any injustificado |
| Como quer tratar dependency boundaries no monorepo? | Regras explicitas desde ja; So organizacao por convencao; Voce decide | Regras explicitas desde ja |
| Sobre CI: qual deve ser o escopo inicial? | Baseline completo no GitHub Actions; CI minimo; Voce decide | Baseline completo no GitHub Actions |
| Quer que falhas de seguranca bloqueiem a fase em que nivel? | Bloquear high/critical; Bloquear tudo que for conhecido; Voce decide | Bloquear high/critical |

**User's choice:** gates bloqueantes, TypeScript/lint strict, boundaries automatizados, CI completo e seguranca bloqueando `high`/`critical`.
**Notes:** O rigor inicial deve proteger o repo publico e evitar que a base nasca frouxa.

---

## Estrategia inicial de testes

| Question | Options considered | Selected |
|----------|--------------------|----------|
| Que estrutura de testes a Fase 1 deve deixar pronta? | Piramide completa com smoke inicial; So unit e API agora; Voce decide | Piramide completa com smoke inicial |
| Como quer tratar TDD nas regras criticas? | Contrato de TDD desde a Fase 1; TDD como recomendacao; Voce decide | Contrato de TDD desde a Fase 1 |
| Sobre dados de teste e fixtures, qual caminho? | Fake operacional seguro; Fixtures minimas neutras; Voce decide | Fake operacional seguro |
| Como quer medir cobertura nesta fase? | Cobertura como baseline visivel, nao meta rigida ainda; Meta global desde ja; Voce decide | Cobertura como baseline visivel |
| Quais fluxos essenciais devem ganhar E2E quando nascerem? | Todos os fluxos operacionais criticos; Apenas happy paths principais; Voce decide | Todos os fluxos operacionais criticos |

**User's choice:** preparar a piramide completa com smokes, TDD como contrato, fixtures ficticias em portugues, cobertura visivel e matriz E2E dos fluxos criticos.
**Notes:** A Fase 1 deve estruturar os caminhos de teste sem fingir cobertura de funcionalidades ainda inexistentes.

---

## Seguranca de repo publico e configuracao

| Question | Options considered | Selected |
|----------|--------------------|----------|
| Qual deve ser a linha vermelha para segredos e dados reais? | Zero tolerancia desde o inicio; Protecao basica; Voce decide | Zero tolerancia desde o inicio |
| Sobre providers reais, como Neon/Cloudflare/R2/Expo Push, o que a Fase 1 deve fazer? | Adaptadores e envs preparados, sem credenciais reais; Configurar conexoes reais agora; Voce decide | Adaptadores e envs preparados, sem credenciais reais |
| Como quer tratar threat modeling e referencias OWASP? | Threat model leve ja na Fase 1; So checklist de seguranca; Voce decide | Threat model leve ja na Fase 1 |
| Sobre dados e evidencias falsas, quer alguma regra especifica? | Proibir dados reais no repo e documentar exemplos permitidos; Permitir dados anonimizados; Voce decide | Proibir dados reais no repo e documentar exemplos permitidos |
| Como a Fase 1 deve lidar com auditoria futura? | Preparar eventos e convencoes, sem implementar auditoria completa; Implementar audit log base agora; Voce decide | Preparar eventos e convencoes |

**User's choice:** zero tolerancia a segredos/dados reais, providers preparados por adaptadores/envs/mocks, threat model leve, proibicao de dados reais e convencoes para auditoria futura.
**Notes:** A Fase 1 deve preparar seguranca e auditoria sem antecipar banco real ou dominio.

---

## Discricionariedade do agente

Nenhuma area foi delegada ao agente.

## Deferred Ideas

None.
