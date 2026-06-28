# Quick Task 260628-rmd: Gerar APK Android local atual para testar login e sync da Loja 18 sem validar push remoto

**Date:** 2026-06-28
**Status:** In progress

## Goal

Gerar um APK Android atual apontando para a API staging `https://validade-zero-api-staging.validadezero.workers.dev`, com identidade `0.12.0` / build `120`, suficiente para testar login, preparo de turno, captura/sync e Command Center da Loja 18. Push remoto real fica fora do escopo deste APK local.

## Plan

1. Verificar configuracao mobile atual e artefatos existentes.
2. Validar o pacote mobile com testes/typecheck focados.
3. Regenerar o projeto Android nativo a partir do `app.json` atual.
4. Tentar gerar APK local standalone com Gradle release.
5. Se release local bloquear no Windows, gerar APK debug atual e documentar o comando Metro necessario.
6. Registrar caminho do APK e limites de verdade do artefato.

## Verification

- `pnpm.cmd --filter @validade-zero/mobile test -- build-info prepare-turn push-alerts`
- `pnpm.cmd --filter @validade-zero/mobile typecheck`
- APK gerado em `dist/android/`
