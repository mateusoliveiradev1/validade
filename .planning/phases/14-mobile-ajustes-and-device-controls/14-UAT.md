---
status: testing
phase: 14-mobile-ajustes-and-device-controls
source:
  - 14-01-SUMMARY.md
  - 14-02-SUMMARY.md
  - 14-03-SUMMARY.md
  - 14-04-SUMMARY.md
  - 14-05-SUMMARY.md
started: 2026-06-29T06:51:50.2029667-03:00
updated: 2026-06-29T14:34:52.9389322-03:00
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 3
name: Conferir Sincronizacao e bloqueios de fechamento seguro
expected: |
  Em Ajustes, Sincronizacao separa ultima leitura central de ultima sincronizacao enviada, mostra pendencias e conflitos, permite sincronizar pendencias, e exige motivo para descartar conflito critico antes de permitir fechamento seguro.
awaiting: user response

## Tests

### 1. Abrir Ajustes e voltar sem perder o trabalho
expected: No mobile autenticado, tocar em Ajustes na barra de sessao abre a tela Ajustes como uma rota propria. Ao voltar, o app retorna exatamente para a tela operacional anterior, seja Hoje ou uma tarefa aberta, sem trocar loja, papel, sessao ou estado da tarefa.
result: pass

### 2. Conferir push e lembretes como diagnostico deste aparelho
expected: Em Ajustes, Push e lembretes mostra o estado deste aparelho, permite ativar, desativar e enviar teste neste aparelho, e deixa claro que push nao resolve tarefas nem prova area segura.
result: pass

### 3. Conferir Sincronizacao e bloqueios de fechamento seguro
expected: Em Ajustes, Sincronizacao separa ultima leitura central de ultima sincronizacao enviada, mostra pendencias e conflitos, permite sincronizar pendencias, e exige motivo para descartar conflito critico antes de permitir fechamento seguro.
result: [pending]

### 4. Conferir Atualizacao do app e dados de conta/loja
expected: Em Ajustes, Atualizacao do app mostra versao instalada, build instalado, versao/build aprovado, ambiente, API e pacote de forma publica; Conta e loja mostra usuario, loja, papel e sessao como leitura, sem permitir trocar loja ou papel localmente.
result: [pending]

### 5. Conferir Privacidade e sair com pendencias visiveis
expected: Em Ajustes, Privacidade abre o Centro de Privacidade existente. Sair com pendencias visiveis pede confirmacao, mostra pendencias/conflitos e nao altera tarefas, sync ou conflitos ao cancelar.
result: [pending]

### 6. Conferir que Hoje continua sendo a superficie de execucao
expected: Depois da extracao dos controles para Ajustes, Hoje continua mostrando a decisao operacional e as acoes de tarefa, enquanto Ajustes concentra diagnosticos, configuracoes, privacidade, sync e update sem aparecer como substituto da execucao fisica.
result: [pending]

## Summary

total: 6
passed: 2
issues: 1
pending: 4
skipped: 0
blocked: 0
remediated_passed: 2
remediated_pending_retest: 1

## Setup Evidence

- Current APK generated for manual retest: `dist/android/validade-zero-local-staging-0.12.0-120-uat14-syncfix.apk`
- SHA256: `3BAFF6A51E778DC57F72720500E05E5A3C7BED3CCAADE4D5653789075F89D57D`
- Package/version check: `com.validadezero.app`, version `0.12.0`, Android `versionCode` `120`.
- APK signer verification: passed with local debug signing for direct install testing.
- Bundle check: contains `Ajustes`, `Sair com pendencias visiveis`, staging API URL, `phase-12-staging-apk-120`, the fixed pending-draft lot acknowledgement, `Atualizar leitura central`, and the stale-central-read explanation.
- `adb devices` showed no connected Android device in this session, so installation and physical UAT are still user/device-side.
- Previous APK generated before the sync-copy UAT fix: `dist/android/validade-zero-local-staging-0.12.0-120-uat14-fix.apk`.

## UAT Findings

- finding: "Registro de lote falha na tela mobile com a mensagem 'Nao foi possivel registrar este lote neste aparelho. Revise os campos destacados e tente novamente.'"
  reported: "Consegui criar um lote, mas esse aqui nao."
  severity: major
  source_test: 1
  artifact: "screenshot codex-clipboard-dfb3bbc6-e5b2-4ba2-8364-7756176ac3bf.png"
  status: fixed_retested_pass
  fix_artifact: "dist/android/validade-zero-local-staging-0.12.0-120-uat14-fix.apk"
  retest: "pass"
- finding: "O app parece exigir Preparar turno toda vez que entra."
  reported: "toda hora q entra no app tem q preparar o turno?"
  severity: major
  source_test: 1
  status: fixed_retested_pass
  fix_artifact: "dist/android/validade-zero-local-staging-0.12.0-120-uat14-fix.apk"
  retest: "pass"
- finding: "Sincronizacao aparece Bloqueado sem explicar que a leitura central venceu e mostra timestamps UTC crus."
  reported: "pq aqui esta bloqueado ? e os timestamp ali precisa melhorar nao acha ?"
  severity: major
  source_test: 3
  artifact:
    - "screenshot codex-clipboard-13ada989-492c-43f1-81e6-0910b2716304.png"
    - "screenshot codex-clipboard-cced841b-b067-475c-99b9-2dd4416cd19b.png"
  status: fixed_in_code_pending_device_retest
  fix_artifact: "dist/android/validade-zero-local-staging-0.12.0-120-uat14-syncfix.apk"

## Fix Evidence

- Code fix: pending-review product drafts now save lots locally as `pending_central`, resolve draft identifiers back to the stored local product, and do not call the central lot API with `draft:*` ids.
- Code fix: app reentry with a ready central prepare-turn cache opens Hoje directly instead of forcing `Preparar turno` again.
- Regression tests: `pnpm.cmd --filter @validade-zero/mobile test -- capture-repository.test.ts prepare-turn.test.tsx` passed, exercising draft-lot save and central-cache reentry.
- Full repo gate: `pnpm.cmd check` passed with typecheck, lint, format check, tests, smoke tests, build, security, and performance budgets.
- Android build: local release APK built from a short Windows worktree because the main workspace Gradle build hit CMake path length limits.
- Device retest: user reported `pass` for corrected draft lot registration and app reentry without repeated prepare-turn.
- Code fix: stale central read now explains why sync is blocked, shows local Sao Paulo timestamps instead of raw UTC, and offers `Atualizar leitura central` because `Sincronizar pendencias` does not renew central read.
- Regression tests: Ajustes sync tests cover formatted local timestamps, stale central read explanation, and the central refresh action.

## Gaps

- truth: "O operador consegue registrar um lote valido ou recebe erro especifico de campo/causa quando o lote nao pode ser salvo."
  status: fixed_retested_pass
  reason: "Fixed in code/APK after user reported: Consegui criar um lote, mas esse aqui nao. User retested and reported pass."
  severity: major
  test: 1
  artifacts:
    - "dist/android/validade-zero-local-staging-0.12.0-120-uat14-fix.apk"
  missing: []
- truth: "Ao reabrir o app com sessao e leitura central ainda utilizaveis, o operador nao precisa preparar turno repetidamente sem causa explicita."
  status: fixed_retested_pass
  reason: "Fixed in code/APK after user reported: toda hora q entra no app tem q preparar o turno? User retested and reported pass."
  severity: major
  test: 1
  artifacts:
    - "dist/android/validade-zero-local-staging-0.12.0-120-uat14-fix.apk"
  missing: []
- truth: "A tela de Sincronizacao explica claramente quando o bloqueio vem de leitura central vencida, mostra horarios legiveis/localizados e oferece a acao correta para renovar a leitura central."
  status: pending_retest
  reason: "User reported: pq aqui esta bloqueado ? e os timestamp ali precisa melhorar nao acha ?"
  severity: major
  test: 3
  artifacts:
    - "dist/android/validade-zero-local-staging-0.12.0-120-uat14-syncfix.apk"
  missing: []
