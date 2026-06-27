---
quick_id: 260627-mpa
date: 2026-06-27
status: completed
---

# Quick Plan: Produto com multiplos identificadores

## Objetivo

Permitir que um produto operacional seja cadastrado uma vez e possa acumular varios identificadores ao longo do tempo, como GTIN, EAN, codigo de barras lido, PLU, codigo interno ou codigo de fornecedor, sem duplicar produto quando embalagem/codigo mudar.

## Escopo

- Contratos Zod para identificadores de produto em busca, catalogo, draft e reuso.
- Tabela central `central_product_identifiers` com unicidade ativa por loja, tipo e valor normalizado.
- Repositorio central e repositorios mobile/local capazes de buscar, reutilizar e vincular novo codigo a produto existente.
- Fluxo mobile de descoberta/criacao ajustado para abrir produto a partir de codigo lido e deixar categoria/nome claros.
- Testes focados para contrato, banco e mobile.
- Migration aplicada em Neon staging e Worker staging publicado.

## Fora de escopo

- Gerar APK novo.
- Criar produtos/lotes falsos em staging.
- Ativar storage R2 ou push Android real.

## Verificacao planejada

- `pnpm.cmd format:check`
- `pnpm.cmd lint`
- `pnpm.cmd typecheck`
- `pnpm.cmd test`
- `pnpm.cmd build`
- Migration descartavel Neon a partir de `staging`.
- Migration real em Neon `staging`.
- Deploy do Worker `validade-zero-api-staging`.
