---
status: resolved
trigger: "APK staging instalado no aparelho real mostra erro: 'Não foi possível abrir o acesso seguro agora. Confira a conexão e tente novamente.'"
created: 2026-06-23
updated: 2026-06-23
---

# Debug Session: mobile-apk-staging-login

## Symptoms

- expected_behavior: O APK staging instalado no aparelho real deve abrir a sessão segura contra a API staging e permitir login com a conta administrativa/liderança criada.
- actual_behavior: Ao abrir o app instalado, a tela de login exibe erro de conexão/acesso seguro antes do login.
- error_messages: "Não foi possível abrir o acesso seguro agora. Confira a conexão e tente novamente."
- timeline: Surgiu no teste do APK staging instalado após o build interno via EAS.
- reproduction: Instalar o APK staging no aparelho real e abrir o app.

## Current Focus

- hypothesis: O bundle Android foi gerado sem a URL pública da API staging disponível em runtime, então o app tenta iniciar autenticação com URL ausente/inválida.
- test: Inspecionar o APK gerado e procurar pela URL validade-zero-api-staging.validadezero.workers.dev versus placeholder local.
- expecting: Se a hipótese estiver correta, o APK antigo terá local-placeholder-not-a-real-url ou não terá a URL staging; a correção deve embutir a URL staging em extra/runtime.
- next_action: gather initial evidence
- resolved_at: 2026-06-23
- reasoning_checkpoint:
- tdd_checkpoint:

## Evidence

- timestamp: 2026-06-23
  observation: O APK antigo contém assets/app.config com EXPO_PUBLIC_API_URL=local-placeholder-not-a-real-url e não carrega a URL pública da API staging nesse config.
  implication: O erro do aparelho real é compatível com runtime de autenticação sem base URL válida, antes mesmo do login.
- timestamp: 2026-06-23
  observation: Testes mobile passaram com 29 arquivos e 142 testes; typecheck mobile passou após trocar import estático de expo-constants por carregamento runtime tipado localmente.
  implication: A correção não quebrou fluxos mobile existentes e evita dependências de tipos Expo fora do tsconfig atual.
- timestamp: 2026-06-23
  observation: O APK novo 604774f2-ef95-457e-aec2-306e599fce3e contém assets/app.config com EXPO_PUBLIC_API_URL=https://validade-zero-api-staging.validadezero.workers.dev.
  implication: O app instalado a partir do novo APK deve chamar a API staging real.
- timestamp: 2026-06-23
  observation: GET https://validade-zero-api-staging.validadezero.workers.dev/health retornou status ok.
  implication: O destino de rede do APK staging está público e respondendo.

## Eliminated

## Resolution

- root_cause: O APK staging anterior foi empacotado com o placeholder local em assets/app.config; em runtime o app não tinha URL base válida para a autenticação.
- fix: Embutir a URL pública staging em apps/mobile/app.json e fazer o cliente de autenticação ler EXPO_PUBLIC_API_URL também via Expo config em runtime.
- verification: pnpm.cmd --filter @validade-zero/mobile test; pnpm.cmd --filter @validade-zero/mobile typecheck; inspeção do APK novo; GET /health da API staging.
- files_changed: apps/mobile/app.json; apps/mobile/src/auth/AuthGate.tsx; apps/mobile/src/auth/auth-flow.test.tsx; apps/mobile/src/capture/mobile-release-journeys.test.tsx; .planning/debug/mobile-apk-staging-login.md
