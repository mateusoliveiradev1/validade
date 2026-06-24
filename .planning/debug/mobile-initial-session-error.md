---
status: resolved
trigger: "APK staging instalado no aparelho real mostra erro de acesso seguro antes de tentar login."
created: 2026-06-23
updated: 2026-06-23
---

# Debug Session: mobile-initial-session-error

## Symptoms

- expected_behavior: Ao abrir o APK staging sem sessão salva, o app deve mostrar a tela de login limpa; o erro só deve aparecer após uma tentativa real de login ou falha operacional acionada pelo usuário.
- actual_behavior: A tela de login já abre com "Nao foi possivel abrir o acesso seguro agora. Confira a conexao e tente novamente." antes de apertar Entrar.
- error_messages: "Nao foi possivel abrir o acesso seguro agora. Confira a conexao e tente novamente."
- timeline: Persistiu no aparelho real depois do APK staging corrigido com URL da API.
- reproduction: Instalar/abrir o APK staging no aparelho real sem sessão autenticada.

## Current Focus

- hypothesis: A checagem inicial `/auth/session` está sendo classificada como erro de rede quando deveria ser tratada como `session_expired` silenciosa, possivelmente por corpo 401 ausente/inesperado no cliente Android ou URL base indisponível no runtime.
- test: Adicionar regressão para 401 vazio em `/auth/session`, reforçar fallback de URL staging e validar testes/typecheck mobile antes de gerar novo APK.
- expecting: O app abre a tela de login sem alerta quando não há sessão; uma tentativa real de login continua mostrando erros úteis se falhar.
- next_action: build staging APK and verify install target
- reasoning_checkpoint:
- tdd_checkpoint:

## Evidence

- timestamp: 2026-06-23
  observation: O usuário confirmou que o erro aparece antes de tentar logar.
  implication: A falha vem do `readSession()` inicial, não necessariamente da submissão do formulário.
- timestamp: 2026-06-23
  observation: Login direto contra `https://validade-zero-api-staging.validadezero.workers.dev/auth/login` retorna 200 para a conta staging, com conta ativa, papel lead e permissões operacionais.
  implication: Banco, conta e credenciais staging estão funcionais.
- timestamp: 2026-06-23
  observation: `curl` em `/auth/session` sem token retorna 401 com `{ "error": "session_expired", "canRequestRecovery": true }`.
  implication: O app deve mapear essa condição para tela de login sem erro.

## Eliminated

## Resolution

- root_cause: A tela de login tratava falhas da checagem inicial `/auth/session` como erro visível de rede. Em um aparelho sem sessão, essa checagem pode retornar 401 e, se o corpo vier vazio/inesperado no runtime Android, o cliente não reconhecia `session_expired`.
- fix: Mapear 401 de `/auth/session` para `session_expired` mesmo sem corpo, silenciar falhas iniciais de sessão antes de qualquer tentativa do usuário, manter erro visível para login acionado pelo usuário e reforçar fallback da URL staging.
- verification: `pnpm.cmd --filter @validade-zero/mobile test`; `pnpm.cmd --filter @validade-zero/mobile typecheck`.
- files_changed: apps/mobile/src/auth/AuthGate.tsx; apps/mobile/src/auth/auth-flow.test.tsx; .planning/debug/mobile-initial-session-error.md
