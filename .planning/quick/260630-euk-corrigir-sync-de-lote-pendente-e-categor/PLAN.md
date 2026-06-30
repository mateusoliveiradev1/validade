---
quick_id: 260630-euk
slug: corrigir-sync-de-lote-pendente-e-categor
status: executing
created_at: 2026-06-30T13:41:28.960Z
---

# Quick Task: Corrigir sync de lote pendente e categoria para produto embalado do fornecedor

## Contexto

O APK 134 ainda deixa lote pendente quando o produto local/draft nao e resolvido para um produto central validado durante a sincronizacao manual. Na operacao real tambem falta categoria explicita para alho embalado pelo fornecedor, separando alho inteiro com validade de 90 dias desde embalagem dos alhos processados embalados com validade de etiqueta.

## Plano

1. Fazer o replay de lotes pendentes consultar a busca central de produtos quando o cache local nao tiver um produto central reutilizavel.
2. Sincronizar automaticamente apenas se a busca central retornar produto reutilizavel/validado; candidatos similares ou drafts continuam pendentes.
3. Adicionar categorias centrais para alho inteiro embalado e alho processado embalado.
4. Cobrir o replay por teste focado.
5. Bump de build/aprovado, gerar APK novo e publicar deploys necessarios.
