# Phase 6: Markdown/Rebaixa Workflow - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-06-20T18:56:41.2002490-03:00
**Phase:** 6-Markdown/Rebaixa Workflow
**Areas discussed:** Quando a rebaixa nasce, Estados e responsaveis, Atrasos e cobranca, Evidencia de etiqueta/prateleira

---

## Quando a rebaixa nasce

| Question | Options considered | Selected |
|----------|--------------------|----------|
| Quando um colaborador pode iniciar uma solicitacao de rebaixa para um lote? | So na janela; Janela + excecao; Manual livre | Janela + excecao |
| Quem pode abrir essa excecao antecipada? | Colaborador justifica, lideranca aprova; So lideranca abre excecao; Colaborador abre e ja vira rebaixa | Colaborador justifica, lideranca aprova |
| A rebaixa pode ser pedida se a presenca fisica do lote estiver desatualizada? | Conferir presenca antes; Pedir com alerta de incerteza; Pedir so pelo cadastro do lote | Conferir presenca antes |
| Onde o colaborador deve iniciar a rebaixa quando o lote estiver elegivel? | Hoje + detalhe do lote; So em Hoje; So no detalhe do lote | Hoje + detalhe do lote |

**User's choice:** A rebaixa normal nasce em `markdown_due`; antecipada existe como excecao justificada, sinalizada por colaborador e aprovada pela lideranca. Presenca incerta exige conferencia fisica antes.
**Notes:** A recomendacao privilegiou disciplina operacional sem negar casos reais de loja.

---

## Estados e responsaveis

| Question | Options considered | Selected |
|----------|--------------------|----------|
| Qual deve ser a espinha dorsal do fluxo de rebaixa? | Esteira bloqueada; Esteira flexivel; Status simples | Esteira bloqueada |
| Quem avanca cada etapa? | Colaborador pede/aplica, lideranca aprova; Lideranca controla tudo; Equipe avanca tudo, lideranca acompanha | Colaborador pede/aplica, lideranca aprova |
| Quando uma rebaixa e aprovada, quem deve receber a proxima tarefa de aplicacao? | Equipe do turno; Mesmo colaborador que pediu; Lideranca escolhe responsavel | Equipe do turno |
| Como tratar uma rebaixa reprovada pela lideranca? | Encerrar com motivo e voltar ao monitoramento; Voltar para ajuste; Manter pendente ate aprovar | Encerrar com motivo e voltar ao monitoramento |

**User's choice:** Usar esteira bloqueada `solicitada -> aprovada -> aplicada -> conferida_na_area_de_venda`; colaborador solicita/aplica, lideranca aprova/reprova, equipe do turno aplica apos aprovacao.
**Notes:** Reprovacao fecha com motivo e devolve o lote ao monitoramento normal, evitando cobranca falsa.

---

## Atrasos e cobranca

| Question | Options considered | Selected |
|----------|--------------------|----------|
| Como o app deve tratar atraso em cada etapa da rebaixa? | SLA por etapa; Prazo unico ate concluir; Sem prazo formal | SLA por etapa |
| Qual severidade deve ser usada para atrasos de rebaixa? | Aplicar e conferir pesam mais; Todas iguais; So conferencia final e critica | Aplicar e conferir pesam mais |
| Atrasos de rebaixa devem virar novas tarefas por etapa ou atualizar a tarefa existente? | Uma tarefa ativa por etapa; Uma tarefa unica com status interno; Tarefa principal + subtarefas | Uma tarefa ativa por etapa |
| Quando a rebaixa se atrasa, quem deve ser cobrado? | Responsavel da etapa + lideranca; Sempre lideranca; Sempre equipe do turno | Responsavel da etapa + lideranca |

**User's choice:** Cada etapa tem prazo proprio; atrasos usam copy/visual forte e a cadencia de escalonamento da Fase 5; uma tarefa ativa por etapa preserva clareza em "Hoje".
**Notes:** Aplicacao e conferencia atrasadas tem mais peso porque afetam diretamente a etiqueta e a area de venda.

---

## Evidencia de etiqueta/prateleira

| Question | Options considered | Selected |
|----------|--------------------|----------|
| Em quais etapas a foto deve ser solicitada? | Aplicacao e conferencia final; So conferencia final; So aplicacao | Aplicacao e conferencia final |
| A foto deve ser obrigatoria ou opcional? | Foto preferencial + motivo sem foto; Foto obrigatoria sempre; Foto totalmente opcional | Foto preferencial + motivo sem foto |
| O que a evidencia precisa representar? | Etiqueta e contexto de gondola; Qualquer foto operacional; So marcar que viu | Etiqueta e contexto de gondola |
| Como o app deve tratar a evidencia nesta fase? | Metadado local seguro; Guardar foto local completa agora; So texto por enquanto | Metadado local seguro |

**User's choice:** Foto deve ser pedida na aplicacao e na conferencia final; sem foto exige motivo; evidencia deve representar etiqueta/preco e contexto de gondola, registrada como metadado local seguro nesta fase.
**Notes:** Storage completo de fotos e auditoria ficam para fase posterior.

---

## Discricionariedade do agente

Nenhuma area foi delegada ao agente.

## Deferred Ideas

- Integracao com ERP ou alteracao automatica de preco continua fora do v1.
- Storage real de fotos, R2, controle de acesso, auditoria completa e roles formais pertencem a Fase 8.
- Offline sync pertence a Fase 7.
