---
phase: 8
slug: audit-roles-and-shift-close
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-22
---

# Phase 8 — Validation Strategy

> Contrato de validação por amostragem para autorização, auditoria, evidência e fechamento.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + Playwright 1 + assertions SQL em branch Neon temporária |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `pnpm vitest run --config vitest.config.ts --project domain --project contracts --project api` |
| **Full suite command** | `pnpm check` |
| **Estimated runtime** | ~120 segundos locais; migration Neon é gate separado |

## Sampling Rate

- **After every task commit:** executar o projeto Vitest afetado.
- **After every plan wave:** executar `pnpm test && pnpm typecheck && pnpm lint`.
- **Before `$gsd-verify-work`:** `pnpm check` deve estar verde.
- **Max feedback latency:** 180 segundos para checks locais; migration Neon é gate separado.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | AUD-02 | T8-01/T8-02/T8-03 | capability + store scope rejeita role/loja forjados | unit/contract | `pnpm vitest run --config vitest.config.ts --project domain --project contracts` | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 1 | AUD-01/AUD-02 | T8-04/T8-05 | schema append-only, índices e idempotência | db integration | migration + assertions SQL em branch Neon temporária | ❌ W0 | ⬜ pending |
| 08-01-03 | 01 | 1 | AUD-02 | T8-01/T8-10 | API autoriza, isola lojas e audita negação | integration | `pnpm vitest run --config vitest.config.ts --project api` | ❌ W0 | ⬜ pending |
| 08-02-01 | 02 | 2 | AUD-01 | T8-04/T8-05 | fatos de task/sync/markdown/alert viram eventos idempotentes | integration | `pnpm vitest run --config vitest.config.ts --project api --project mobile` | ❌ W0 | ⬜ pending |
| 08-02-02 | 02 | 2 | AUD-01/AUD-02 | T8-01 | timeline contextual e geral respeitam escopo | component/integration | `pnpm vitest run --config vitest.config.ts --project mobile --project web --project api` | ❌ W0 | ⬜ pending |
| 08-03-01 | 03 | 3 | AUD-03 | T8-06/T8-07/T8-08 | fila separada e bucket privado não vazam bytes/URLs | unit/integration | `pnpm vitest run --config vitest.config.ts --project contracts --project mobile --project api` | ❌ W0 | ⬜ pending |
| 08-03-02 | 03 | 3 | AUD-01/AUD-03 | T8-06/T8-07 | ack, retry, invalidação e retenção preservam histórico | integration | `pnpm vitest run --config vitest.config.ts --project mobile --project api` | ❌ W0 | ⬜ pending |
| 08-04-01 | 04 | 4 | PSH-04 | T8-09 | todos os blockers de D-02 impedem selo seguro | unit/property | `pnpm vitest run --config vitest.config.ts --project domain --project contracts` | ❌ W0 | ⬜ pending |
| 08-04-02 | 04 | 4 | PSH-04/AUD-01 | T8-09 | snapshot imutável, passagem e reabertura auditada | integration | `pnpm vitest run --config vitest.config.ts --project api --project mobile` | ❌ W0 | ⬜ pending |
| 08-05-01 | 05 | 5 | AUD-02 | T8-01/T8-02/T8-03/T8-10 | vínculos não concedem poder operacional implícito | integration/component | `pnpm vitest run --config vitest.config.ts --project api --project web` | ❌ W0 | ⬜ pending |
| 08-05-02 | 05 | 5 | AUD-01/AUD-02/AUD-03/PSH-04 | T8-01..T8-10 | regressão cross-surface, segurança e documentação | e2e/full | `pnpm test:e2e:web && pnpm check` | ✅ existing harness | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

## Wave 0 Requirements

- [ ] `packages/domain/src/authorization.test.ts` — matriz collaborator/lead/admin + loja.
- [ ] `packages/domain/src/shift-close.test.ts` — blockers, checklist e imutabilidade.
- [ ] `packages/contracts/src/audit.test.ts` — contratos de evento/timeline.
- [ ] `packages/contracts/src/evidence.test.ts` — lifecycle sem bytes/URL.
- [ ] `packages/contracts/src/shift-close.test.ts` — comandos e snapshots.
- [ ] `apps/api/src/authorization.test.ts` — auth fake, capability e IDOR.
- [ ] `apps/api/src/audit.test.ts` — atomicidade/idempotência/consulta.
- [ ] `apps/api/src/evidence.test.ts` — R2 fake, validação e redaction.
- [ ] `apps/api/src/shift-close.test.ts` — revalidação central/passagem/reabertura.
- [ ] `apps/mobile/src/capture/evidence-upload.test.ts` — SQLite queue, retry e ack.
- [ ] `apps/mobile/src/capture/shift-close.test.tsx` — fluxo lead e blockers.
- [ ] `apps/web/src/audit/AuditWorkbench.test.tsx` — filtros, escopo e estados.
- [ ] `apps/web/src/memberships/memberships.test.tsx` — vínculos, revogação e poder operacional explícito.
- [ ] `apps/web/e2e/audit-roles-shift-close.spec.ts` — jornadas integradas e negações cross-store.
- [ ] assertions SQL para constraints/índices/append-only em branch Neon temporária.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Fechamento com uma mão e leitura sob luz forte | PSH-04 | ergonomia/ambiente real | Em dispositivo, percorrer safe e unsafe; confirmar alvos ≥48 dp, ordem do leitor e legibilidade |
| Captura e retry de foto após perda de rede | AUD-03 | câmera/rede/storage real | Capturar offline, reiniciar app, reconectar, retry e verificar que somente ack central mostra `Enviada` |
| Retenção R2 de 90 dias | AUD-03 | lifecycle é assíncrono | Listar lifecycle via Wrangler/API e verificar prefixo/regra sem usar foto real |
| Neon Auth real no piloto | AUD-02 | depende do provedor externo | Login de cada papel, expiração/revogação e tentativa cross-store no ambiente de teste |

## Validation Sign-Off

- [x] Todos os tasks possuem `<automated>` ou dependência Wave 0.
- [x] Não há três tasks consecutivas sem verificação automatizada.
- [x] Wave 0 cobre todos os arquivos marcados como ausentes.
- [x] Nenhum comando usa watch mode.
- [ ] Feedback local permanece abaixo de 180 segundos durante execução.
- [x] O plano bloqueia produção até migrações passarem em branch Neon temporária.
- [x] `nyquist_compliant: true` definido após os planos finalizarem o mapa de tasks.

**Approval:** approved for execution planning; runtime checks remain pending
