---
status: complete
phase: 03-mobile-lot-capture
source:
  - 03-01-SUMMARY.md
  - 03-02-SUMMARY.md
  - 03-03-SUMMARY.md
  - 03-04-SUMMARY.md
started: 2026-06-19T23:34:02.8435128Z
updated: 2026-06-19T21:50:01.2782427-03:00
---

## Current Test

[testing complete]

## Tests

### 1. Abrir a captura manual
expected: A tela inicial mostra "Localizar produto", o campo de busca, "Buscar manualmente" e "Ler código" sem exigir câmera ou dados de venda.
result: pass

### 2. Criar e confirmar um produto
expected: Uma busca sem resultado permite abrir "Cadastrar produto"; ao informar nome e categoria, o produto aparece como "Produto confirmado" com categoria, perfil operacional e uma confirmação explícita antes do lote.
result: pass

### 3. Selecionar a data do lote
expected: Depois de confirmar o produto, "Data de validade" abre o calendário nativo; a escolha aparece em DD/MM/AAAA com prévia por extenso, sem exigir AAAA-MM-DD nem mostrar aviso de desenvolvimento.
result: pass
previous_issue: "O campo aceitava somente texto AAAA-MM-DD e a primeira implementação do seletor usava uma API depreciada."
fix_commits: [0d6d179, fe8e4e3]

### 4. Consultar e confirmar presença física
expected: O lote recente mostra produto, identificação, local e quantidade. Ao abrir o lote e registrar "Confirmar presença", uma quantidade pré-preenchida válida fica sem erro em vermelho e recebe orientação para a confirmação explícita, ou a alternativa "Não foi possível estimar".
result: pass
previous_issue: "Uma quantidade válida pré-preenchida aparecia como erro antes da confirmação operacional."
fix_commits: [9dcddb9]

### 5. Proteger uma ação consequente
expected: Ao marcar "Não encontrado", "Retirar lote", "Registrar perda" ou "Provavelmente esgotado", o app mostra "Confirme antes de registrar" e só grava a observação após "Confirmar registro".
result: pass

### 6. Manter a busca manual como fallback
expected: "Ler código" funciona apenas como ajuda de busca; voltar, negar a câmera ou não concluir uma leitura preserva a possibilidade de buscar por nome ou código e não cria lote automaticamente.
result: pass

### 7. Abrir lotes recentes pelo atalho
expected: Na tela "Localizar produto", tocar em "Recentes" abre "Lotes recentes", onde os lotes já registrados podem ser encontrados por produto, código ou identificação do lote.
result: pass
previous_issue: "O atalho Recentes mostrava apenas uma mensagem de apoio e não abria a lista de lotes existentes."
fix_commits: [0e1fdb6]

## Summary

total: 7
passed: 7
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "A data de validade deve ser rápida e clara de informar em um telefone, com formato orientado e validação que não dependa de decorar AAAA-MM-DD."
  status: fixed
  reason: "User reported: Consegui registrar o lote, mas o campo de data precisa melhorar e muito ainda."
  severity: major
  test: 3
  root_cause: "DateField was a free-text input that accepted only the ISO format AAAA-MM-DD; the first native-picker version used the deprecated onChange callback."
  artifacts:
    - path: "apps/mobile/src/capture/LotRegistrationScreen.tsx"
      issue: "The date entry now uses the native picker with current callback APIs."
  missing: []
  fix_commits: [0d6d179, fe8e4e3]

- truth: "O atalho Recentes abre a lista de lotes existentes a partir da busca inicial."
  status: fixed
  reason: "User reported: Ao tocar em Recentes, apareceu apenas uma mensagem de atalho de apoio."
  severity: major
  test: 7
  root_cause: "ProductDiscoveryScreen não delegava a navegação para a tela recent já existente em CaptureApp."
  artifacts:
    - path: "apps/mobile/src/capture/ProductDiscoveryScreen.tsx"
      issue: "Recentes agora chama onOpenRecent."
    - path: "apps/mobile/src/capture/CaptureApp.tsx"
      issue: "A descoberta conecta onOpenRecent à tela Lotes recentes."
  missing: []
  fix_commits: [0e1fdb6]
