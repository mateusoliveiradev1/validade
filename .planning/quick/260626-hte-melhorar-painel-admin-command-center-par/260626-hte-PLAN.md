---
status: completed
created: 2026-06-26
---

# Quick Task 260626-hte: Melhorar painel admin Command Center

## Objetivo

Melhorar o painel admin do Command Center para lideranca entender rapido:

- o que esta vencido ou critico;
- por que ficou bloqueado;
- qual gargalo esta impedindo a area de venda de ser considerada segura;
- qual proxima acao operacional deve ser tomada.

## Escopo

1. Transformar a primeira leitura do painel em um resumo de risco com placar operacional.
2. Adicionar graficos simples e acessiveis, sem dependencia nova.
3. Criar uma secao "Por que venceu" com causa, evidencia textual e acao recomendada.
4. Manter a tabela/funil existente como detalhe operacional.
5. Atualizar testes web para cobrir a nova narrativa.

## Fora do escopo desta quick

- Mudar banco, sync ou persistencia.
- Criar BI historico por periodo.
- Adicionar dependencia de graficos.
- Expor dados sensiveis ou vendas/estoque.

## Decisoes

- A quick usara somente a projecao atual do Command Center.
- Quando faltarem datas explicitas de validade, a UI vai explicar a causa usando `reason`, `locationLabel`, tarefas e conflitos ja enviados pela API.
- O proximo incremento recomendado e enriquecer o contrato da API com vencimento formal, primeira deteccao, ultima presenca fisica, responsavel e tempo em atraso.

## Verificacao esperada

- `pnpm.cmd --filter @validade-zero/web test -- command-center`
- `pnpm.cmd --filter @validade-zero/web typecheck`
