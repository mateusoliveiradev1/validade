---
quick_id: 260619-tw4
description: Exibir horários de observação sem segundos no app mobile
status: complete
completed: 2026-06-20
commit: 37fd67d
---

# Quick Task 260619-tw4 Summary

## Result

Os horários operacionais agora usam `DD/MM/AAAA, HH:MM`. A lista de lotes recentes e o detalhe do lote compartilham o mesmo formatador, preservando a data e removendo segundos desnecessários para a operação.

## Files Changed

- `apps/mobile/src/capture/capture-copy.ts`
- `apps/mobile/src/capture/RecentLotList.tsx`
- `apps/mobile/src/capture/LotDetailScreen.tsx`
- `apps/mobile/src/capture/presence-observation.test.ts`

## Verification

- `pnpm.cmd --filter @validade-zero/mobile test` — 10 arquivos e 16 testes aprovados.
- `pnpm.cmd --filter @validade-zero/mobile typecheck` — aprovado.
- `pnpm.cmd lint` — aprovado.
- `pnpm.cmd format:check` — aprovado.
