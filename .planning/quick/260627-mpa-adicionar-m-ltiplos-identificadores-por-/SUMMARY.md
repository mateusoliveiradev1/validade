---
quick_id: 260627-mpa
date: 2026-06-27
status: verified
---

# Summary: Produto com multiplos identificadores

## Resultado

O catalogo agora trata produto como entidade operacional unica e permite varios identificadores por produto. Um codigo novo escaneado pode ser vinculado ao produto existente sem criar duplicata, e buscas por identificador retornam o produto com motivo `exact_identifier`.

## Mudancas principais

- `packages/contracts/src/capture.ts`: novos schemas/tipos de identificador e suporte em busca, candidatos, drafts e snippets centrais.
- `packages/database/src/schema.ts`: nova tabela `central_product_identifiers` e enum `product_identifier_type`.
- `packages/database/drizzle/0012_phase_10_product_identifiers.sql`: migration idempotente com indice unico parcial ativo e backfill de GTIN existente.
- `packages/database/src/capture-repository.ts`: busca/reuso por identificador, upsert de identificadores e merge em produto existente.
- `apps/mobile/src/capture/*`: descoberta por codigo, formulario com codigo vinculado, cache SQLite e memory repository preservando/buscando identificadores.
- Testes atualizados em contracts, database e mobile.

## Evidencia

- `pnpm.cmd format:check`: passou.
- `pnpm.cmd lint`: passou.
- `pnpm.cmd typecheck`: 9/9 pacotes.
- `pnpm.cmd test`: 82 arquivos, 533 testes.
- `pnpm.cmd build`: 9/9 pacotes.
- Backup Neon criado antes da migration: `backup-staging-260627-product-identifiers` (`br-gentle-cherry-aclcmuyq`), verificado.
- Migration descartavel a partir de `staging`: `migrationsApplied=1`, `verified=true`.
- Migration aplicada em Neon `staging`: `0012_phase_10_product_identifiers.sql`, 6 statements, tabela e indice unico ativo presentes.
- Deploy Worker staging: `validade-zero-api-staging`, version `cbb7dc14-e83c-4b67-bb22-e9fcfa720c85`.
- Health/probe staging responderam `status=ok` e `probeId=safe-probe-local`.

## Observacoes

- O backfill de identificadores em staging criou `0` linhas porque o unico produto central existente nao tinha GTIN.
- Nenhum produto/lote falso foi criado.
- APK novo nao foi gerado; o foco ficou em web/API/staging e no codigo mobile para a proxima build.
