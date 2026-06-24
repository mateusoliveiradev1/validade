---
status: complete
quick_id: 260624-inv
date: 2026-06-24
---

# Quick Task 260624-inv Summary

## Goal

Evitar erro 400 ao criar convite no web quando a validade excede 30 dias, com validacao client-side e mensagens claras.

## Completed

- Documentado diagnostico: API retorna `invalid_invite_expiry` para datas acima de 30 dias.
- Adicionados helpers `invite-expiry.ts` e `invite-errors.ts`.
- Atualizado `InviteAdministration.tsx` com default local (7 dias), min/max de 30 dias, texto de ajuda e validacao pre-submit.
- Erros da API mapeados para mensagens PT-BR (`invalid_invite_expiry`, `invalid_invite`, `access_denied`).
- Testes de regressao em `invite-administration.test.tsx`.

## Verification

- `pnpm --filter @validade-zero/web test`: 29/29 passou.
- `pnpm --filter @validade-zero/web typecheck`: passou.
- `pnpm --filter @validade-zero/web build`: passou.

## Notes

Deploy Vercel nao executado nesta sessao. Publicar quando quiser aplicar a correcao em `https://validade-five.vercel.app`.
