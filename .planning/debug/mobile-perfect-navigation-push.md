---
status: fixing
trigger: "Usuario quer fechamento automatico do push real Android e navegacao mobile perfeita, nao apenas handler minimo de voltar."
created: 2026-06-24
updated: 2026-06-24
---

# Debug Session: mobile-perfect-navigation-push

## Symptoms

- expected_behavior: O app mobile deve ter navegacao operacional com historico previsivel, voltar nativo Android por gesto/botao sem fechar o app indevidamente, e push real funcionando em aparelho Android quando o APK staging e instalado.
- actual_behavior: A navegacao ainda estava baseada em estado local `screen/setScreen`, e push Android real exige configuracao Firebase/FCM nativa ausente.
- error_messages: "Unable to get Firebase Messaging instance..." quando o APK nao contem configuracao Firebase Android.
- timeline: Apos validar login real no APK staging e remover o erro tecnico visivel de push.
- reproduction: Navegar em telas internas e usar gesto de voltar; tentar ativar alertas em APK sem `google-services.json`/FCM V1 configurado.

## Current Focus

- hypothesis: O crash do APK instalado vem de carregamento dinamico de `react-native` no helper de voltar Android; push real continua dependendo de credenciais Firebase/FCM externas.
- test: Remover o carregamento dinamico de `react-native`, usar `BackHandler` importado estaticamente, atualizar mocks/testes de navegacao e validar o novo APK no emulador antes de entregar.
- expecting: O APK release abre sem erro "Requiring unknown module react-native"; back Android continua navegando pela pilha; ausencia de credenciais Firebase continua bloqueio externo para push real.
- next_action: build staging apk and verify startup on Android emulator
- reasoning_checkpoint:
- tdd_checkpoint:

## Evidence

- timestamp: 2026-06-24
  observation: O workspace nao contem `google-services.json`, service account FCM, Firebase CLI instalado ou credenciais Firebase locais.
  implication: Codigo JS nao consegue sozinho fazer o push real funcionar em Android release; falta configuracao nativa/externa.
- timestamp: 2026-06-24
  observation: O estado atual do `CaptureApp` usa `screen` e objetos selecionados separados.
  implication: O historico de navegacao nao e uma fonte unica da verdade e fica propenso a retornos inconsistentes.
- timestamp: 2026-06-24
  observation: `CaptureApp` foi refatorado para uma pilha explicita de rotas; a suite mobile passou com 29 arquivos e 148 testes, alem de typecheck limpo.
  implication: A navegacao operacional agora tem uma fonte unica de historico e cobre gestos Android em fluxos de tarefa e detalhe/observacao.
- timestamp: 2026-06-24
  observation: `pnpm dlx firebase-tools@latest projects:list --json` falhou com "Failed to authenticate, have you run firebase login?".
  implication: Fechar push Android real automaticamente exige login/credenciais Firebase externas antes de criar app Android, baixar `google-services.json` e gerar chave FCM V1.
- timestamp: 2026-06-24
  observation: APK staging `0db35bb8-1486-440d-b5b6-9cacd87d89bd` instalado no Android crashou no boot com `ReactNativeJS: [Error: Requiring unknown module "react-native".]` em `addHardwareBackPressListener`.
  implication: O helper `apps/mobile/src/system/hardware-back.ts` usava carregamento dinamico de `react-native`, que o bundle release do Metro nao consegue resolver como dependencia estatica.
- timestamp: 2026-06-24
  observation: `hardware-back.ts` agora importa `BackHandler` estaticamente; os testes de AuthGate/CaptureApp mockam `BackHandler` diretamente; `rg` nao encontrou `moduleLoader(...)` no codigo mobile.
  implication: O caminho que derrubava o APK foi removido e os testes agora exercitam a mesma forma de carregamento usada no app release.
- timestamp: 2026-06-24
  observation: `pnpm.cmd --filter @validade-zero/mobile test` passou com 29 arquivos e 148 testes; `pnpm.cmd --filter @validade-zero/mobile typecheck` passou; `git diff --check` passou.
  implication: A correcao do crash manteve contrato de tipos e regressao mobile limpa antes de rebuildar o APK.

## Eliminated

## Resolution

- root_cause: Navegacao operacional ainda estava acoplada a estado local por tela; o APK crashou depois porque `hardware-back.ts` tentava carregar `react-native` via loader dinamico; push Android real depende de credenciais Firebase/FCM nativas que nao existem localmente e nao ha sessao Firebase CLI autenticada.
- fix: Refatorar `CaptureApp` para stack router explicito com `navigate`, `replace`, `resetToToday` e `goBack`; trocar o helper de voltar Android para `BackHandler` importado estaticamente; atualizar testes para mockarem `BackHandler`; preparar o app para receber `google-services.json` e EAS FCM V1.
- verification: `pnpm.cmd --filter @validade-zero/mobile test`; `pnpm.cmd --filter @validade-zero/mobile typecheck`; `git diff --check`; proximo passo e rebuildar APK staging e abrir no emulador com logcat limpo.
- files_changed: apps/mobile/src/capture/CaptureApp.tsx; apps/mobile/src/App.test.tsx; apps/mobile/src/system/hardware-back.ts; apps/mobile/src/auth/AuthGate.tsx; apps/mobile/src/auth/auth-flow.test.tsx; apps/mobile/src/capture/alert-channel.ts; apps/mobile/src/capture/mobile-release-journeys.test.tsx; apps/mobile/src/capture/push-alerts.test.tsx; apps/mobile/src/capture/push-channel.test.ts; .planning/debug/mobile-perfect-navigation-push.md
