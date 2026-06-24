---
status: resolved
trigger: "Usuario reportou no APK real que a tela Ler codigo mostra erro e a camera nao funciona."
created: 2026-06-24
updated: 2026-06-24
---

# Debug Session: mobile-camera-permission

## Symptoms

- expected_behavior: Ao abrir Ler codigo, o app deve pedir permissao de camera de forma clara; se permitido, mostrar o scanner; se bloqueado, orientar abrir configuracoes ou buscar manualmente.
- actual_behavior: A tela mostra o erro "Nao foi possivel usar a camera" junto com "Permitir camera", mesmo antes de diferenciar permissao ainda nao solicitada, negada ou bloqueada.
- error_messages: "Nao foi possivel usar a camera. Voce pode buscar o produto por nome ou codigo."
- timeline: Depois do APK staging corrigido do crash Android.
- reproduction: Entrar no app logado, abrir fluxo de Localizar produto/Ler codigo em aparelho Android sem permissao de camera concedida.

## Current Focus

- hypothesis: O app declara a permissao nativa corretamente, mas `BarcodeLookupAssistant` tratava qualquer `!permission.granted` como erro fatal em vez de separar `undetermined`, `denied/canAskAgain` e `denied/cannotAskAgain`.
- test: Ajustar o fluxo de permissao da camera, adicionar testes cobrindo pedido inicial, negacao bloqueada e scanner quando concedido, validar typecheck/testes e rebuildar APK.
- expecting: A tela inicial mostra CTA neutro para permitir camera; erro so aparece quando a permissao foi bloqueada ou quando o preview falha; o usuario tem caminho para Configuracoes quando Android nao permite perguntar de novo.
- next_action: build staging apk and verify camera permission screen on Android
- reasoning_checkpoint:
- tdd_checkpoint:

## Evidence

- timestamp: 2026-06-24
  observation: `adb shell dumpsys package com.validadezero.app` lista `android.permission.CAMERA` em requested permissions.
  implication: O APK staging declara permissao de camera no manifesto; a falha nao e ausencia basica de permissao nativa.
- timestamp: 2026-06-24
  observation: No emulador, `android.permission.CAMERA: granted=false` e `appops CAMERA: ignore`.
  implication: A tela precisa lidar bem com permissao nao concedida/negada e orientar reativacao quando necessario.
- timestamp: 2026-06-24
  observation: `BarcodeLookupAssistant` renderiza `StatusNotice tone="error"` para `permission === null || !permission.granted`.
  implication: Estado inicial/negado da permissao e apresentado como falha da camera, piorando a experiencia e escondendo o proximo passo correto.
- timestamp: 2026-06-24
  observation: `BarcodeLookupAssistant` agora trata `permission === null/undefined` como carregando, `undetermined/canAskAgain` como pedido neutro, `denied/canAskAgain=false` como bloqueio com acao de abrir configuracoes, e permissao concedida como scanner `CameraView` traseiro com tipos de codigo comuns.
  implication: O usuario deixa de ver erro antes de pedir permissao e ganha caminho claro quando o Android bloqueia a camera.
- timestamp: 2026-06-24
  observation: `pnpm.cmd --filter @validade-zero/mobile test` passou com 30 arquivos e 151 testes; `pnpm.cmd --filter @validade-zero/mobile typecheck` passou; `git diff --check` passou.
  implication: O fluxo corrigido esta coberto por regressao e limpo para build staging.

## Eliminated

## Resolution

- root_cause: A tela da camera misturava permissao ainda nao concedida com falha real, exibindo erro para qualquer `!permission.granted` e sem alternativa de configuracoes quando o Android bloqueia novos pedidos.
- fix: Separar os estados de permissao da camera, adicionar CTA neutro para pedir permissao, CTA de configuracoes quando bloqueado, scanner traseiro com `barcodeScannerSettings` e aviso somente em falha de montagem do preview.
- verification: `pnpm.cmd --filter @validade-zero/mobile test`; `pnpm.cmd --filter @validade-zero/mobile typecheck`; `git diff --check`.
- files_changed: apps/mobile/src/capture/BarcodeLookupAssistant.tsx; apps/mobile/src/capture/capture-copy.ts; apps/mobile/src/capture/barcode-lookup-assistant.test.tsx; .planning/debug/mobile-camera-permission.md
