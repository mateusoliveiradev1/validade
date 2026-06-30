---
quick_id: 260630-dsq
status: complete
created: 2026-06-30
---

# Quick Task 260630-dsq: Corrigir sincronizacao manual sem feedback quando lote central pendente nao vira comando

## Goal

Corrigir o follow-up em que o operador aperta sincronizar em Hoje/Ajustes e nada util acontece quando existe lote salvo localmente aguardando central, mas a fila de comandos offline esta vazia.

## Findings

- Lotes pendentes de replay central entram em `capture_lots`, nao em `sync_commands`.
- A UI ja contava esses lotes no total da fila, mas podia renderizar uma fila sem linhas explicativas.
- Hoje ainda podia nao exibir feedback quando o motor de comandos retornava `undefined`, `skipped_offline` ou quando apenas o lote pendente restava.
- A tentativa de sincronizar lote pendente precisava atualizar a leitura central silenciosamente antes do replay para descobrir produto central validado que ainda nao estivesse no cache local.

## Tasks

1. Fazer Hoje e Ajustes sempre emitirem feedback quando restar lote pendente central.
2. Exibir aviso explicito na fila quando `totalCount > commands.length`.
3. Acionar leitura central silenciosa antes de reenviar lotes pendentes.
4. Bump do APK aprovado para `0.12.0 (134)`.
5. Gerar APK local novo e validar metadata.

## Verification

- Mobile focused/full project test pass.
- API Command Center tests pass.
- Web Command Center tests pass.
- Database repository tests pass.
- Mobile/API/Web/Database typecheck pass.
- `git diff --check` pass.
- APK metadata shows package `com.validadezero.app`, versionName `0.12.0`, versionCode `134`.
