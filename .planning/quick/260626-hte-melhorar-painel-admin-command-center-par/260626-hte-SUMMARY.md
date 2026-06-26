---
status: complete
completed: 2026-06-26
commit: local
---

# Quick Task 260626-hte: Melhorar painel admin Command Center - Summary

## Resultado

O Command Center agora abre uma leitura executiva antes do funil operacional:

- causa principal do bloqueio;
- placar de vencidos/criticos, risco na area de venda, tarefas atrasadas e bloqueios finais;
- grafico de gargalos em barras acessiveis;
- caminho de decisao do risco ate o fechamento seguro;
- secao "Por que venceu" com causa, texto-prova e proxima acao.

## Arquivos alterados

- `apps/web/src/command-center/CommandCenter.tsx`
- `apps/web/src/command-center/command-center.test.tsx`
- `.planning/quick/260626-hte-melhorar-painel-admin-command-center-par/260626-hte-PLAN.md`
- `.planning/quick/260626-hte-melhorar-painel-admin-command-center-par/260626-hte-SUMMARY.md`

## Verificacao

- `pnpm.cmd --filter @validade-zero/web test -- command-center` - passou, 30 testes web.
- `pnpm.cmd --filter @validade-zero/web typecheck` - passou.
- `pnpm.cmd exec prettier --check apps/web/src/command-center/CommandCenter.tsx apps/web/src/command-center/command-center.test.tsx .planning/quick/260626-hte-melhorar-painel-admin-command-center-par/260626-hte-PLAN.md` - passou.
- `pnpm.cmd --filter @validade-zero/web build` - passou.
- `pnpm.cmd performance:budgets` - passou, JS 116305 B gzip e CSS 7665 B gzip.
- Playwright desktop 1366x900 e mobile 390x844 com mock de sessao/projecao - secoes novas visiveis e sem overflow horizontal.

## Proximo incremento recomendado

Para explicar "por que venceu" com precisao total, o contrato da API deve passar a enviar causa estruturada por lote:

- data formal de vencimento ou janela FLV;
- primeira deteccao;
- ultima presenca fisica observada;
- idade da tarefa;
- responsavel atual;
- evento de auditoria que travou a liberacao.

Esta quick entrega a leitura operacional agora usando a projecao existente, sem vendas, estoque ou dependencia nova.
