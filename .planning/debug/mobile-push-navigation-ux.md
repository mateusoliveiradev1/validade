---
status: resolved
trigger: "APK staging loga, mas mostra erro tecnico de Firebase no push e gesto de voltar do Android fecha o app em vez de navegar internamente."
created: 2026-06-23
updated: 2026-06-23
---

# Debug Session: mobile-push-navigation-ux

## Symptoms

- expected_behavior: O operador deve conseguir voltar de telas internas usando o gesto/botao nativo do Android; falhas de push devem aparecer como estado operacional compreensivel, sem detalhes de Firebase/FCM.
- actual_behavior: Ao ativar alertas, a UI mostra "Unable to get Firebase Messaging instance..." com instrucoes tecnicas; ao usar gesto lateral em aparelho Android, o app fecha em vez de voltar uma tela.
- error_messages: "Unable to get Firebase Messaging instance. Did you configure googleServicesFile..."
- timeline: Depois do APK staging corrigido para login, durante teste real em aparelho Poco com navegacao por gestos.
- reproduction: Entrar no app, tocar em "Ativar alertas do turno"; navegar para telas internas e usar gesto de voltar do Android.

## Current Focus

- hypothesis: A UI repassa `Error.message` nativa do Expo/Firebase diretamente para o operador; o app tambem usa estado de tela proprio sem interceptar `hardwareBackPress`.
- test: Adicionar regressao para erro Firebase sanitizado e para back nativo em tela interna retornando a Hoje; rodar testes/typecheck mobile.
- expecting: Nenhum texto Firebase/googleServicesFile aparece na UI; back nativo volta para a tela anterior ou permanece em Hoje sem fechar o app.
- next_action: collect Firebase Android files/credentials and produce a push-capable staging build
- reasoning_checkpoint:
- tdd_checkpoint:

## Evidence

- timestamp: 2026-06-23
  observation: Screenshot real mostra erro tecnico de Firebase dentro do card de alertas.
  implication: `token.reason` ou falha nativa esta sendo exibida diretamente.
- timestamp: 2026-06-23
  observation: `CaptureApp` controla telas por `screen` local e nao registra handler de back do Android.
  implication: O gesto de voltar do sistema cai no comportamento padrao da Activity e pode fechar o app.

## Eliminated

## Resolution

- root_cause: A UI repassava mensagens nativas de erro do Expo/Firebase diretamente para o operador, e o app operacional controlava telas por estado local sem interceptar o evento nativo `hardwareBackPress` do Android.
- fix: Sanitizar falhas tecnicas de push para copia operacional, preparar `app.config.js` para incluir `googleServicesFile` quando o arquivo/variavel Firebase existir, e adicionar handler de back nativo para retornar pela pilha visual em AuthGate/CaptureApp.
- verification: `pnpm.cmd --filter @validade-zero/mobile test`; `pnpm.cmd --filter @validade-zero/mobile typecheck`; `pnpm.cmd exec expo config --json`; `GOOGLE_SERVICES_FILE=./google-services.json pnpm.cmd exec expo config --json`.
- files_changed: .gitignore; apps/mobile/app.config.js; apps/mobile/src/system/hardware-back.ts; apps/mobile/src/auth/AuthGate.tsx; apps/mobile/src/capture/CaptureApp.tsx; apps/mobile/src/capture/TodayScreen.tsx; apps/mobile/src/capture/today-copy.ts; apps/mobile/src/capture/push-alerts.test.tsx; .planning/debug/mobile-push-navigation-ux.md
