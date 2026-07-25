---
quick_id: 260725-cxt
status: in_progress
description: Validar e integrar lote npm minor e patch do Dependabot com Prettier 3.9.6
---

# Quick Task 260725-cxt

## Goal

Integrar o lote npm minor/patch da PR #17 em uma branch controlada, incluindo a
reformatação exigida pelo Prettier 3.9.6, sem alterar comportamento de produto.

## Tasks

1. Aplicar o commit atualizado do Dependabot sobre `main`.
2. Instalar o lockfile e aplicar o formatter atualizado.
3. Revisar o diff para confirmar que o acréscimo além de manifests/lockfile é
   exclusivamente mecânico.
4. Executar o gate completo local e remoto.
5. Substituir a PR #17 somente após todos os checks passarem.

## Verification

- `pnpm check` passa com o novo lockfile.
- A formatação adicional não muda lógica.
- Os checks obrigatórios da PR passam antes do merge.
