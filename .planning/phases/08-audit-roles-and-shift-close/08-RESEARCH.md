# Phase 8: Audit, Roles, and Shift Close - Research

**Researched:** 2026-06-22
**Status:** Complete
**Mode:** MVP vertical slices

## Research Question

O que precisa ser conhecido para planejar bem a Fase 8 sem enfraquecer a operação local-first já entregue?

## Executive Summary

A fase deve ser planejada como quatro capacidades conectadas, não como quatro camadas horizontais: identidade/autorização, auditoria, evidência e fechamento. Cada plano deve atravessar contratos, regra pura, persistência/adaptador, API e superfície consumidora na menor fatia útil.

O repositório ainda não possui persistência central durável, autenticação real ou storage de evidências. O projeto Neon `validadeZero` (`empty-scene-84209474`) existe em `aws-sa-east-1`, PostgreSQL 18, branch `production`, banco `neondb`, atualmente sem tabelas. Isso torna a Fase 8 o primeiro ponto em que o plano precisa introduzir Drizzle/Neon de forma explícita. Migrações devem ser testadas em branch temporária antes de chegar à branch principal; nenhum segredo ou connection string entra no repositório.

O caminho de menor risco é manter portas testáveis e adaptadores locais, introduzir um pacote de persistência central com Drizzle, validar identidade no Hono e resolver papel/loja a partir de vínculos próprios. Neon Auth permanece atrás de `AuthProvider`: o JWT prova identidade, mas não deve ser aceito como fonte autônoma de papel operacional ou loja. O contexto autorizado vem da associação persistida e é aplicado novamente em cada consulta por `store_id`.

Para evidências, o bucket R2 deve permanecer privado. O mobile conserva URI/binário apenas na fila local de upload; comandos offline continuam somente com metadados. A API autoriza o upload, grava via binding R2 ou emite intenção curta, confirma o objeto e só então marca a evidência como enviada. URLs temporárias são bearer tokens e nunca entram na auditoria ou no banco. Uma regra de lifecycle de 90 dias remove o binário; os metadados históricos permanecem.

O fechamento não é um botão sobre o veredito atual. É um snapshot imutável, calculado por regra pura, com checklist físico e blockers explícitos. `safe` exige estado central sincronizado e checklist completo. `unsafe` pode encerrar o turno com passagem obrigatória, sem apagar cobrança. Reabertura cria nova revisão/evento e preserva o original.

## Current System Baseline

### Reusable seams

- `packages/contracts/src/index.ts` já define `ActorRoleSchema`, `ActorContextSchema`, `StoreContextSchema` e um `AuditEventSchema` mínimo.
- `packages/contracts/src/tasks.ts` preserva histórico de resolução, ator, horário e placeholder de evidência.
- `packages/contracts/src/sync.ts` separa `occurredAt`/`savedAt` do ack, rejeita `uri`, `base64`, `objectKey`, `photoUri` e `imageBytes` em payloads de comando.
- `packages/domain/src/tasks.ts`, `sync.ts`, `markdown.ts` e `alerts.ts` oferecem fatos de domínio para derivar eventos e blockers sem duplicar regras na UI.
- `apps/api/src/index.ts` usa serviços injetáveis e fakes locais; esse é o padrão para `AuthProvider`, `AuthorizationService`, `AuditRepository`, `EvidenceStore` e `ShiftCloseRepository`.
- `apps/mobile/src/capture/repository.ts` é a porta local-first; `sqlite-repository.ts` e `sqlite-migrations.ts` já demonstram ledger, outbox e migrações idempotentes.
- `apps/mobile/src/capture/TodayScreen.tsx` já coloca o veredito de segurança antes de cache/sync/conflitos.
- `apps/mobile/src/capture/offline-sync-ui.tsx` já oferece linguagem visual para pendente, falha, conflito, ack e retry.
- `apps/web/src/App.tsx` é apenas smoke; pode receber a consulta geral de auditoria sem competir com o fluxo mobile.

### Missing capabilities

- Não há schema Drizzle, migrations Postgres ou pacote de banco.
- Não há middleware de autenticação nem vínculo persistido usuário-papel-loja.
- Não há política central de autorização ou testes IDOR entre lojas.
- Não há persistência append-only de eventos.
- Não há fila de upload de evidência, bucket binding, confirmação de objeto ou retenção.
- Não há contrato, regra, snapshot ou tela de fechamento/passagem.

## Recommended Architecture

### 1. Identity and authorization

Definir identidade e autorização como conceitos separados:

- `AuthProvider.verify(request)` valida token/sessão e retorna apenas identidade autenticada (`subject`, nome opcional, tempos/issuer).
- `MembershipRepository` resolve vínculos ativos de `subject` com `role` e `storeId`.
- `AuthorizationService.authorize(actor, capability, resourceStoreId)` aplica uma matriz explícita de capacidades.
- Handlers recebem `AuthorizedActorContext`; não aceitam `role` ou `storeId` enviados pelo cliente como verdade.

Capacidades mínimas:

- `task.act`, `evidence.attach`, `markdown.request` para collaborator.
- `task.assign`, `markdown.decide`, `escalation.assume`, `audit.read_store`, `evidence.read_store`, `evidence.invalidate`, `shift.close`, `shift.handoff_ack` para lead.
- `user.manage`, `role.manage`, `store.manage`, `policy.manage`, `audit.read_global`, `evidence.read_global` para admin.
- Ações operacionais de lead por admin exigem vínculo explícito de lead naquela loja.

Toda leitura/gravação sensível recebe `storeId` derivado do vínculo ou compara o recurso carregado com o escopo autorizado. Testar IDs conhecidos de outra loja é obrigatório. Tentativas negadas geram evento de segurança sanitizado, sem token, cabeçalho ou payload bruto.

Neon Auth está em beta e suporta JWT EdDSA com JWKS. O token pode identificar o `sub`, mas papéis/lojas devem continuar em tabelas da aplicação porque custom claims não são a base confiável deste modelo. O adaptador permite trocar o provedor sem contaminar contratos de domínio.

### 2. Central persistence with Drizzle and Neon

Introduzir uma fronteira central, preferencialmente `packages/database`, com schema e migrations versionadas. O runtime Cloudflare usa Neon serverless HTTP + Drizzle para consultas curtas; transações que precisam agrupar mudança + evento devem usar um modo suportado de transação e permanecer dentro da requisição.

Tabelas iniciais recomendadas:

- `store_memberships`: subject, actor, role, store, status e datas; unique para vínculo ativo.
- `audit_events`: append-only, indexada por `(store_id, occurred_at desc)`, `(target_type, target_id, occurred_at)`, `actor_id` e `type`.
- `evidence_assets`: store/target, object key opaca, estado, MIME, tamanho, hash, autoria, tempos, invalidation e retention; nunca bytes/URL assinada.
- `shift_closures`: snapshot imutável, verdict, blockers, checklist, autor, occurred/received, handoff e referência à revisão anterior.
- `shift_handoffs`: responsável, prazo, motivo, observação e recebimento auditado quando o fechamento é inseguro.

Campos de auditoria recomendados:

- `event_id`, `event_type`, `store_id`, `actor_id`, `actor_role_snapshot`.
- `occurred_at` (momento físico), `received_at` (momento central).
- `target_type`, `target_id`, `summary`, `reason`.
- `previous_event_id`, `evidence_asset_id`, `sync_command_id` opcionais.
- `metadata` JSON sanitizado apenas para detalhes operacionais tipados.

O papel do ator deve ser snapshot no evento; mudanças posteriores de papel não reescrevem história. UPDATE/DELETE de auditoria não devem existir no repositório de aplicação. Correção é outro evento. A migration deve impedir atualização/deleção pelo papel usado pela aplicação ou expor apenas operações de insert/select.

### 3. Audit production

Eventos devem nascer no limite transacional da mudança central, não por reconstrução posterior de logs. Um `AuditRecorder` recebe dados tipados e grava o evento no mesmo caso de uso que processa:

- criação/atribuição/resolução/reabertura de tarefa;
- solicitação/decisão/aplicação/confirmação de rebaixa;
- alerta/escalonamento;
- ack/retry/conflito/descarte de sync;
- criação/upload/ack/invalidação/consulta excepcional de evidência;
- decisão de acesso negada;
- fechamento, passagem, recebimento e reabertura.

No mobile, fatos ainda não reconhecidos centralmente aparecem como eventos locais `pending_ack`. Depois do ack, reconciliar por `commandId`/`idempotencyKey` e mostrar os dois horários. Não duplicar o evento quando o mesmo comando é reenviado.

Linhas do tempo contextuais devem consumir uma projeção estável (`AuditTimelineItem`) e não payloads brutos. A visão geral de loja usa paginação por cursor, filtros de período/pessoa/tipo/alvo e escopo já aplicado no servidor.

### 4. Evidence lifecycle

Estados centrais mínimos: `upload_requested`, `uploading`, `uploaded`, `failed`, `invalidated`, `expired`. Estados locais: `waiting_upload`, `uploading`, `failed`, `uploaded`, `invalidated`.

Fluxo recomendado:

1. Mobile captura e registra `localEvidenceId`, URI privada, MIME, tamanho/hash e alvo na tabela SQLite `evidence_uploads`.
2. Comando operacional referencia apenas `localEvidenceId`/estado lógico; bytes e object key não entram na outbox de comandos.
3. API cria intenção após autorizar ator, loja e alvo e retorna identificador opaco.
4. Upload ocorre por endpoint Hono que transmite o body ao binding R2 privado; alternativa futura é PUT presigned curto.
5. API confirma existência/metadados do objeto e grava `uploaded`; somente esse ack muda a UI para enviada.
6. Falha mantém retry visível e não transforma placeholder em prova central.
7. Invalidação exige lead + motivo, preserva objeto/metadados e permite substituição vinculada.
8. Lifecycle R2 expira objetos após 90 dias; job de reconciliação marca `expired` sem apagar autoria/hash/vínculos.

Para o piloto, o binding R2 no Worker é preferível: credenciais não chegam ao dispositivo, autorização fica na aplicação e o bucket segue privado. O endpoint deve validar Content-Type permitido, limite de tamanho, chave gerada pelo servidor e store/target. O streaming evita carregar a foto inteira em memória. Se URLs presigned forem adotadas, usar validade curta, Content-Type assinado e nunca persistir/logar a URL completa.

### 5. Shift-close rule and immutable snapshots

Criar regra pura `evaluateShiftClose(input)` em `packages/domain`, com saída discriminada:

- `eligible_safe`: sem blockers e checklist completo.
- `must_close_unsafe`: blockers explícitos e passagem obrigatória.
- `cannot_evaluate`: cache ausente/desatualizado ou estado central não confiável.

Blockers de D-02: risco vencido/crítico, reconferência aberta, conflito crítico, sync crítico pendente, cache desatualizado e checklist incompleto. Evidência pendente que seja necessária à confirmação física também bloqueia selo seguro.

`safe` requer revalidação central imediatamente antes do commit. Não aceitar declaração segura somente local/offline. Um fechamento inseguro pode ser salvo localmente, mas permanece pendente de ack e não interrompe alertas. O snapshot conserva contagens/IDs de blockers, checklist, responsável, horários e versão da regra.

Reabertura não altera o snapshot: cria nova revisão com `reopensClosureId`, motivo, autor e resumo da mudança. A passagem de turno exige motivo, responsável, prazo e observação; o recebimento pela próxima liderança é evento independente e não resolve pendências.

## UI and Interaction Guidance

Cena física: liderança usa o celular em corredor iluminado, com uma mão, no fim do turno e sob pressão para não declarar segurança indevida. A interface deve permanecer clara, firme e restrita, preservando `captureColors`, alvos de 48 dp e o veredito antes de qualquer detalhe.

### Mobile

- Inserir `Revisar fechamento do turno` após o bloco de veredito/cache/sync, visível para lead; collaborator vê explicação de quem pode fechar quando a ação for relevante.
- Usar tela progressiva, não modal: veredito, blockers, checklist físico, decisão segura/insegura, confirmação e recibo.
- Selo seguro usa texto + ícone + estrutura, não apenas verde. Inseguro não deve parecer falha de software: `Turno encerrado com pendências` e passagem continuam visíveis.
- Checklist deve ter alvos de 48 dp e ordem fixa: vencidos/críticos, reconferências e rebaixas em área de venda.
- Mostrar evidência como `Aguardando envio`, `Enviando`, `Enviada`, `Falha no envio`, `Invalidada`; retry é ação direta.
- Linha do tempo contextual usa frases operacionais e separa `Realizada no aparelho` de `Recebida pelo sistema`.

### Web

- Superfície complementar para lead/admin: tabela/lista densa de auditoria, filtros persistentes e painel de detalhe; evitar cards métricos decorativos.
- Escopo de loja sempre visível. Admin global deve escolher/confirmar escopo antes de abrir evidência entre lojas.
- Loading por skeleton, empty state instrutivo, erro com retry; paginação por cursor.

### Accessibility

- WCAG 2.2 AA, contraste 4.5:1 para texto, foco visível e ordem de leitor igual à prioridade operacional.
- Estado crítico, permissão e sync usam texto/estrutura além de cor.
- Nenhum conteúdo essencial depende de animação; transições de estado em 150-250 ms com reduced motion.

## Security Threat Model Inputs

| Ref | Threat | Severity | Required mitigation |
|-----|--------|----------|---------------------|
| T8-01 | IDOR entre lojas por IDs conhecidos | high | store scope server-side em toda leitura/gravação + testes negativos |
| T8-02 | Cliente forja role/store em payload | high | identidade verificada e membership carregado no servidor; ignorar contexto enviado |
| T8-03 | Admin executa operação sem vínculo de lead | high | capability + membership explícita por loja |
| T8-04 | Auditoria é alterada/apagada | high | append-only, sem update/delete no adapter e restrição DB |
| T8-05 | Replay duplica ação/evento | high | idempotency key e unique constraint/transação |
| T8-06 | Foto privada exposta | high | bucket privado, autorização antes de get/put, chave opaca, URL curta se usada |
| T8-07 | Upload malicioso/excessivo | high | MIME/tamanho/hash, chave server-generated, streaming, limites e testes |
| T8-08 | URL temporária vaza em logs | medium | redaction e proibição de persistir query assinada |
| T8-09 | Fechamento seguro com estado stale/offline | high | revalidação central + blockers e checklist obrigatórios |
| T8-10 | Acesso negado não deixa rastro | medium | evento de segurança sanitizado e tolerância controlada à falha |

O plano deve bloquear em ameaça `high`, conforme `.planning/config.json`, e cada PLAN deve conter `<threat_model>`.

## Validation Architecture

### Test layers

- Domain unit/TDD: matriz de capacidades, regra de fechamento e transições de evidência.
- Contracts: Zod aceita estados válidos e rejeita role/store/object key/binários forjados.
- Database integration: migrations em branch Neon temporária; constraints, índices, append-only e isolamento por loja.
- API integration: token/auth fake, capability checks, cross-store denial, audit atomicity, evidence adapter/R2 fake, close revalidation.
- Mobile component/repository: fila SQLite separada, retry/ack, estados visíveis, checklist e blockers.
- Web component/E2E: filtros, escopo, detalhe e proibição de acesso entre lojas.
- Security regression: secret/data scanning, URL redaction, raw payload absence, IDOR matrix.

### Fast feedback commands

- Domínio/contratos: `pnpm vitest run --config vitest.config.ts --project domain --project contracts`.
- API: `pnpm vitest run --config vitest.config.ts --project api`.
- Mobile: `pnpm vitest run --config vitest.config.ts --project mobile`.
- Web: `pnpm vitest run --config vitest.config.ts --project web`.
- Full phase gate: `pnpm check`.

### Nyquist requirements

- Nenhuma sequência de três tasks sem verificação automatizada.
- Schema/migration é verificado na branch Neon temporária e por assertions SQL antes de commit na principal.
- Toda task de autorização inclui caso permitido e negado cross-store.
- Toda task de evidência prova que bytes/URI/URL assinada não aparecem no Postgres, comando sync, log ou fixture pública.
- Toda task de fechamento prova que cada blocker de D-02 impede `safe`.

## Planning Implications

Uma decomposição provável, preservando vertical slices:

1. Contratos, policy de autorização e persistência Neon/migrations, incluindo AuthProvider e eventos negados.
2. Auditoria append-only integrada ao sync/task/markdown/alert e timelines contextual/geral.
3. Evidência local-first + R2 privado + estados/ack/invalidação/retenção.
4. Fechamento/passagem/reabertura com regra pura, snapshot, API e mobile.
5. Hardening de integração, web audit, segurança e documentação operacional se não couber nas fatias anteriores.

Evitar um plano apenas de banco seguido de um plano apenas de UI. Cada plano deve entregar comportamento observável e testes, mesmo quando depende da infraestrutura criada na primeira onda.

## Sources

- `.planning/phases/08-audit-roles-and-shift-close/08-CONTEXT.md`
- `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`
- `.planning/phases/04-today-task-workflow/04-CONTEXT.md`
- `.planning/phases/06-markdown-rebaixa-workflow/06-CONTEXT.md`
- `.planning/phases/07-offline-sync/07-CONTEXT.md`
- [Neon Auth overview](https://neon.com/docs/auth/overview)
- [Neon Auth JWT/JWKS](https://neon.com/docs/auth/guides/plugins/jwt)
- [Neon Row-Level Security](https://neon.com/docs/guides/row-level-security)
- [Neon serverless driver](https://neon.com/docs/serverless/serverless-driver)
- [Drizzle with Neon](https://neon.com/docs/guides/drizzle)
- [Cloudflare R2 Workers binding](https://developers.cloudflare.com/r2/api/workers/workers-api-usage/)
- [Cloudflare R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
- [Cloudflare R2 lifecycle rules](https://developers.cloudflare.com/r2/buckets/object-lifecycles/)
- [Hono JWT middleware](https://hono.dev/docs/middleware/builtin/jwt)

## RESEARCH COMPLETE

