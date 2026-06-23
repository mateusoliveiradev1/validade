---
status: resolved
trigger: "Emulador Android mostra Unable to load script e usuario quer testar 100% o fluxo real de convite, ativacao de conta e login no app."
created: "2026-06-23T14:51:59.965Z"
updated: "2026-06-23T15:04:31.496Z"
---

# Debug Session: Mobile emulator Metro

## Symptoms

- Expected behavior: o app mobile deve carregar no Android Emulator e permitir testar o fluxo real de convite, ativacao de conta e login.
- Actual behavior: o emulador mostra tela vermelha `Unable to load script`.
- Error messages: React Native informa que o Metro deve estar rodando ou que o bundle `index.android.bundle` deve estar empacotado; tambem sugere `adb reverse tcp:8081 tcp:8081`.
- Timeline: ocorre agora durante a validacao da fase 9/release readiness.
- Reproduction: abrir o app `Validade Zero` no Android Emulator `ValidadeZeroApi36:5554`.

## Current Focus

- hypothesis: Metro nao esta rodando ou o emulador nao esta roteando `localhost:8081` para o host.
- test: confirmar processos/portas, dispositivo ADB, scripts Expo/Metro e configuracao de API no app mobile.
- expecting: Metro ativo em 8081, `adb reverse` configurado, app recarregando sem tela vermelha.
- next_action: resolved

## Evidence

- 2026-06-23T14:54Z: `adb devices` mostrou `emulator-5554 device`; a porta `8081` nao estava ouvindo antes de subir Metro.
- 2026-06-23T14:54Z: `adb reverse tcp:8081 tcp:8081` e `adb reverse tcp:8787 tcp:8787` foram aplicados; API local em `127.0.0.1:8787` respondeu `/health`.
- 2026-06-23T14:54Z: Metro foi iniciado em `apps/mobile` com `EXPO_PUBLIC_API_URL=http://127.0.0.1:8787`; logcat confirmou `isMetroRunning(): true`, `loadJSBundleFromMetro()` e `Running "main"`.
- 2026-06-23T14:56Z: warnings de require cycle vinham de `AuthGate` importado por `FirstAccessScreen` e `RecoveryScreen`; a classe `MobileAuthError` foi extraida para `auth-errors.ts`.
- 2026-06-23T14:56Z: a tela de primeiro acesso mobile ainda exigia 12 caracteres; foi alinhada para 10 caracteres, igual ao contrato/web de staging.
- 2026-06-23T15:02Z: convite real criado no Neon staging para usuario de teste; emulador validou o convite, ativou a conta e abriu Hoje com a Loja Piloto - Staging.
- 2026-06-23T15:03Z: depois de logout, login com a conta recem-ativada retornou `POST /auth/login 200 OK` e abriu Hoje no emulador.
- 2026-06-23T15:04Z: `pnpm.cmd test:e2e:mobile` passou no `ValidadeZeroApi36`.
- 2026-06-23T15:04Z: `pnpm.cmd check` passou completo.

## Eliminated

- Banco/migracoes de staging como causa do bloqueio: a API respondeu e persistiu convite, ativacao e login.
- Falha de bundle nativo empacotado: o app debug carregou corretamente quando Metro ficou ativo e acessivel ao emulador.
- Warning atual de require cycle: logcat depois da correcao nao mostrou `Require cycle` nem `Unable to load script`.

## Resolution

- root_cause: Metro nao estava rodando/acessivel em `8081` para o emulador, e a tela mobile ainda tinha dois problemas de readiness: ciclo de importacao de auth gerando warning e politica de senha antiga de 12 caracteres.
- fix: subir Metro com `EXPO_PUBLIC_API_URL=http://127.0.0.1:8787`, configurar `adb reverse` para `8081` e `8787`, extrair `MobileAuthError` para um modulo neutro e alinhar a politica mobile de senha para 10 caracteres.
- verification: app carregou no emulador sem tela vermelha, convite real de staging foi validado/ativado, login posterior da conta criada abriu Hoje, `pnpm.cmd test:e2e:mobile` passou e `pnpm.cmd check` passou completo.
- files_changed: `apps/mobile/src/auth/auth-errors.ts`, `apps/mobile/src/auth/AuthGate.tsx`, `apps/mobile/src/auth/FirstAccessScreen.tsx`, `apps/mobile/src/auth/RecoveryScreen.tsx`, `apps/mobile/src/auth/auth-flow.test.tsx`, `apps/mobile/src/capture/mobile-release-journeys.test.tsx`.
