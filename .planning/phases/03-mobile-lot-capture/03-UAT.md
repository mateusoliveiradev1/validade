---
status: complete
phase: 03-mobile-lot-capture
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md, 03-04-SUMMARY.md]
started: 2026-06-19T23:34:02.8435128Z
updated: 2026-06-19T21:56:00.0000000-03:00
---

## Current Test

[testing complete]

## Tests

### 1. Abrir a captura manual
expected: A tela inicial permite busca manual e leitura opcional de código sem exigir câmera ou dados de venda.
result: pass

### 2. Criar e confirmar um produto
expected: Uma busca sem resultado permite cadastrar e confirmar explicitamente um produto antes do lote.
result: pass

### 3. Selecionar a data do lote
expected: O calendário nativo informa a data em DD/MM/AAAA, sem exigir AAAA-MM-DD nem emitir aviso de desenvolvimento.
result: pass
previous_issue: "Campo aceitava apenas AAAA-MM-DD e o primeiro seletor usava API depreciada."
fix_commits: [0d6d179, fe8e4e3]

### 4. Consultar e confirmar presença física
expected: Quantidade pré-preenchida válida fica neutra e exige confirmação operacional explícita antes do registro.
result: pass
previous_issue: "Quantidade válida pré-preenchida aparecia como erro antes da confirmação."
fix_commits: [9dcddb9]

### 5. Proteger uma ação consequente
expected: Retirada, perda, não encontrado e provável esgotamento pedem confirmação antes de gravar.
result: pass

### 6. Manter a busca manual como fallback
expected: Câmera é apenas ajuda de busca; voltar ou não concluir uma leitura preserva a busca manual e não cria lote.
result: pass

### 7. Abrir lotes recentes pelo atalho
expected: Recentes abre Lotes recentes, onde lotes existentes podem ser encontrados por produto, código ou identificação.
result: pass
previous_issue: "Recentes mostrava apenas uma mensagem e não abria a lista."
fix_commits: [0e1fdb6]

### 8. Mostrar horário operacional local
expected: Lista e detalhe mostram data e hora America/Sao_Paulo, sem segundos e sem deslocamento UTC.
result: pass
previous_issue: "A lista mostrava 00:41 enquanto o horário local era 21:41."
fix_commits: [9d1fef8]

## Summary

total: 8
passed: 8
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Data de validade é rápida e clara de informar no telefone."
  status: fixed
  severity: major
  test: 3
  root_cause: "Entrada livre ISO e callback depreciado."
  missing: []
  fix_commits: [0d6d179, fe8e4e3]

- truth: "Recentes abre a lista de lotes existentes a partir da busca inicial."
  status: fixed
  severity: major
  test: 7
  root_cause: "A descoberta não delegava navegação para a tela recent."
  missing: []
  fix_commits: [0e1fdb6]

- truth: "Horários de observação aparecem no fuso operacional America/Sao_Paulo."
  status: fixed
  severity: major
  test: 8
  root_cause: "Os formatadores de apresentação forçavam UTC."
  missing: []
  fix_commits: [9d1fef8]
