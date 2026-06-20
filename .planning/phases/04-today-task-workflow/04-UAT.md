---
status: diagnosed
phase: 04-today-task-workflow
source: [04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md, 04-04-SUMMARY.md]
started: 2026-06-20T00:32:22.7624879-03:00
updated: 2026-06-20T01:18:59.8214585-03:00
---

## Current Test

[testing complete]

## Tests

### 1. Hoje abre como primeira tela
expected: Ao abrir o app com estado limpo, a primeira tela e "Hoje". Ela mostra "Area de venda segura", o botao "Atualizar tarefas", o botao principal "Registrar lote" e o atalho "Conferir lotes recentes".
result: pass

### 2. Registrar lote continua acessivel
expected: Tocar em "Registrar lote" abre "Localizar produto", com campo de busca, "Buscar manualmente" e caminho de leitura de codigo, sem exigir dados de venda ou integracao externa.
result: pass

### 3. Atualizar tarefas preserva a tela
expected: Tocar em "Atualizar tarefas" mantem a tela Hoje estavel. Se nao houver risco ativo, a mensagem de area segura permanece visivel; se houver falha de conexao, o app preserva a lista anterior e mostra aviso de recuperacao.
result: issue
reported: "atualizar tarefas nada acontece"
severity: major

### 4. Tarefas acionaveis aparecem por prioridade
expected: Quando existem lotes vencidos, criticos, para rebaixa ou com presenca incerta, eles aparecem como tarefas ativas por secao operacional. Itens de radar aparecem apenas como "Atencao futura", nao como tarefa ativa.
result: pass

### 5. Linha de tarefa mostra contexto suficiente
expected: Cada tarefa mostra acao indicada, produto, lote, local, prazo/severidade, responsavel e motivo do risco. Lotes diferentes do mesmo produto continuam aparecendo separadamente.
result: pass

### 6. Resolucao bloqueia acao incompativel
expected: Use a tarefa "Retirar agora" do item "UAT Produto Vencido", lote "UAT-VENCIDO-001". Nessa tarefa de validade vencida, tentar "Conferir presenca" nao resolve a pendencia. O app explica que lote vencido precisa ser retirado ou registrado como perda, e a tarefa continua ativa.
result: pass

### 7. Retirada ou perda cria reconferencia
expected: No mesmo item "UAT Produto Vencido", lote "UAT-VENCIDO-001", selecione "Retirar agora" ou "Registrar perda". O app deve abrir a confirmacao "Confirme antes de registrar", mostrar "Destino: Retirada/perda" e avisar que a area de venda continuara bloqueada ate a reconferencia. Depois de confirmar, a tela Hoje deve continuar com risco ativo mostrando "Reconferir area de venda", sem voltar direto para area segura.
result: pass

### 8. Reconferencia exige evidencia ou motivo
expected: Depois que uma retirada/perda cria "Reconferir area de venda", a tarefa de reconferencia so conclui com "Registrar foto da area" ou com motivo explicito de sem foto, como "Camera indisponivel". O registro nao inclui uri, base64 ou chave de objeto de foto.
result: pass

### 9. Tarefas atrasadas ficam no topo
expected: Na tela Hoje, com os fixtures "UAT Produto Atrasado" e "UAT Produto Hoje", a secao "Atrasadas" aparece antes das demais secoes. O item atrasado mostra o rotulo "Atrasada" e fica acima do item de hoje.
result: pass

### 10. Tela segue usavel no celular
expected: Labels visiveis e nomes acessiveis continuam claros; botoes principais tem area de toque confortavel; texto longo quebra linha em vez de cortar; significado de risco nao depende apenas de cor.
result: issue
reported: "pra mim parece bom mais ainda nao esta 100% refinado e polido nao"
severity: cosmetic

## Summary

total: 10
passed: 8
issues: 2
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Tocar em \"Atualizar tarefas\" mantem a tela Hoje estavel. Se nao houver risco ativo, a mensagem de area segura permanece visivel; se houver falha de conexao, o app preserva a lista anterior e mostra aviso de recuperacao."
  status: failed
  reason: "User reported: atualizar tarefas nada acontece"
  severity: major
  test: 3
  root_cause: "TodayScreen only changes the refresh button label while the request is pending; on a fast successful refresh with unchanged data there is no persistent success/no-change feedback, so the action can feel inert."
  artifacts:
    - path: "apps/mobile/src/capture/TodayScreen.tsx"
      issue: "Manual refresh success path updates data but does not leave visible completion feedback."
    - path: "apps/mobile/src/capture/today-accessibility.test.tsx"
      issue: "Tests cover transient refreshing state but not post-refresh success feedback."
  missing:
    - "Add visible manual-refresh completion/no-change feedback."
    - "Prevent duplicate refresh taps or expose a clearer pending state."
    - "Cover successful manual refresh feedback with a focused test."
  debug_session: ".planning/debug/uat-refresh-feedback.md"
- truth: "Labels visiveis e nomes acessiveis continuam claros; botoes principais tem area de toque confortavel; texto longo quebra linha em vez de cortar; significado de risco nao depende apenas de cor."
  status: failed
  reason: "User reported: pra mim parece bom mais ainda nao esta 100% refinado e polido nao"
  severity: cosmetic
  test: 10
  root_cause: "The Today workflow meets functional and accessibility constraints, but the visual system is still MVP-level: flat color slabs, square controls, repeated critical backgrounds, and little refined hierarchy beyond raw spacing/color."
  artifacts:
    - path: "apps/mobile/src/capture/TodayScreen.tsx"
      issue: "Safety header, sections, and task rows are visually clear but utilitarian and repetitive."
    - path: "apps/mobile/src/capture/capture-ui.tsx"
      issue: "Shared primitives lack a polished token treatment, softened shape, pressed/disabled nuance, and refined notice/button hierarchy."
  missing:
    - "Run focused UI polish pass for the Today workflow."
    - "Introduce small local tokens for shape, spacing, borders, and risk surfaces."
    - "Add screenshot-driven mobile verification for the refined state."
  debug_session: ".planning/debug/uat-today-polish.md"
