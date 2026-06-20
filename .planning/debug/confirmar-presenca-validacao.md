---
status: resolved
trigger: "confirmar presença ficou assim"
created: 2026-06-19T21:09:17.4744988-03:00
updated: 2026-06-19T21:18:14.9476819-03:00
---

## Symptoms

- expected: "Ao selecionar Confirmar presença, uma quantidade pré-preenchida e válida não deve ser apresentada como erro; a confirmação explícita deve ser clara."
- actual: "A tela mostra 20 em Quantidade confirmada e, simultaneamente, destaca o campo em vermelho com a mensagem 'Informe a quantidade confirmada para registrar este lote'."
- error_messages: "Informe a quantidade confirmada para registrar este lote."
- timeline: "Observado no primeiro teste de Confirmar presença durante o UAT da Fase 3."
- reproduction: "Abrir um lote recente com quantidade estimada, escolher Registrar observação e selecionar Confirmar presença."

## Current Focus

hypothesis: "O estado quantityConfirmed estava sendo reutilizado como erro do campo, embora a quantidade pré-preenchida fosse válida."
test: "Teste de componente para uma quantidade pré-preenchida válida antes e depois da confirmação explícita."
expecting: "A quantidade válida permanece neutra, recebe orientação clara e habilita o registro somente após confirmação."
next_action: "UAT: testar Confirmar presença novamente no emulador."

## Evidence

- timestamp: 2026-06-19T21:09:17.4744988-03:00
  detail: "ObservationComposer aplicava requiredFieldError quando !quantityConfirmed, inclusive para quantity='20' válido."
- timestamp: 2026-06-19T21:18:14.9476819-03:00
  detail: "A regressão de componente confirmou que o valor 20 não recebe erro e que o registro só habilita após a confirmação explícita."

## Eliminated

[]

## Resolution

root_cause: "A condição visual de erro misturava duas regras diferentes: valor de quantidade inválido e confirmação operacional pendente."
fix: "Erros aparecem apenas quando a confirmação de uma quantidade inválida é tentada; uma dica neutra orienta a confirmação de uma quantidade válida e qualquer edição exige nova confirmação."
verification: "pnpm --filter @validade-zero/mobile test; pnpm --filter @validade-zero/mobile typecheck; pnpm lint; pnpm format:check"
files_changed:
  - apps/mobile/src/capture/ObservationComposer.tsx
  - apps/mobile/src/capture/observation-composer.test.tsx
  - eslint.config.mjs
