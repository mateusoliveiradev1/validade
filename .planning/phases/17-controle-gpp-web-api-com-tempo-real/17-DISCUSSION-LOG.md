# Phase 17: Controle GPP Web API com tempo real - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-07-02T17:23:47.5634813-03:00
**Phase:** 17-Controle GPP Web API com tempo real
**Areas discussed:** Fila web do GPP, Modelo operacional, Permissoes e auditoria, Tempo real e feedback de central

---

## Fila web do GPP

### Comportamento inicial da fila

| Option | Description | Selected |
|--------|-------------|----------|
| Setor aberto automaticamente | Abre o setor com mais pendencias, agrupado por codigo/produto, para o GPP comecar pelo maior volume sem procurar. | yes |
| Tudo fechado por setor | Mostra so os setores resumidos primeiro; exige um clique antes de ver os produtos. | |
| Lista direta sem separar por setor | Mostra todos os grupos misturados em lista unica; pior para o fluxo fisico por setor. | |

**User's choice:** Setor aberto automaticamente.
**Notes:** User selected the recommended option.

### Baixa de grupos

| Option | Description | Selected |
|--------|-------------|----------|
| Baixa em grupo com confirmacao | GPP pode baixar o grupo inteiro depois de ver resumo com setor, produto/codigo, total, finalidade e quantidade de lancamentos. | yes |
| So baixa individual | Mais seguro linha por linha, mas lento para uso real. | |
| Baixa em grupo livre | Rapido, mas arriscado por baixar sem conferir resumo suficiente. | |

**User's choice:** Baixa em grupo com confirmacao.
**Notes:** User selected the recommended option.

### Abertura de detalhes

| Option | Description | Selected |
|--------|-------------|----------|
| Painel lateral com resumo, linhas e historico | Resumo no topo, lancamentos no meio, auditoria no fim, acoes fixas embaixo. | yes |
| Modal simples so com lancamentos | Menos coisa na tela, mas perde contexto de auditoria. | |
| Tela separada completa | Mais espaco, mas quebra a velocidade do GPP. | |

**User's choice:** Painel lateral com resumo, linhas e historico.
**Notes:** User selected the recommended option.

### Conteudo do grupo na lista

| Option | Description | Selected |
|--------|-------------|----------|
| Resumo operacional completo | Codigo/produto, setor, finalidade, total quantidade/unidade, numero de lancamentos, divergencias, horario recente e acoes. | yes |
| Resumo minimo | So codigo/produto, quantidade total e detalhes. | |
| Resumo com muitas colunas | Quase tudo em tabela; pode ficar pesado. | |

**User's choice:** Resumo operacional completo.
**Notes:** User selected the recommended option.

---

## Modelo operacional

### Movimentos vinculados

| Option | Description | Selected |
|--------|-------------|----------|
| Avaria principal + movimentos vinculados | Tudo nasce como Avaria; reaproveitamento, producao interna e transferencia ficam ligados a ela, com saldo e historico. | yes |
| Cada tipo como lancamento independente | Mais simples no inicio, mas perde o vinculo operacional. | |
| Um registro unico com tipo final | Curto, mas fraco para casos parciais. | |

**User's choice:** Avaria principal + movimentos vinculados.
**Notes:** User selected the recommended option.

### Compras internas

| Option | Description | Selected |
|--------|-------------|----------|
| Fluxo separado de avaria | Produto bom solicitado por setor nao e avaria e nao resolve validade. | yes |
| Mesmo fluxo de avaria com tipo compra | Menos tabelas, mas mistura produto bom com produto ruim/vencido. | |
| So observacao dentro do Controle GPP | Fraco para fila, atendimento parcial, sem produto, historico e tempo real. | |

**User's choice:** Fluxo separado de avaria.
**Notes:** User selected the recommended option.

### Ciclo de vida de avaria

| Option | Description | Selected |
|--------|-------------|----------|
| Pendente -> Divergencia -> Corrigido -> Revisado pelo GPP -> Baixado | Cobre fluxo normal e erro sem permitir baixar divergente por acidente. | yes |
| Pendente -> Baixado ou Cancelado | Simples, mas nao representa etiqueta errada, quantidade diferente ou produto incorreto. | |
| Rascunho -> Enviado -> Em analise -> Finalizado | Generico e menos direto para loja/GPP. | |

**User's choice:** Pendente -> Divergencia -> Corrigido -> Revisado pelo GPP -> Baixado.
**Notes:** User selected the recommended option.

### Saldo

| Option | Description | Selected |
|--------|-------------|----------|
| Saldo obrigatorio e calculado pela central | Central calcula quantidade original menos movimentos; bloqueia movimento maior que saldo. | yes |
| Saldo apenas visual no web | Arriscado porque cada tela pode interpretar diferente. | |
| Sem saldo no primeiro corte | Rapido, mas perde caso real de reaproveitamento parcial. | |

**User's choice:** Saldo obrigatorio e calculado pela central.
**Notes:** User selected the recommended option.

---

## Permissoes e auditoria

### Papel GPP

| Option | Description | Selected |
|--------|-------------|----------|
| Novo papel gpp com capabilities proprias | GPP ganha permissao operacional sem herdar lead/admin. | yes |
| Usar lead para GPP no comeco | Mais rapido, mas mistura lideranca com baixa GPP. | |
| Usar admin para GPP no comeco | Perigoso por dar poder de governanca. | |

**User's choice:** Novo papel gpp com capabilities proprias.
**Notes:** User selected the recommended option.

### Correcao de pendentes

| Option | Description | Selected |
|--------|-------------|----------|
| Criador corrige o proprio; lideranca corrige da loja/setor; GPP so correcao pequena com justificativa | Preserva responsabilidade e evita alteracao por qualquer colaborador. | yes |
| Qualquer colaborador da loja corrige qualquer pendente | Flexivel, mas auditoria fraca. | |
| So lideranca/GPP corrige | Controlado, mas trava erro simples do criador. | |

**User's choice:** Criador corrige o proprio; lideranca corrige da loja/setor; GPP so correcao pequena com justificativa.
**Notes:** User selected the recommended option.

### Erro depois de baixado

| Option | Description | Selected |
|--------|-------------|----------|
| Nao edita direto; usa estorno/correcao administrativa com justificativa | Mantem a baixa como fato auditavel e registra ajuste posterior. | yes |
| Permitir editar se for no mesmo dia | Pode apagar o que o GPP realmente baixou. | |
| So admin apaga e recria | Perigoso para historico e idempotencia. | |

**User's choice:** Nao edita direto; usa estorno/correcao administrativa com justificativa.
**Notes:** User selected the recommended option.

### Eventos auditados

| Option | Description | Selected |
|--------|-------------|----------|
| Todo evento operacional importante | Criado, editado, divergencia, corrigido, revisado, baixado, cancelado, estornado, compra atendida/parcial/sem produto, com ator e justificativa quando houver. | yes |
| So baixa e divergencia | Menos ruido, mas insuficiente para explicar erro e correcao. | |
| So historico visual sem tabela de auditoria | Simples, mas fraco para confianca do GPP. | |

**User's choice:** Todo evento operacional importante.
**Notes:** User selected the recommended option.

---

## Tempo real e feedback de central

### Momento de sucesso

| Option | Description | Selected |
|--------|-------------|----------|
| So depois do banco central confirmar | Botao fica salvando; sucesso so com resposta da API apos commit. Evento realtime nunca vira sucesso sozinho. | yes |
| Otimista imediato, corrige se falhar | Rapido visualmente, mas arriscado para sync. | |
| Salvar local e sincronizar depois mesmo online | Fora desta fase; local fica so sem internet real. | |

**User's choice:** So depois do banco central confirmar.
**Notes:** User selected the recommended option.

### Atualizacao realtime

| Option | Description | Selected |
|--------|-------------|----------|
| Evento leve + reconsulta central | API grava no banco, publica evento, cliente recebe e faz nova leitura central. | yes |
| Evento com dado completo para atualizar tela | Rapido, mas cria risco de dado parcial ou divergente. | |
| Sem tempo real; so polling curto | Simples, mas nao entrega o "apareceu instantaneo". | |

**User's choice:** Evento leve + reconsulta central.
**Notes:** User selected the recommended option.

### Queda do tempo real

| Option | Description | Selected |
|--------|-------------|----------|
| Fallback por Atualizar/polling; dado salvo continua salvo | Se banco confirmou, registro existe; tela mostra Tempo real pausado e permite atualizar. | yes |
| Bloquear tela ate reconectar | Seguro demais e atrapalha operacao. | |
| Manter so estado antigo sem avisar | Perigoso porque GPP pode trabalhar com fila velha. | |

**User's choice:** Fallback por Atualizar/polling; dado salvo continua salvo.
**Notes:** User selected the recommended option.

### Estados de feedback

| Option | Description | Selected |
|--------|-------------|----------|
| Central explicita em todos os estados | Salvando na central, Registrado na central, Falha na central, Tempo real pausado, Atualizado ha Xs, Sem internet pendente neste aparelho. | yes |
| Feedback simples de sucesso/erro | Menos texto, mas pode repetir falso sucesso. | |
| So loading e toast | Rapido de implementar, mas fraco para operacao critica. | |

**User's choice:** Central explicita em todos os estados.
**Notes:** User selected the recommended option.

---

## the agent's Discretion

- Exact table names, service boundaries, route names, query/index strategy, and realtime transport choice.
- Exact capability enum names, as long as GPP role/capability separation and backend enforcement remain intact.
- Exact UI component structure, as long as the locked queue behavior, side panel, confirmation, central feedback, and fallback behavior are preserved.

## Deferred Ideas

- Mobile Controle GPP belongs to Phase 18.
- Integrating `Hoje` actions with GPP belongs to Phase 19.
- Realtime for `Hoje` belongs to Phase 20.
- Removing physical caderno/caixa belongs to a later rollout decision after app-vs-physical consistency is validated.
