---
status: resolved
trigger: "Ativar alertas do turno abre RedBox: Cannot find native module 'ExpoPushTokenManager'"
created: "2026-06-21"
updated: "2026-06-21"
---

# Debug Session: alertas-expo-native-module

## Symptoms

- Expected behavior: tocar em "Ativar alertas do turno" deve pedir permissao ou mostrar aviso controlado quando push nativo nao estiver disponivel.
- Actual behavior: a tela quebra com RedBox.
- Error: `Cannot find native module 'ExpoPushTokenManager'`.
- Timeline: observado no UAT em emulador Android depois da Fase 6.
- Reproduction: abrir Hoje e tocar em "Ativar alertas do turno".

## Current Focus

- hypothesis: `require("expo-notifications")` encontra o pacote JavaScript, mas inicializa um modulo nativo ausente no binario instalado; a excecao precisa virar estado `unavailable` em vez de RedBox.
- test: adicionar regressao no canal de push para modulo nativo ausente durante o load.
- expecting: `requestPermission()` retorna `unavailable` com motivo, e a tela Hoje continua viva.
- next_action: patch fallback do loader e rodar testes mobile.

## Evidence

- 2026-06-21: Screenshot do emulador mostra RedBox em `apps/mobile/src/capture/alert-channel.ts:419`.
- 2026-06-21: `apps/mobile/package.json` declara `expo-notifications`; `apps/mobile/app.json` inclui plugin, sugerindo mismatch de runtime nativo ou build desatualizado.
- 2026-06-21: Metro rejeitou o helper generico com `Invalid call at line 432: require(moduleName)`, porque React Native exige require com string literal.
- 2026-06-21: Depois da guarda com `requireOptionalNativeModule`, o emulador recarregou a tela Hoje e tocar em "Ativar alertas do turno" exibiu fallback controlado em vez de RedBox.

## Eliminated

- hypothesis: dependencia JavaScript ausente
  result: eliminada porque `expo-notifications` esta em `apps/mobile/package.json`.

## Resolution

- root_cause: `expo-notifications` pode falhar durante o carregamento quando o binario nativo instalado nao contem `ExpoPushTokenManager`; o loader anterior deixava essa falha escapar como RedBox.
- fix: consultar `ExpoPushTokenManager` via `expo-modules-core` antes do import completo de `expo-notifications`; se o binario nao tiver o modulo nativo, retornar estado indisponivel controlado.
- verification: `pnpm.cmd --filter @validade-zero/mobile test -- src/capture/push-channel.test.ts`; `pnpm.cmd --filter @validade-zero/mobile typecheck`; `pnpm.cmd check`; reload manual no emulador e toque em "Ativar alertas do turno".
- files_changed: `apps/mobile/src/capture/alert-channel.ts`, `apps/mobile/src/capture/push-channel.test.ts`, `apps/mobile/package.json`, `pnpm-lock.yaml`.
