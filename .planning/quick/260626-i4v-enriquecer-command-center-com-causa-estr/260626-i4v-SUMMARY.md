---
status: complete
completed: 2026-06-26
commit: pending-final-batch
---

# Quick Task 260626-i4v: Enriquecer Command Center com causa estruturada - Summary

## Resultado

O Command Center agora tem causa estruturada por lote critico:

- `cause.code` classifica vencimento formal, janela FLV vencida, conflito de sync, retry de sync ou risco critico sem baixa;
- `cause.detail` explica a razao operacional;
- `cause.actionLabel` define a proxima acao;
- `cause.responsibleLabel`, `sourceEventId`, `sourceEventSummary`, `firstDetectedAt`, `lastObservedAt` e `lastAttemptedAt` sao exibidos quando disponiveis;
- a API audit-backed popula esses campos a partir dos eventos de sync/auditoria;
- o web usa `cause` como fonte principal e preserva `reason` como texto legado.

## Arquivos alterados

- `packages/contracts/src/command-center.ts`
- `packages/contracts/src/command-center.test.ts`
- `apps/api/src/index.ts`
- `apps/api/src/command-center.ts`
- `apps/api/src/command-center.test.ts`
- `apps/api/src/sync.test.ts`
- `apps/web/src/command-center/CommandCenter.tsx`
- `apps/web/src/command-center/command-center.test.tsx`
- `apps/web/e2e/fixtures/v1-readiness.ts`

## Verificacao

- `pnpm.cmd --filter @validade-zero/contracts test -- command-center` - passou, 64 testes.
- `pnpm.cmd --filter @validade-zero/api test -- command-center sync` - passou, 49 testes.
- `pnpm.cmd --filter @validade-zero/web test -- command-center` - passou, 30 testes.
- `pnpm.cmd --filter @validade-zero/web typecheck` - passou.
- `pnpm.cmd --filter @validade-zero/api typecheck` - passou.
- `pnpm.cmd --filter @validade-zero/contracts typecheck` - passou.
- `pnpm.cmd --filter @validade-zero/web build` - passou.
- `pnpm.cmd performance:budgets` - passou.
- Playwright desktop 1366x900 e mobile 390x844 com mock enriquecido - responsavel, evento fonte e trilha temporal visiveis; sem overflow horizontal.

## Observacao de login

O login publicado/local ainda precisa ser validado com conta real ou fixture autorizada antes do push/deploy final. Esta quick nao adiciona auth falso nem credenciais hardcoded.
