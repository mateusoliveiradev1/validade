---
status: completed
created: 2026-06-24
---

# Quick Task 260624-inv: Corrigir validade de convite no web

## Objetivo

Evitar erro 400 ao criar convite quando a data de expiracao excede 30 dias, com validacao e mensagens claras no web.

## Diagnostico

- `POST /auth/invites` retorna `400 invalid_invite_expiry` quando `expiresAt` fica a mais de 30 dias no futuro.
- O formulario web nao impunha nem explicava esse limite; datas como 01/01/2027 falhavam com mensagem generica.
- A API e o rewrite do Vercel estao corretos; a correcao e apenas UX/validacao client-side.

## Plano

1. Helpers de validade local (default 7 dias, max 30 dias, formatacao local).
2. Mapear erros da API para mensagens PT-BR.
3. Atualizar `InviteAdministration.tsx` com min/max, helper text e validacao pre-submit.
4. Testes de regressao no pacote web.
5. Rodar test/typecheck/build.

## Verificacao esperada

- `pnpm --filter @validade-zero/web test`
- `pnpm --filter @validade-zero/web typecheck`
- `pnpm --filter @validade-zero/web build`

## Resultado

- `pnpm --filter @validade-zero/web test`: 29/29 passou.
- `pnpm --filter @validade-zero/web typecheck`: passou.
- `pnpm --filter @validade-zero/web build`: passou.
- Deploy Vercel pendente (rodar quando quiser publicar).
