---
status: complete
quick_id: 260623-rq1
date: 2026-06-23
commit: e795458
---

# Quick Task 260623-rq1 Summary

## Goal

Corrigir o `500` no login público da API staging em Cloudflare Workers e validar a conta admin/líder solicitada para teste real no APK.

## Completed

- Diagnóstico confirmou que:
  - conta inexistente retornava `401`, então rota e banco estavam acessíveis;
  - conta existente disparava `500` apenas no Worker publicado;
  - o mesmo login funcionava localmente com o mesmo banco e segredos.
- Reduziu o algoritmo padrão de senha de `pbkdf2-sha256:310000` para `pbkdf2-sha256:20000`, compatível com o limite prático do Worker staging gratuito.
- O verificador agora rejeita marcadores de senha acima do limite suportado em vez de queimar CPU e causar `500`.
- Corrigiu a query SQL de `consumeRecoveryToken` para qualificar colunas no `RETURNING`, evitando `subject_id is ambiguous` no Postgres real.
- Resetou a credencial staging da conta `warface01031999@gmail.com` com o novo marcador de senha, sem imprimir senha nem tokens.
- Redeployou a API staging:
  - URL: `https://validade-zero-api-staging.validadezero.workers.dev`
  - Version ID: `7c7bf397-bb48-408c-aee9-08c2fa617aa1`

## Verification

- `pnpm.cmd --filter @validade-zero/database test` — passou.
- `pnpm.cmd --filter @validade-zero/api typecheck` — passou.
- `pnpm.cmd exec prettier --check packages/database/src/auth-repository.ts packages/database/src/repositories.test.ts` — passou.
- Login público staging validado com a conta solicitada:
  - `loginStatus: 200`
  - `accountStatus: active`
  - `activeRole: lead`
  - `storeId: loja-piloto`
  - `canManageUsers: true`
  - `canCloseShift: true`
  - `canActOnTask: true`
  - `/auth/session` com bearer retornou `200`

## Notes

O APK staging existente continua válido porque a URL pública da API não mudou; somente o Worker publicado foi corrigido.
