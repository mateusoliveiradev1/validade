---
quick_id: 260623-aif
description: "Adaptar a autenticacao web para desktop sem perder a usabilidade mobile"
status: complete
created: 2026-06-23
must_haves:
  truths:
    - "Em telas desktop, a autenticacao usa a largura disponivel com contexto operacional sem parecer uma tela mobile ampliada."
    - "Em telas estreitas, os mesmos fluxos de entrar, ativar convite e recuperar acesso continuam compactos e acessiveis."
  artifacts:
    - "apps/web/src/auth/LoginPage.tsx"
  key_links:
    - "FirstAccessPage e RecoveryPage reutilizam AuthFrame e recebem a adaptacao responsiva sem duplicar estrutura."
---

# Quick Task 260623-aif: Adaptar autenticacao web para desktop

## Objective

Substituir o enquadramento de coluna unica que parecia uma tela mobile no navegador por um shell de autenticacao responsivo e operacional para desktop, sem alterar os fluxos de autenticação nem degradar o acesso em telas pequenas.

## Tasks

| # | Files | Action | Verify | Done |
|---|-------|--------|--------|------|
| 1 | `apps/web/src/auth/LoginPage.tsx` | Transformar `AuthFrame` em uma composicao desktop com painel de contexto operacional e coluna de acesso, colapsando para uma coluna no mobile. | As rotas de login, convite e recuperacao preservam os controles e rótulos existentes. | Yes |
| 2 | `apps/web/src/auth/auth-flow.test.tsx` | Cobrir a presença do contexto desktop sem alterar as garantias de validação e mensagens seguras. | Suite web, typecheck e conferência nos viewports desktop/mobile. | Yes |

## Scope Notes

- O web administrativo e um complemento de mesa; o app Expo continua mobile-first.
- Nao alterar contratos de login, chamadas de API ou texto de erro seguro.
- Manter contraste WCAG AA, foco visivel e alvos confortaveis em telas pequenas.
