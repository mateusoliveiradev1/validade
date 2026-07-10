# Phase 19: Integração do Controle GPP com Hoje - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `19-CONTEXT.md`; this log preserves the alternatives considered.

**Date:** 2026-07-10T07:02:35.8985678-03:00
**Phase:** 19-integracao-do-controle-gpp-com-hoje
**Areas discussed:** Sequência da retirada até o GPP; Quando o risco sai do Hoje; Quantidade, código e vínculo ao lote; Offline, rejeição e retomada

---

## Sequência da retirada até o GPP

| Pergunta | Opções apresentadas | Escolha |
|---|---|---|
| Quando mostrar as opções GPP? | Depois de confirmar a retirada, no mesmo fluxo; antes da confirmação; em tela separada | Depois de confirmar a retirada, no mesmo fluxo |
| Quais ações devem aparecer? | Quatro ações explícitas; somente avaria; ação genérica com destino posterior | `Registrar avaria`, `Enviar para reaproveitamento`, `Enviar para produção interna` e `Confirmar esgotado` separado |
| Quando o registro GPP deve ser obrigatório? | Para produto físico retirado; inclusive para esgotado; sempre opcional | Para produto físico retirado; esgotado não gera GPP |
| Deve existir revisão antes do envio? | Revisão completa; envio imediato; revisar somente quantidade e destino | Revisar lote, código, quantidade/unidade e destino |

**User's choice:** todas as opções recomendadas.
**Notes:** o usuário confirmou a área e pediu para seguir.

---

## Quando o risco sai do Hoje

| Pergunta | Opções apresentadas | Escolha |
|---|---|---|
| Retirada confirmada, mas GPP sem confirmação central: o que acontece com a tarefa? | Resolver risco e separar pendência GPP; manter tarefa ativa; retirar da lista principal e manter seção aguardando GPP | Resolver o risco e separar a pendência GPP |
| O que confirma que o produto saiu da área de venda? | Confirmação explícita preservando evidência; destino implica retirada; liderança obrigatória | Confirmação explícita preservando evidência |
| O que acontece numa retirada parcial? | Movimento parcial e restante ativo; resolver tudo e criar nova tarefa; bloquear parcial | Movimento parcial e restante ativo |
| Rejeição GPP reabre o risco? | Somente se indicar produto/quantidade ainda na área; sempre; nunca e descartar | Somente se indicar risco físico restante |

**User's choice:** opção recomendada em todas as perguntas.
**Notes:** o estado físico e o estado de entrega GPP permanecem separados.

---

## Quantidade, código e vínculo ao lote

| Pergunta | Opções apresentadas | Escolha |
|---|---|---|
| Como os dados devem vir ao abrir pelo Hoje? | Prefill com identidade vinculada; prefill totalmente editável; formulário vazio | Prefill de produto, código, lote e unidade, ajustando apenas quantidade retirada |
| Como tratar quantidade diferente da tarefa? | Parcial permitida e aumento auditável; qualquer quantidade; quantidade fixa | Parcial permitida e aumento sujeito a correção/reconferência |
| Como seguir sem código válido? | Exigir código e distinguir dado incompleto de offline; enviar sem código; usar nome | Exigir código válido; retirada física permanece separada |
| Como registrar vários lotes do mesmo produto? | Movimentos separados; consolidar por código; escolha livre | Movimentos separados por lote |

**User's choice:** opção recomendada em todas as perguntas.
**Notes:** `Falta informar o código` não pode usar a semântica `Pendente neste aparelho`.

---

## Offline, rejeição e retomada

| Pergunta | Opções apresentadas | Escolha |
|---|---|---|
| O que acontece sem comunicação com o servidor? | Pendência local idempotente; manter tarefa ativa; exigir novo preenchimento | `Pendente neste aparelho`, separado do risco físico |
| Como mostrar rejeição central? | `Corrigir envio`; fila offline; descartar e voltar | `Corrigir envio`, preservando motivo e dados |
| Como retomar um conflito? | Comparar versões, corrigir/repetir e justificar descarte; sobrescrever central; descartar automático | Conflito revisável e descarte justificado |
| Como reenviar pendências? | Automático e manual com mesma chave; somente manual; nova solicitação por tentativa | Retentativa automática/manual idempotente e sucesso após ack central |

**User's choice:** opção recomendada em todas as perguntas.
**Notes:** somente falha real de transporte cria pendência local; rejeição central nunca é falso offline.

## the agent's Discretion

- Nomes internos de componentes, callbacks, rotas, métodos e tabelas locais.
- Detalhes visuais e de hierarquia que serão fechados no `19-UI-SPEC.md`.
- Agendamento técnico das retentativas, dentro das decisões de idempotência e verdade operacional.

## Deferred Ideas

- Compras internas continuam fora do `Hoje`.
- Central GPP mobile completa permanece na Phase 20.
- Realtime do `Hoje` permanece na Phase 21.
- Nova build, push e deploy permanecem para uma etapa deliberada após conclusão e validação do GPP.
