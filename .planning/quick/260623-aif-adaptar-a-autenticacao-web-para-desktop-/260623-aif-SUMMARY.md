---
quick_id: 260623-aif
description: "Adaptar a autenticacao web para desktop sem perder a usabilidade mobile"
status: complete
created: 2026-06-23
completed: 2026-06-23
code_commit: 457ab7c
---

# Quick Task 260623-aif: Adaptar autenticacao web para desktop

## Result

O login web agora usa uma composicao de duas colunas em desktop: o contexto operacional permanece visivel ao lado da coluna de acesso. Em mobile, o painel contextual sai de cena e o fluxo continua em uma coluna direta.

## Accomplishments

- Reestruturado `AuthFrame`, compartilhado por login, convite e recuperacao, sem duplicar os fluxos.
- Adicionado contexto de loja, permissoes e confirmacao fisica no desktop sem transformar a tela em landing page.
- Mantidos os mesmos campos, acoes, validacoes, foco e mensagens seguras em tela pequena.
- Adicionado teste para a estrutura desktop sem enfraquecer os testes de autenticacao existentes.

## Verification

- Conferencia visual no navegador em 1280px e 390px, sem erros de console.
- `pnpm.cmd check` passou: typecheck, lint, format, 392 testes, smoke, build, seguranca e orcamentos de desempenho.
- O detector Impeccable retornou `[]`.
