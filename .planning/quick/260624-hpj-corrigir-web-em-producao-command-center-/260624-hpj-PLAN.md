---
status: in_progress
created: 2026-06-24
---

# Quick Task 260624-hpj: Corrigir web em producao

## Objetivo

Corrigir o erro do Command Center no Vercel e o menu hamburguer quebrado no web mobile.

## Diagnostico

- `https://validade-five.vercel.app/command-center?storeId=loja-piloto` retornava erro porque o `vercel.json` nao tinha rewrite exato para `/command-center`.
- O app chama `/command-center` sem segmento adicional, entao o rewrite `/command-center/:path*` nao cobria o caso base.
- O mesmo risco existia em rotas base como `/memberships` e `/probe`.
- O drawer mobile existia, mas o painel nao estava suficientemente isolado em tela pequena: faltavam bloqueio de scroll, painel fixo/solido e acao explicita de fechar.

## Plano

1. Adicionar rewrites exatos para rotas base usadas pelo web.
2. Corrigir `shift-closes` plural e incluir rotas futuras usadas pelo app.
3. Reforcar o `Sheet` mobile com overlay, altura de viewport, overflow controlado e painel solido.
4. Adicionar botao `Fechar navegacao` ao menu mobile.
5. Rodar testes/build, deployar e validar na URL publica.

## Verificacao esperada

- `pnpm.cmd --filter @validade-zero/web typecheck`
- `pnpm.cmd --filter @validade-zero/web test`
- `pnpm.cmd --filter @validade-zero/web build`
- Deploy Vercel em producao.
- Validar `/command-center?storeId=loja-piloto` via Vercel retornando API protegida em vez de erro de rota.
- Validar menu mobile em viewport estreito.
