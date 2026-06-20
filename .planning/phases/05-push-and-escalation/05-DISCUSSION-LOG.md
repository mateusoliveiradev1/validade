# Phase 5: Push and Escalation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-20
**Phase:** 5-Push and Escalation
**Areas discussed:** Cadência de cobrança, Destinatário e escalonamento, Falha de push e permissões, Conteúdo e tom do alerta

---

## Cadência de cobrança

| Option | Description | Selected |
|--------|-------------|----------|
| Escada por gravidade | `now`: criação, 15 min, escala em 30 min; `shift`: criação, 60 min, escala em 2 h. | ✓ |
| Cadência única | Mesmo intervalo para toda tarefa ativa. | |
| Um lembrete e escalonamento | Lembra na criação e volta só quando atrasada. | |

**User's choice:** Escada por gravidade.
**Notes:** Risco vencido/crítico/reconferência na área de venda continua sendo cobrado fora do turno; as demais tarefas aguardam o próximo turno. Reconferência é uma nova pendência com cadência própria. A política tem padrão seguro e exceções por perfil de categoria/produto, sem tela administrativa nesta fase.

---

## Destinatário e escalonamento

| Option | Description | Selected |
|--------|-------------|----------|
| Dono ou equipe do turno | Notifica o responsável individual; sem dono, os dispositivos do turno. | ✓ |
| Todo o turno sempre | Notifica todos desde o início. | |
| Só a liderança | Direciona a cobrança inicial à liderança. | |

**User's choice:** Dono ou equipe do turno, escalando para liderança local.
**Notes:** Após escalar, responsável e liderança seguem recebendo cobrança. A liderança confirma recebimento com horário e pode assumir a cobrança, mas não encerra o risco.

---

## Falha de push e permissões

| Option | Description | Selected |
|--------|-------------|----------|
| Convite contextual | Explica o uso dos alertas em "Hoje" antes de abrir a permissão do sistema. | ✓ |
| Pedido no primeiro lançamento | Pede automaticamente ao abrir o app. | |
| Apenas configurações | Deixa a ativação escondida nas configurações. | |

**User's choice:** Convite contextual com aviso persistente se o canal falhar.
**Notes:** Falha de permissão, token ou entrega mantém tarefas ativas, oferece retentativas limitadas e um estado visível. Tocar o push abre a tarefa atual; se ela mudou, abre "Hoje" explicando a atualização.

---

## Conteúdo e tom do alerta

| Option | Description | Selected |
|--------|-------------|----------|
| Ação e urgência primeiro | Exibe ação, produto, lote, local e urgência; detalhes adicionais ficam no app. | ✓ |
| Mensagem curta sem contexto | Exige abrir o app para entender a pendência. | |
| Máximo de detalhes | Exibe quantidade, motivos e histórico no alerta. | |

**User's choice:** Ação e urgência primeiro, com resumo seguro na tela bloqueada.
**Notes:** O tom é direto e sem culpa. Tela bloqueada mostra ação, produto e local; lote e detalhes aparecem após desbloquear. A notificação só oferece "Abrir tarefa" — resoluções físicas nunca são concluídas pelo push.

---

## the agent's Discretion

Nenhuma decisão foi delegada ao agente.

## Deferred Ideas

- Corrigir os atalhos "Frequentes" e "Por categoria" como tarefa rápida GSD antes de avançar para o planejamento da Fase 5.
