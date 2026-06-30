---
quick_id: 260630-euk
slug: corrigir-sync-de-lote-pendente-e-categor
status: complete
completed_at: 2026-06-30T10:56:27.2578256-03:00
commit: pending
---

# Summary: Corrigir sync de lote pendente e categoria para produto embalado do fornecedor

## Resultado

- Corrigido o replay de lotes `pending_central`/`local`: quando o produto do lote ainda nao tem `centralProductId` reutilizavel no cache local, o app consulta a busca central de produtos antes de desistir do envio.
- O envio automatico continua conservador: somente candidato `reusable_central`, `central`, `validated` e `synchronized` destrava o lote. Similar ou draft segue pendente.
- Adicionadas duas categorias globais de staging:
  - `Alho inteiro embalado pelo fornecedor`: validade formal, janela 90/30/7.
  - `Alho processado embalado pelo fornecedor`: validade formal, janela 30/7/2.
- Build aprovada atualizada para `uat15-lot-sync-apk-135` / `0.12.0` / build `135`.

## Deploys e Artefatos

- Neon staging seed aplicado: categorias globais de 15 para 17, sem criar dado operacional fake.
- API Worker staging publicado: version id `acd2d02a-1c39-4e4a-9b2c-72a2d6399836`.
- Web Vercel publicado: deployment `dpl_2RKyqm275Ui2pWVH5Afc7p3LMfWp`, alias `https://validade-five.vercel.app`.
- APK local gerado: `artifacts/validade-zero-staging-0.12.0-135.apk`.
- APK SHA256: `7009138965526684821F02A1B68D31AD69A5DFE0E5B8C3DDB8D37DAEC882F602`.

## Verificacao

- `pnpm.cmd exec vitest run --config vitest.config.ts apps/mobile/src/capture/capture-repository.test.ts`
- `pnpm.cmd exec vitest run --config vitest.config.ts apps/mobile/src/capture/capture-repository.test.ts apps/mobile/src/build-info.test.ts apps/mobile/src/capture/ajustes-screen.test.tsx apps/mobile/src/capture/prepare-turn.test.tsx apps/mobile/src/capture/shift-close.test.tsx apps/api/src/command-center.test.ts apps/web/src/command-center/command-center.test.tsx packages/database/src/repositories.test.ts packages/contracts/src/command-center.test.ts`
- `pnpm.cmd typecheck`
- `pnpm.cmd format:check`
- `pnpm.cmd lint`
- `pnpm.cmd test:smoke`
- `pnpm.cmd build`
- `pnpm.cmd performance:budgets`
- `pnpm.cmd security:secrets`
- `pnpm.cmd security:ui-release`
- `pnpm.cmd build:android:local`
- API `/health`: 200.
- API `/health/deep`: 503 esperado em staging porque `EVIDENCE_STORE_MODE=disabled`.
- Web bundle contem `uat15-lot-sync-apk-135` e nao contem `uat15-sync-feedback-apk-134`.
