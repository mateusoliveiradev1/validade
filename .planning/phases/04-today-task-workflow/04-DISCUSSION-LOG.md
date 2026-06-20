# Phase 4: Today Task Workflow - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-19T22:38:21.0407486-03:00
**Phase:** 4-Today Task Workflow
**Areas discussed:** Geração e prioridade das tarefas, Resolução permitida, Tela Hoje e sensação operacional, Responsável e prazo

---

## Geração e prioridade das tarefas

| Question | Selected | Alternatives considered |
|----------|----------|-------------------------|
| Quando o sistema calcula riscos, o que deve virar tarefa na Fase 4? | Somente riscos acionáveis agora: `expired`, `critical`, `markdown_due` e `uncertain`; `radar` aparece como atenção, mas não como tarefa. | Todo risco vira tarefa; só críticos e vencidos. |
| Como ordenar a lista "Hoje"? | Risco na área de venda primeiro. | Prazo mais próximo primeiro; rota física primeiro. |
| Quando vários lotes parecidos geram risco, como a tarefa deve nascer? | Uma tarefa por lote, agrupada visualmente por produto/local. | Uma tarefa agrupada por produto + local + ação; uma tarefa por produto. |
| Quando as tarefas "Hoje" devem ser geradas ou atualizadas? | Ao abrir/atualizar "Hoje" e depois de cada registro/observação. | Só no início do turno; só manualmente por botão de recalcular. |

**User's choice:** O usuário escolheu sempre a opção recomendada.
**Notes:** O objetivo foi proteger "0 vencidos na área de venda" sem transformar monitoramento preventivo em ruído.

---

## Resolução permitida

| Question | Selected | Alternatives considered |
|----------|----------|-------------------------|
| Uma tarefa pode ser encerrada só com uma ação concreta compatível com o risco, ou qualquer observação física já basta? | Fechamento por ação compatível. | Qualquer observação física fecha; tarefa nunca fecha automaticamente. |
| Quando a ação reduz o risco, mas ainda não garante segurança, o que acontece com a tarefa? | Fecha a tarefa atual, mas cria/agenda pendência de reconferência ou acompanhamento quando necessário. | Mantém a mesma tarefa aberta até confirmação total; fecha tudo e só deixa histórico. |
| Como deve ser a confirmação antes de uma ação crítica? | Resumo reforçado antes de concluir. | Botão normal; confirmar digitando uma palavra curta. |
| Se a pessoa tenta resolver com uma ação incompatível, como a UI deve responder? | Bloquear com explicação e sugerir ação correta. | Permitir mantendo aberta; permitir e rebaixar severidade. |
| Quando um lote venceu e estava na área de venda, como validar fortemente que ele foi de fato retirado? | Retirada reforçada, destino `Retirada/perda`, reconferência da área de venda, foto quando possível e motivo explícito quando não houver foto. | Segunda pessoa/lead nesta fase; só confirmação reforçada + destino. |

**User's choice:** O usuário aceitou o fluxo compatível e puxou uma pergunta adicional sobre validação forte de retirada vencida.
**Notes:** A pergunta sobre foto/evidência foi incorporada como decisão central: evitar que um clique fraco restaure segurança falsa.

---

## Tela Hoje e sensação operacional

| Question | Selected | Alternatives considered |
|----------|----------|-------------------------|
| Qual deve ser a mensagem principal no topo da tela "Hoje"? | Estado de segurança da área de venda. | Quantidade de tarefas; saudação + resumo. |
| Quando há risco crítico na área de venda, como a tela deve se comportar visualmente? | Modo crítico dominante com banner forte, primeira tarefa expandida e CTA direto. | Lista normal com vermelho; modal bloqueante ao abrir. |
| Como organizar as seções da tela "Hoje"? | Por urgência operacional. | Por local físico; por produto/categoria. |
| Qual é o tom da copy nas tarefas? | Direto, operacional e sem culpa. | Muito alarmista; neutro administrativo. |
| Quando não há tarefa crítica, mas existem tarefas de acompanhamento ou rebaixa, o topo deve dizer o quê? | "Área de venda segura, ainda há tarefas do turno." | "X tarefas pendentes"; "Tudo certo por enquanto." |
| Cada card de tarefa deve mostrar quais informações de cara? | Ação + produto/lote + local + prazo/severidade. | Produto primeiro; só ação e produto. |
| Como mostrar `radar`, já que não vira tarefa? | Faixa discreta "Atenção futura" no fim da tela. | Não mostrar radar; misturar radar como tarefa leve. |
| Quando a lista está vazia de tarefas acionáveis, qual empty state queremos? | "Área de venda segura agora" + convite para registrar/conferir lotes. | "Nenhuma tarefa para hoje"; "Parabéns, tudo certo!" |

**User's choice:** O usuário escolheu as opções recomendadas e pediu perguntas extras sobre a tela.
**Notes:** A tela deve parecer cockpit operacional, não dashboard passivo.

---

## Responsável e prazo

| Question | Selected | Alternatives considered |
|----------|----------|-------------------------|
| Como atribuir tarefas na Fase 4? | Dono operacional simples: "equipe do turno", com possibilidade de assumir por nome/label local. | Exigir responsável antes de aparecer; sem responsável na Fase 4. |
| Como definir prazo/due time das tarefas? | Por severidade e ação exigida. | Tudo vence no fim do turno; prazo manual por tarefa. |
| O que acontece quando uma tarefa fica atrasada na Fase 4, antes de push/escalonamento? | Fica fixada no topo e muda copy/visual para atrasada. | Só mostrar horário vencido; alerta/modal recorrente. |
| O colaborador precisa assumir uma tarefa antes de resolver? | Pode resolver direto; assumir é opcional e automático ao agir. | Precisa assumir antes; nunca assume, só registra quem fez. |

**User's choice:** O usuário escolheu as opções recomendadas.
**Notes:** A decisão evita RBAC prematuro, mas preserva responsabilidade local e prepara liderança futura.

---

## Discricionariedade do agente

Nenhuma área foi delegada ao agente. Todas as decisões acima foram escolhidas ou confirmadas pelo usuário.

## Deferred Ideas

- Push, lembretes recorrentes e escalonamento: Phase 5.
- Rebaixa completa, aprovação, aplicação e foto de etiqueta: Phase 6.
- Offline sync e comandos idempotentes: Phase 7.
- Auditoria completa, roles formais, evidência com storage controlado e fechamento de turno: Phase 8.
- Impeccable hardening final: Phase 9.
