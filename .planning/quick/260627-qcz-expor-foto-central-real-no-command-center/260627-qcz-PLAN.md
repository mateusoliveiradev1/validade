---
status: completed
created: 2026-06-27
---

# Quick Task 260627-qcz: Expor foto central real no Command Center

## Objetivo

Fazer o web mostrar a verdade central que o Neon/API conhecem agora, sem sugerir que lotes locais antigos existem quando eles nao chegaram ao banco central.

## Escopo

1. Adicionar um snapshot central ao contrato do Command Center com contagens de produtos, rascunhos, lotes, tarefas, conflitos e estado do cache.
2. Popular o snapshot a partir do `prepareTurn` usado pela API.
3. Renderizar no web um bloco "foto da central" antes do funil operacional, destacando quando ha 0 lotes centrais.
4. Atualizar testes de contrato, API e web.

## Fora do escopo

- Criar dados falsos para preencher lotes.
- Nova migration de banco.
- Corrigir push/Expo neste passo.
- Recuperar SQLite local de aparelho antigo.

## Verificacao esperada

- `pnpm.cmd --filter @validade-zero/contracts test -- command-center`
- `pnpm.cmd --filter @validade-zero/api test -- command-center sync`
- `pnpm.cmd --filter @validade-zero/web test -- command-center`
- `pnpm.cmd --filter @validade-zero/web typecheck`
- `pnpm.cmd --filter @validade-zero/api typecheck`
- `pnpm.cmd --filter @validade-zero/contracts typecheck`
- `pnpm.cmd --filter @validade-zero/web build`
