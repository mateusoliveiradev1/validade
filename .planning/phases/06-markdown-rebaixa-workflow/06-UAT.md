---
status: testing
phase: 06-markdown-rebaixa-workflow
source: [06-01-SUMMARY.md, 06-02-SUMMARY.md, 06-03-SUMMARY.md, 06-04-SUMMARY.md]
started: 2026-06-20T20:49:00-03:00
updated: 2026-06-21T16:11:22-03:00
---

## Current Test

number: 3
name: Aprovar rebaixa cria a etapa de aplicacao
expected: |
  Abrir "Aprovar rebaixa", selecionar a aprovacao e confirmar encerra somente essa etapa. Em Hoje aparece uma nova tarefa "Aplicar rebaixa" para a equipe do turno.
awaiting: user response

## Tests

### 1. Hoje abre como entrada operacional
expected: Ao abrir o app, a primeira tela e "Hoje". Ela mostra o veredito da area de venda, "Atualizar tarefas", "Registrar lote" e "Conferir lotes recentes".
result: pass

### 2. Solicitar rebaixa para lote elegivel
expected: Toque em "Registrar lote". Busque "Queijo UAT" e, sem resultado, cadastre o produto com categoria "uat" e perfil "Validade formal". Confirme o produto e registre o lote impresso "UAT-REB-001", quantidade 10, local "Area de venda" e validade 30/06/2026. Ao concluir, Hoje deve mostrar "Solicitar rebaixa". No detalhe do lote, a mesma acao deve aparecer; ao solicitar, o app volta para Hoje com "Aprovar rebaixa".
result: pass
previous_issue: "Hoje falhava ao atualizar depois do cadastro e o detalhe falhava ao solicitar a rebaixa."
fix: "Migrou bancos SQLite legados com colunas markdown em today_tasks e corrigiu a tarefa de Hoje para iniciar o workflow via requestMarkdown."
verified: "Emulador mostrou Solicitar rebaixa para Queijo UAT, o detalhe solicitou sem erro e Hoje voltou com Aprovar rebaixa."

### 3. Aprovar rebaixa cria a etapa de aplicacao
expected: Abrir "Aprovar rebaixa", selecionar a aprovacao e confirmar encerra somente essa etapa. Em Hoje aparece uma nova tarefa "Aplicar rebaixa" para a equipe do turno.
result: [pending]

### 4. Aplicar rebaixa exige evidencia estruturada
expected: A etapa "Aplicar rebaixa" mostra "Comprove a etiqueta aplicada". O botao "Registrar etiqueta aplicada" permanece desabilitado ate escolher a foto simulada ou um motivo sem foto. Ao concluir, surge "Conferir etiqueta na area de venda".
result: [pending]

### 5. Confirmar etiqueta na area de venda
expected: A etapa final mostra "Comprove na area de venda", exige foto simulada ou motivo sem foto e, ao confirmar, encerra o fluxo de rebaixa sem manter outra tarefa ativa para esse workflow.
result: [pending]

### 6. Reprovar rebaixa exige motivo e encerra o fluxo
expected: Em uma nova solicitacao, selecionar "Reprovar rebaixa" exibe "Motivo da reprovacao". A acao fica desabilitada sem texto; com motivo preenchido, a rebaixa e encerrada e nenhuma tarefa de aplicacao e criada.
result: [pending]

### 7. Presenca incerta bloqueia a solicitacao
expected: Um lote marcado como nao encontrado ou provavelmente esgotado mostra "Conferir presenca antes da rebaixa". Tocar nessa acao abre o registro de observacao e nao cria uma solicitacao de rebaixa.
result: [pending]

### 8. Workflow ativo nao pode ser duplicado
expected: Ao abrir o detalhe de um lote que ja possui rebaixa ativa, o app mostra "Rebaixa em andamento" com a etapa atual. Tocar nela abre a tarefa corrente em Hoje, sem criar outra solicitacao.
result: [pending]

## Summary

total: 8
passed: 2
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps

- truth: "Um lote elegivel pode atualizar Hoje e iniciar a solicitacao de rebaixa sem erro."
  status: resolved
  reason: "User reported: quando finalizou voltou para a tela hoje com esse erro e na hora de solicitar a rebaixa esse erro ai"
  severity: blocker
  test: 2
  root_cause: "Existing SQLite databases keep the pre-Phase-6 today_tasks schema because CREATE TABLE IF NOT EXISTS does not add markdown_workflow_id or markdown_stage; Phase 6 upserts then fail."
  artifacts:
    - path: "apps/mobile/src/capture/sqlite-repository.ts"
      issue: "Initialization creates the new table shape only for fresh databases and has no additive migration for legacy today_tasks."
  missing:
    - "Add idempotent nullable-column migration before Today task upserts."
    - "Add regression coverage for initialization from the legacy today_tasks schema."
    - "Route request_markdown task submissions through requestMarkdown instead of generic task resolution."
  resolution: "Live emulator retest returned to Hoje with Aprovar rebaixa for Queijo UAT after the fix."
  debug_session: ".planning/debug/markdown-sqlite-migration.md"
