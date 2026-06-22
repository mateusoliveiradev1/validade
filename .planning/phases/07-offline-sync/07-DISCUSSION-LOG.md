# Phase 07: offline-sync - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-06-21T21:07:39.1488497-03:00
**Phase:** 07-offline-sync
**Areas discussed:** Dados Offline, Comandos Offline, Pendencia em Hoje, Conflito e Retry

---

## Dados Offline

### Quando o app diz "Pronto para operar sem internet", o que precisa estar salvo no aparelho?

| Option | Description | Selected |
|--------|-------------|----------|
| Tarefas ativas + lotes essenciais do turno | Baixa so o necessario para executar "Hoje": tarefa, produto, lote, local, acao exigida, risco e ultimo sync. | yes |
| Tarefas ativas + atencao futura + lotes recentes | Da mais contexto no corredor, mas aumenta chance de dado desatualizado aparecer como util. | |
| Tudo que o aparelho ja conhece localmente | Melhor navegacao offline, mas exige mais regras de frescor/conflito para nao parecer fonte oficial. | |

**User's choice:** Tarefas ativas + trechos essenciais dos lotes do turno.
**Notes:** O cache offline deve ser operacional e minimo, focado na execucao de "Hoje".

### Quando esse cache deve ser considerado desatualizado?

| Option | Description | Selected |
|--------|-------------|----------|
| Depois de virar o turno ou passar algumas horas | Continua mostrando as tarefas salvas, mas com aviso antes de marcar a area como segura. | yes |
| Assim que o app detecta falta de internet prolongada | Mais conservador, mas pode incomodar em loja com sinal ruim. | |
| Nunca bloqueia por idade, so mostra o horario do ultimo sync | Mais fluido, mas arrisca dar confianca demais a dado antigo. | |

**User's choice:** Depois de virar o turno ou passar algumas horas.
**Notes:** Cache desatualizado nao some, mas precisa de aviso forte para decisao de seguranca.

### Se o app abrir sem internet e sem cache de tarefas ativas, qual deve ser a experiencia?

| Option | Description | Selected |
|--------|-------------|----------|
| Mostrar estado "conecte uma vez" e manter registro local manual alcancavel | Nao inventa tarefas, mas ainda permite registrar lote/observacao local se o formulario estiver disponivel. | yes |
| Bloquear operacao ate conectar | Mais seguro contra dado vazio, mas ruim para corredor e loja com sinal instavel. | |
| Mostrar so lotes recentes ja existentes no aparelho | Util para consulta, mas pode confundir com tarefa ativa do turno. | |

**User's choice:** Mostrar estado "conecte uma vez" e manter registro local manual alcancavel quando disponivel.
**Notes:** O app nao deve fingir que sabe o turno quando nunca preparou cache.

### Como o aparelho deve preparar/atualizar esse cache?

| Option | Description | Selected |
|--------|-------------|----------|
| Automaticamente ao abrir/atualizar Hoje e apos mudancas locais | Encaixa no padrao atual `today_open`, `manual_refresh`, `lot_change`, `observation_change`; nao cria uma tela nova. | yes |
| Com um botao explicito "Preparar trabalho offline" | Mais visivel para a equipe, mas vira mais uma acao para lembrar no inicio do turno. | |
| Em segundo plano sempre que houver internet | Confortavel, mas menos previsivel no piloto e mais dificil de testar com confianca. | |

**User's choice:** Automaticamente ao abrir/atualizar Hoje e apos mudancas locais.
**Notes:** Evitar rotina extra obrigatoria para a equipe.

---

## Comandos Offline

### Quais acoes de Hoje podem ser registradas mesmo sem internet?

| Option | Description | Selected |
|--------|-------------|----------|
| Todas as acoes de tarefa ja suportadas, com fila e marcador pendente | Retirada/perda, presenca, movimentacao, nao encontrado, provavel esgotamento, rebaixa e reconferencia entram como comandos idempotentes. | yes |
| So acoes nao criticas; criticas exigem conexao | Reduz risco de conflito, mas atrapalha justamente retirar produto vencido quando a loja esta sem sinal. | |
| So salvar rascunho, sem contar como acao local | Mais conservador, mas frustra operacao e pode causar retrabalho. | |

**User's choice:** Todas as acoes de tarefa ja suportadas, com fila e marcador pendente.
**Notes:** Offline deve proteger a execucao fisica, nao limitar a fase aos casos faceis.

### Quando a pessoa conclui uma acao offline, o que o app deve considerar "feito"?

| Option | Description | Selected |
|--------|-------------|----------|
| Feito fisicamente no aparelho, pendente no sistema | Mostra "Acao salva no aparelho", mas mantem "Pendente de sincronizacao" ate o servidor reconhecer. | yes |
| Feito para a pessoa, sem destacar pendencia na tarefa | Mais simples, mas perigoso para area de venda e lideranca. | |
| Ainda nao feito ate sincronizar | Mais rigido, mas ignora que a acao fisica realmente aconteceu. | |

**User's choice:** Feito fisicamente no aparelho, pendente no sistema.
**Notes:** A UI pode reconhecer o trabalho sem mentir sobre confirmacao central.

### Como tratar acoes criticas offline?

| Option | Description | Selected |
|--------|-------------|----------|
| Permitir, mas com confirmacao/evidencia normal e pendencia critica visivel | Nao bloqueia a protecao da area de venda, mas nao declara seguranca plena ate sincronizar. | yes |
| Permitir so se o cache estiver fresco | Aumenta seguranca, mas cria excecoes que podem confundir no corredor. | |
| Exigir internet para acoes criticas | Reduz conflitos, mas falha no cenario mais importante da fase. | |

**User's choice:** Permitir, mas com confirmacao/evidencia normal e pendencia critica visivel.
**Notes:** Acoes criticas continuam com os guardrails ja existentes.

### Como garantir idempotencia sem expor detalhe tecnico para o usuario?

| Option | Description | Selected |
|--------|-------------|----------|
| Cada tentativa vira um comando local unico por acao fisica | Retries reenviam o mesmo comando; copy diz "Tentaremos novamente sem duplicar a acao." | yes |
| Gerar novo comando a cada retry | Mais simples em algumas camadas, mas arrisca duplicar acao. | |
| Agrupar comandos por tarefa e mandar so o ultimo estado | Reduz fila, mas pode apagar historico operacional importante. | |

**User's choice:** Cada tentativa vira um comando local unico por acao fisica.
**Notes:** Retry deve reenviar a mesma intencao local, nao criar nova acao.

---

## Pendencia em Hoje

### Depois de salvar uma acao offline, onde o marcador "Pendente de sincronizacao" deve aparecer?

| Option | Description | Selected |
|--------|-------------|----------|
| Na linha da tarefa, no feedback do painel e no resumo da fila | Consistente com o UI-SPEC; ninguem precisa adivinhar se ja chegou ao sistema. | yes |
| So no resumo da fila | Tela fica mais limpa, mas a tarefa individual pode parecer confirmada demais. | |
| So na linha da tarefa | Bom no contexto imediato, mas ruim para revisar pendencias acumuladas. | |

**User's choice:** Na linha da tarefa, no feedback do painel e no resumo da fila.
**Notes:** Pendencia precisa ser visivel no contexto imediato e no agregado.

### Se uma retirada critica foi feita offline, mas ainda nao sincronizou, como o topo de Hoje deve falar da area de venda?

| Option | Description | Selected |
|--------|-------------|----------|
| Mostrar progresso local com ressalva explicita | Exemplo: "Retirada salva neste aparelho. Area de venda ainda pendente de sincronizacao." | yes |
| Continuar como risco aberto sem reconhecer a acao local | Mais conservador, mas pode parecer que o app ignorou o trabalho. | |
| Marcar como segura localmente e deixar o aviso so na fila | Mais otimista, mas perigoso para lideranca e handoff. | |

**User's choice:** Mostrar progresso local com ressalva explicita.
**Notes:** Nao ha seguranca plena ate sync, mas o app reconhece o trabalho fisico.

### Como deve funcionar o resumo da fila de sincronizacao dentro do fluxo mobile?

| Option | Description | Selected |
|--------|-------------|----------|
| Painel compacto em Hoje, abaixo do status offline/sync | Mostra contagem por urgencia, conflitos primeiro, mais antigo critico e CTA "Sincronizar pendencias". | yes |
| Tela separada acessada por botao | Da mais espaco, mas parece dashboard de sync e pode esconder pendencias. | |
| Apenas avisos inline, sem resumo agregado | Reduz UI, mas dificulta entender varias acoes pendentes. | |

**User's choice:** Painel compacto em Hoje, abaixo do status offline/sync.
**Notes:** A fila deve ficar dentro da rotina de "Hoje".

### Quando uma acao pendente finalmente sincroniza, o que deve acontecer na tela?

| Option | Description | Selected |
|--------|-------------|----------|
| Remover marcador pendente e mostrar sucesso curto com horario | "Sincronizado as {horario}", mantendo o historico local da tarefa. | yes |
| Sumir imediatamente sem feedback | Rapido, mas pode deixar duvida se funcionou. | |
| Manter item em uma lista de concluidos sincronizados | Auditavel visualmente, mas puxa escopo de historico/auditoria para Phase 8. | |

**User's choice:** Remover marcador pendente e mostrar sucesso curto com horario.
**Notes:** Evitar transformar sync em auditoria visual completa.

---

## Conflito e Retry

### Quando houver conflito de sincronizacao, quais itens aparecem primeiro?

| Option | Description | Selected |
|--------|-------------|----------|
| Conflitos criticos acima de qualquer pendencia normal | Vencido/critico, rebaixa aplicada/conferida, retirada/perda e reconferencia ficam pinados ate revisao. | yes |
| Ordem cronologica da fila | Simples, mas pode enterrar conflito perigoso atras de pendencias menores. | |
| Agrupar por tarefa/produto | Organizado, mas menos direto para risco de area de venda. | |

**User's choice:** Conflitos criticos acima de qualquer pendencia normal.
**Notes:** Conflito critico fica pinado ate revisao explicita.

### Quando o sync falha sem conflito claro, como retry deve funcionar?

| Option | Description | Selected |
|--------|-------------|----------|
| Retry automatico limitado + botao manual visivel | Mantem a fila, mostra "Tentar sincronizar novamente" e explica que nao duplica a acao. | yes |
| So retry manual | Previsivel, mas exige lembrar de tentar. | |
| Retry automatico silencioso | Menos ruido, mas viola a regra de nao esconder pendencia. | |

**User's choice:** Retry automatico limitado + botao manual visivel.
**Notes:** Falha continua visivel na fila.

### Se o servidor mudou a tarefa enquanto o aparelho estava offline, quais escolhas a pessoa pode ver?

| Option | Description | Selected |
|--------|-------------|----------|
| Manter acao local, atualizar pela tarefa atual, ou descartar com motivo quando permitido | Segue o UI-SPEC e forca revisao humana. | yes |
| Sempre aceitar o servidor e descartar local | Mais simples, mas pode apagar uma retirada fisica real. | |
| Sempre reenviar a acao local | Preserva o trabalho local, mas pode contrariar estado atual da tarefa. | |

**User's choice:** Manter acao local, atualizar pela tarefa atual, ou descartar com motivo quando permitido.
**Notes:** O conflito precisa oferecer escolhas humanas e seguras.

### Quando descartar acao offline deve exigir confirmacao reforcada + motivo obrigatorio?

| Option | Description | Selected |
|--------|-------------|----------|
| Sempre que a acao for critica ou terminal | Retirada, perda, rebaixa aplicada/conferida, reconferencia critica, presenca que muda seguranca. | yes |
| Para todo descarte de qualquer comando | Mais seguro, mas pesado para acoes simples. | |
| So para retirada/perda | Mais leve, mas deixa outras acoes importantes frageis. | |

**User's choice:** Sempre que a acao for critica ou terminal.
**Notes:** Descarte critico precisa de motivo e confirmacao reforcada.

---

## the agent's Discretion

Nenhuma decisao foi delegada ao agente.

## Deferred Ideas

- Auditoria completa, timeline historica, lista de concluidos sincronizados, RBAC formal, storage real de evidencia/R2 e fechamento de turno pertencem a Phase 8.
- Integracao com vendas, estoque, ERP ou alteracao automatica de preco continua fora do v1.
- Dashboard administrativo de sync, monitoramento tecnico de rede e diagnostics screen ficam fora da Phase 7.
