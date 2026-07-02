---
quick_id: 260702-gpl
description: Corrigir login local para testar Controle GPP web
status: complete
completed: 2026-07-02
commit: pending
---

# Quick Task 260702-gpl Summary

## Result

O login local agora consegue autenticar uma conta fake com role `gpp` quando o feature flag `controle_gpp_enabled` esta ativo. A sessao retornada pelo fluxo de autenticacao inclui o flag e as acoes GPP, permitindo que o web mostre e acesse o Controle GPP.

Tambem foi adicionado o proxy `/gpp` no Vite para que o navegador use o mesmo dev server em `http://127.0.0.1:4173`.

## Files Changed

- `apps/api/src/authentication.ts`
- `apps/api/src/index.ts`
- `apps/api/src/authentication.test.ts`
- `apps/web/vite.config.ts`
- `.planning/STATE.md`
- `.planning/quick/260702-gpl-fix-local-gpp-login/`

## Verification

- `vitest` do arquivo `apps/api/src/authentication.test.ts` passou.
- `pnpm.cmd --filter @validade-zero/api typecheck` passou.
- Testes web focados em `App.test.tsx` e `GppControlRoute.test.tsx` passaram.
- Login fake `gpp.local@example.invalid` validado via API local `8787`.
- Login fake validado via proxy web `4173`, com 2 grupos de avaria e 1 compra interna de exemplo na fila GPP.
