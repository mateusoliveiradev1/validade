# Phase 2: Domain and Risk Core - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-06-19T08:56:21.3747241-03:00
**Phase:** 2-Domain and Risk Core
**Areas discussed:** Tipos de produto e validade, Janelas e estados de risco, Incerteza por presenca fisica, Vocabulario operacional do dominio

---

## Tipos de produto e validade

### Separacao de produtos

| Option | Description | Selected |
|--------|-------------|----------|
| Dois modos explicitos | Validade formal usa data objetiva; FLV fresco usa janela de qualidade/inspecao. | Yes |
| Um modelo unico com campos opcionais | Mesma estrutura para todos, com alguns campos preenchidos conforme caso. | |
| Tudo decidido pela categoria | Categoria determina todo o comportamento do produto. | |
| Voce decide | O agente escolheria a opcao mais segura. | |

**User's choice:** 1 - Dois modos explicitos.
**Notes:** Evita misturar validade legal com regra operacional.

### Local da classificacao

| Option | Description | Selected |
|--------|-------------|----------|
| Categoria com excecao por produto | Categoria define padrao; produto pode sobrescrever excecoes. | Yes |
| So no produto | Cada produto carrega sua regra completa. | |
| So na categoria | Simples, mas pouco flexivel para excecoes. | |
| Voce decide | O agente escolheria a opcao mais segura. | |

**User's choice:** 1 - Categoria com excecao por produto.
**Notes:** Mantem cadastro rapido sem impedir excecoes reais.

### Vocabulario base de tipos

| Option | Description | Selected |
|--------|-------------|----------|
| Formal, inspecao FLV e monitorado por recebimento | Cobre validade objetiva, fresco por qualidade e itens controlados desde recebimento. | Yes |
| So formal e inspecao FLV | Mais enxuto, mas menos expressivo. | |
| Formal, inspecao FLV, recebimento e preparo interno | Mais completo, mas preparo interno abre escopo futuro. | |
| Voce decide | O agente escolheria a opcao mais segura. | |

**User's choice:** 1 - Formal, inspecao FLV e monitorado por recebimento.
**Notes:** Preparo interno ficou fora para nao invadir outro dominio cedo demais.

### Dado essencial ausente

| Option | Description | Selected |
|--------|-------------|----------|
| Risco incerto bloqueante | Dado essencial ausente impede tratar o lote como seguro. | Yes |
| Rascunho sem risco | Lote incompleto existiria sem gerar pendencia. | |
| Usar padrao da categoria automaticamente | Sistema tentaria preencher pelo padrao. | |
| Voce decide | O agente escolheria a opcao mais segura. | |

**User's choice:** 1 - Risco incerto bloqueante.
**Notes:** Coerente com "nada seguro por silencio".

---

## Janelas e estados de risco

### Forma dos estados

| Option | Description | Selected |
|--------|-------------|----------|
| Estados progressivos por severidade | Seguro, radar, rebaixa, critico, vencido/retirar, com incerto especial. | Yes |
| Estados independentes que podem coexistir | Mais flexivel, mas pode confundir operacao. | |
| Apenas proximo melhor comando | Simples para UI, mas menos rastreavel. | |
| Voce decide | O agente escolheria a opcao mais segura. | |

**User's choice:** 1 - Estados progressivos por severidade.
**Notes:** `uncertain` permanece como estado especial.

### Prioridade de regras

| Option | Description | Selected |
|--------|-------------|----------|
| Sempre vence o estado mais grave | Vencido domina radar/rebaixa e manda retirar. | Yes |
| Mostrar todos os estados aplicaveis | Mais completo, mas pode poluir a decisao operacional. | |
| Separar estado operacional e motivos secundarios | Um estado guia a acao e motivos explicam detalhes. | |
| Voce decide | O agente escolheria a opcao mais segura. | |

**User's choice:** 1 - Sempre vence o estado mais grave.
**Notes:** Motivos estruturados foram discutidos depois como explicacao, nao como estados concorrentes.

### Origem das janelas

| Option | Description | Selected |
|--------|-------------|----------|
| Perfil por categoria com valores padrao e sobrescrita por produto | Permite ovos, FLV e embalados com ajustes proprios. | Yes |
| Valores globais fixos para tudo | Simples, mas fraco para categorias diferentes. | |
| Tudo configuravel, sem padrao inicial | Flexivel, mas atrasa MVP e testes. | |
| Voce decide | O agente escolheria a opcao mais segura. | |

**User's choice:** 1 - Perfil por categoria com valores padrao e sobrescrita por produto.
**Notes:** Mantem comportamento padrao testavel.

### Janela padrao inicial

| Option | Description | Selected |
|--------|-------------|----------|
| 60 / 15 / 3 / 0 dias | Radar, rebaixa, critico e vencido conforme conversas anteriores. | Yes |
| 60 / 15 / 7 / 0 dias | Critico mais cedo, com maior pressao operacional. | |
| 30 / 15 / 3 / 0 dias | Radar menor, com menos prevencao longa. | |
| Voce decide | O agente escolheria a opcao mais segura. | |

**User's choice:** 1 - 60 / 15 / 3 / 0 dias.
**Notes:** Janela padrao simples, testavel e alinhada ao projeto.

---

## Incerteza por presenca fisica

### Recencia de conferencia

| Option | Description | Selected |
|--------|-------------|----------|
| Por janela configuravel da categoria/produto | Frequencias diferentes por perfil operacional. | Yes |
| Sempre no proximo turno | Forte, mas pode gerar volume excessivo. | |
| So quando entra em radar/rebaixa/critico | Mais leve, mas deixa itens quietos por tempo demais. | |
| Voce decide | O agente escolheria a opcao mais segura. | |

**User's choice:** 1 - Por janela configuravel da categoria/produto.
**Notes:** Nao depende de venda ou estoque.

### Estado quando recencia vence

| Option | Description | Selected |
|--------|-------------|----------|
| Incerto com acao obrigatoria de conferencia | Lote deixa de ser seguro e precisa ser conferido. | Yes |
| Escalar direto para critico | Mistura desconhecido com perigo confirmado. | |
| Apenas sinalizar aviso secundario | Pode deixar risco invisivel. | |
| Voce decide | O agente escolheria a opcao mais segura. | |

**User's choice:** 1 - Incerto com acao obrigatoria de conferencia.
**Notes:** Preserva a diferenca entre "nao sei" e "sei que esta critico".

### Confirmacao fisica valida

| Option | Description | Selected |
|--------|-------------|----------|
| Acao concreta com resultado observado | Presente, movido, retirado, perda, nao encontrado ou provavelmente esgotou. | Yes |
| Qualquer check-in do colaborador | Rapido, mas fraco como evidencia. | |
| So foto ou evidencia forte | Confiavel, mas pesado para todos os casos. | |
| Voce decide | O agente escolheria a opcao mais segura. | |

**User's choice:** 1 - Acao concreta com resultado observado.
**Notes:** Check-in generico nao resolve incerteza.

### Nao encontrado / provavelmente esgotou

| Option | Description | Selected |
|--------|-------------|----------|
| Resolvido condicional com nova checagem futura | Alivia pendencia imediata sem fingir certeza absoluta. | Yes |
| Resolvido definitivo | Simples, mas perigoso se o produto reaparecer. | |
| Nunca resolve, so reduz severidade | Seguro, mas pode gerar tarefas eternas. | |
| Voce decide | O agente escolheria a opcao mais segura. | |

**User's choice:** 1 - Resolvido condicional com nova checagem futura.
**Notes:** Mantem rastreabilidade e permite reconferencia.

---

## Vocabulario operacional do dominio

### Saida do dominio

| Option | Description | Selected |
|--------|-------------|----------|
| Estado + comando recomendado | Estado calculado e acao operacional recomendada. | Yes |
| So estados tecnicos | Mais puro, mas joga interpretacao para UI futura. | |
| So comandos operacionais | Bom para acao, mas fraco para testes/auditoria. | |
| Voce decide | O agente escolheria a opcao mais segura. | |

**User's choice:** 1 - Estado + comando recomendado.
**Notes:** Ajuda fases futuras sem acoplar UI ao dominio.

### Comandos iniciais

| Option | Description | Selected |
|--------|-------------|----------|
| Conferir, pedir rebaixa, retirar, monitorar, corrigir dados | Cobre incerteza, rebaixa, vencido, radar e dado incompleto. | Yes |
| So conferir, pedir rebaixa e retirar | Mais enxuto, mas incompleto para radar/dado faltante. | |
| Lista completa ja com rebaixa aplicada, movido, perda, foto, escalonamento | Invade fases futuras. | |
| Voce decide | O agente escolheria a opcao mais segura. | |

**User's choice:** 1 - Conferir, pedir rebaixa, retirar, monitorar, corrigir dados.
**Notes:** Mantem a Fase 2 dentro do dominio, sem tarefas/push/UI.

### Idioma do dominio

| Option | Description | Selected |
|--------|-------------|----------|
| Codigo em ingles, labels/copy em portugues-BR | Tipos estaveis para engenharia e linguagem humana operacional. | Yes |
| Tudo em portugues | Proximo da operacao, mas menos padrao para codigo. | |
| Tudo em ingles | Bom para engenharia, mas atrasa cuidado de copy. | |
| Voce decide | O agente escolheria a opcao mais segura. | |

**User's choice:** 1 - Codigo em ingles, labels/copy em portugues-BR.
**Notes:** Equilibra engenharia e operacao.

### Explicacao do resultado

| Option | Description | Selected |
|--------|-------------|----------|
| Sim, com motivos estruturados | Codigos testaveis/auditaveis explicam a regra. | Yes |
| Sim, com texto pronto em portugues | Bom para UI, mas acopla copy cedo demais. | |
| Nao, so estado e comando | Simples, mas fraco para confianca operacional. | |
| Voce decide | O agente escolheria a opcao mais segura. | |

**User's choice:** 1 - Sim, com motivos estruturados.
**Notes:** Motivos ajudam testes, auditoria e debug sem fixar copy final.

---

## the agent's Discretion

None. The user selected a concrete option for every decision.

## Deferred Ideas

None. Discussion stayed within phase scope.
