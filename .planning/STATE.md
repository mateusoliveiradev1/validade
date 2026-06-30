---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Operacao Real de Loja e Diagnostico
current_phase: 16
status: ready_to_plan
stopped_at: Phase 15 complete (6/6) - ready to discuss Phase 16
last_updated: 2026-06-30T11:35:00.000Z
last_activity: 2026-06-30
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 16
  completed_plans: 16
  percent: 75
---

# Project State: Validade Zero

**Initialized:** 2026-06-18
**Current phase:** 16
**Workflow mode:** yolo
**Execution:** sequential
**Project mode:** mvp
**Last activity:** 2026-06-30

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-30)

**Core value:** Garantir que nenhum produto vencido permaneça na área de venda, mantendo cada risco visível e acionável até sua resolução confirmada.
**Current focus:** Phase 16 - loja 18 validation runbook and go/no go proof

## Roadmap Progress

| Phase | Status | Notes |
|-------|--------|-------|
| 13 | Complete | Web Operational Navigation and Readiness Surfaces - 5 plans implemented and verified |
| 14 | Complete | Mobile Ajustes and Device Controls - 5 plans implemented; ready for verification |
| 15 | Complete | Operational Surface Distillation - OPS-01..OPS-04 implemented and verified |
| 16 | Pending | Loja 18 Validation Runbook and Go/No-Go Proof - VAL-01..VAL-04 |

## Active Constraints

- Zero recurring cost during pilot.
- Public repo with no secrets or real operational data.
- Neon + Cloudflare preferred, behind adapters.
- Sequential execution requested; do not run subagents in parallel.
- Push after every commit is enabled through local git hook.

## Next Step

Discuss and plan Phase 16: Loja 18 validation runbook and Go/No-Go proof.

## Accumulated Context

### Roadmap Evolution

- Phase 10 added: Real Pilot Flow Rebuild for lot/product/access/sync pilot flow repair.
- Phase 10 Plan 01 completed: authorized central prepare-turn package, central capture repository, mobile Preparar turno gate, and SQLite hydration before Hoje.
- Phase 10 Plan 02 completed: central product search/reuse/draft contracts, idempotent store-scoped catalog repository, authorized API product draft workflow, mobile unified create/reuse flow, and Command Center product draft visibility.
- Phase 10 Plan 03 completed: central lot creation/observation contracts, durable store-scoped task projection, authorized API lot writes, mobile central-save path, and visible central/local lot cache state.
- Phase 10 Plan 04 completed: central terminal resolution policy, central sync command application, conflicts/retries/idempotency, mobile resolved-history reconciliation, and migration/schema check against existing 0006 central capture migration.
- Phase 10 Plan 05 completed: capture-backed Command Center projection, explicit command_center/catalog capabilities, role-scoped web navigation/actions, central active-task alert dispatch, and migration/schema check. Remote apply was later completed on Neon staging.
- Phase 10 Plan 06 completed: central shift-close revalidation, pilot UAT docs, mobile/web release journeys, root gates, security/performance verification, Neon staging migration application, and external blocker record for Android/provider.
- Phase 11 added: Mobile Visual Polish and Emulator Validation
- Phase 11 planned: 4 sequential plans for shared mobile status polish, full critical-flow polish, installed Android/Maestro evidence, and release truth/provider blocker reconciliation.
- Phase 11 Plan 01 completed: typed mobile status vocabulary, semantic StatusNotice tones, prepare-turn non-safe local fallback, and Hoje first-viewport central/local/sync hierarchy.
- Phase 11 Plan 02 completed: product-to-lot, terminal evidence, sync conflict, and shift-close surfaces polished with shared status vocabulary and 75 focused mobile tests plus typecheck.
- Phase 11 Plan 03 completed: mobile release journeys expanded, Maestro checkpoint names updated, `11-UAT.md` created, `security:evidence` passed, and installed Android remained blocked because `adb devices` listed no target and Maestro reported `Not enough devices connected (0)`.
- Phase 11 Plan 04 completed: release truth, install, push, pilot-flow, testing, UAT, and validation docs now separate historical APK/emulator evidence from current repo readiness and external Android/provider/camera blockers; `pnpm.cmd check` passed.
- Phase 11 verification completed: UAT record is complete as a truthful evidence record, with installed Android, provider push, camera/device, and physical-device proof explicitly acknowledged as external blockers.
- Phase 12 added: Pilot Operations and Device Readiness for device health, push-test observability, release truth, guided real-store UAT, and blocker visibility before rollout claims.
- Phase 12 planned: 5 sequential plans for device readiness, safe push-test timeline, installed-build truth, guided Loja 18 UAT, and final blocker/release validation.
- Phase 12 Plan 01 completed: public-safe Apto/Atencao/Bloqueado device readiness contracts, central_device_snapshots readiness persistence, store-scoped API projection, and Command Center `Aparelhos do piloto` panel with blocker causes and next actions.
- Phase 12 Plan 02 completed: safe push-test contracts, same-store lead/admin API authority, sanitized provider/token/permission timeline, and Command Center action that never resolves tasks or proves area segura.
- Phase 12 Plan 03 completed: pilot versioning moved to `0.12.0`/Android `versionCode` `120`, mobile build-info reports sanitized version/build/env/API truth, and Command Center compares devices against approved staging artifact `phase-12-staging-apk-120`.
- Phase 12 Plan 04 completed: Command Center now carries the `UAT Loja 18` guided checklist, contract/API/web/E2E tests cover pass/block/external-block states, and `12-UAT.md` records public-safe real-store UAT rules.
- Phase 12 Plan 05 completed: Command Center now synthesizes `Bloqueios do piloto`, release/UAT/testing docs are reconciled, `12-VALIDATION.md` is nyquist-compliant with explicit external blockers, `pnpm.cmd check` and web E2E passed, and installed Android/provider/camera/physical UAT remain externally blocked.
- v1.0 milestone audit completed: `v1.0-MILESTONE-AUDIT.md` status is `gaps_found` because 14 v1 requirements are checked in `REQUIREMENTS.md` and present in summaries but absent from every phase `VERIFICATION.md`; repo gates and web E2E passed, Android/provider/camera/physical UAT remain external blockers.
- Phase 3 formal verification closure completed: `03-VERIFICATION.md` now links CAT-01, CAT-02, CAT-03, LOC-01, LOC-02, and LOC-03 to existing summaries, UAT, security, and current repository gates.
- Phase 6 formal verification closure completed: `06-VERIFICATION.md` now links MRK-01, MRK-02, MRK-03, and MRK-04 to existing summaries, UAT, validation, and current repository gates.
- Phase 7 formal verification closure completed: `07-VERIFICATION.md` now links SYN-01, SYN-02, and SYN-03 to existing summaries, validation, historical native smoke, and current repository gates while preserving the missing conversational UAT/current-device blocker.
- Phase 9 formal verification closure completed: `09-VERIFICATION.md` now links UI-04 to existing summaries, normalized `09-UAT.md`, validation, Impeccable detector output, current repo/web gates, and explicit Android/provider/device external blockers.
- Phase 10 formal verification closure completed: `10-VERIFICATION.md` now links central truth, product/lot lifecycle, terminal sync, Command Center/RBAC/push, shift close, Neon staging evidence, and explicit Android/provider/device/physical UAT external blockers.
- Phase 12 formal verification closure completed: `12-VERIFICATION.md` now links P12-DEVICE-01, P12-PUSH-02, P12-RELEASE-03, P12-UAT-04, and P12-OPS-05 to existing summaries, UAT, validation, current repo/web gates, and explicit Android/provider/camera/physical UAT external blockers.
- v1.0 milestone audit rerun completed: all 37 v1 requirements now have traceability through REQUIREMENTS.md, summaries, and VERIFICATION.md; repository and web gates passed; physical rollout remains blocked by external Android/provider/camera/Loja 18 UAT proof.
- Post-v1.0 staging hotfix completed: Neon `staging` received the Phase 12 device readiness migration, then the deployed API was fixed so prepare-turn prefers the authenticated session store for multi-store subjects instead of falling back to the first active membership; staging Worker `389c468e-12ce-4254-8be6-2e8689fb54ee` is live and database/auth health checks pass.
- v1.1 milestone started: scope separates daily operation from diagnostic/rollout surfaces, keeps device readiness permanent, adds mobile Ajustes, and makes Loja 18 validation runnable without polluting the daily workflow.

### Quick Tasks Completed

| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|
| 260619-a1b | Fix medium Dependabot alerts for qs and uuid with validated pnpm overrides | 2026-06-19 | 4f2b992 | Verified | [260619-a1b-fix-medium-dependabot-alerts-for-qs-and-](./quick/260619-a1b-fix-medium-dependabot-alerts-for-qs-and-/) |
| 260619-tw4 | Exibir horários de observação sem segundos no app mobile | 2026-06-20 | 37fd67d | Verified | [260619-tw4-exibir-hor-rios-de-observa-o-sem-segundo](./quick/260619-tw4-exibir-hor-rios-de-observa-o-sem-segundo/) |
| 260620-ag5 | Fechar gaps UAT da fase 4: feedback de atualizacao e polish da tela Hoje | 2026-06-20 | f6a52be | Verified | [260620-ag5-fechar-gaps-uat-da-fase-4-feedback-de-at](./quick/260620-ag5-fechar-gaps-uat-da-fase-4-feedback-de-at/) |
| 260623-a41 | Adicionar react-native-web para executar e testar o Expo Web localmente | 2026-06-23 | daaf069 | Verified | [260623-a41-adicionar-react-native-web-para-executar](./quick/260623-a41-adicionar-react-native-web-para-executar/) |
| 260623-aif | Adaptar a autenticacao web para desktop sem perder a usabilidade mobile | 2026-06-23 | 457ab7c | Verified | [260623-aif-adaptar-a-autenticacao-web-para-desktop-](./quick/260623-aif-adaptar-a-autenticacao-web-para-desktop-/) |
| 260623-b5m | Ligar API e web locais ao Neon staging e autenticacao persistente, mantendo segredos fora do Git | 2026-06-23 | 81605af | Verified | [260623-b5m-ligar-api-e-web-locais-ao-neon-staging-e](./quick/260623-b5m-ligar-api-e-web-locais-ao-neon-staging-e/) |
| 260623-h7v | Polir UI/UX mobile e preparar APK staging | 2026-06-23 | local | Verified | [260623-h7v-polir-ui-ux-mobile-do-login-e-da-tela-ho](./quick/260623-h7v-polir-ui-ux-mobile-do-login-e-da-tela-ho/) |
| 260623-r8m | Configurar o APK Android staging para usar a API Cloudflare publicada e gerar build EAS interno | 2026-06-23 | 4854228 | Verified | [260623-r8m-configurar-o-apk-android-staging-para-us](./quick/260623-r8m-configurar-o-apk-android-staging-para-us/) |
| 260623-rq1 | Corrigir login da API staging no Cloudflare ajustando hash de senha para o limite do Worker e validar conta admin lider | 2026-06-23 | e795458 | Verified | [260623-rq1-corrigir-login-da-api-staging-no-cloudfl](./quick/260623-rq1-corrigir-login-da-api-staging-no-cloudfl/) |
| 260626-hte | Melhorar painel admin Command Center para explicar vencidos, causas do vencimento, gargalos e proximas acoes com graficos operacionais | 2026-06-26 | local | Verified | [260626-hte-melhorar-painel-admin-command-center-par](./quick/260626-hte-melhorar-painel-admin-command-center-par/) |
| 260626-i4v | Enriquecer Command Center com causa estruturada de vencimento, trilha de auditoria e dados suficientes para explicar por que venceu | 2026-06-26 | pending-final-batch | Verified | [260626-i4v-enriquecer-command-center-com-causa-estr](./quick/260626-i4v-enriquecer-command-center-com-causa-estr/) |
| 260627-hkt | Prepare staging for 23-store real UAT with Loja 18 category catalog, no fake products, and web/API store scope cleanup | 2026-06-27 | pending-final-batch | Verified | [260627-hkt-prepare-staging-for-23-store-real-uat-wi](./quick/260627-hkt-prepare-staging-for-23-store-real-uat-wi/) |
| 260627-iar | Ajustar RBAC multi-loja para dono/admin, convites por loja e nome Mateus Oliveira | 2026-06-27 | 86965264 | Verified | [260627-iar-ajustar-rbac-multi-loja-para-dono-admin-](./quick/260627-iar-ajustar-rbac-multi-loja-para-dono-admin-/) |
| 260627-mpa | Adicionar multiplos identificadores por produto e fluxo para vincular codigo novo sem duplicar produto | 2026-06-27 | pending | Verified | [260627-mpa-adicionar-m-ltiplos-identificadores-por-](./quick/260627-mpa-adicionar-m-ltiplos-identificadores-por-/) |
| 260628-rmd | Gerar APK Android local atual para testar login e sync da Loja 18 sem validar push remoto | 2026-06-28 | local | Verified | [260628-rmd-gerar-apk-android-local-atual-para-testa](./quick/260628-rmd-gerar-apk-android-local-atual-para-testa/) |
| 260630-bw1 | Gerar APK local Phase 15 sem USB | 2026-06-30 | local | Verified | [260630-bw1-gerar-apk-local-phase-15-sem-usb](./quick/260630-bw1-gerar-apk-local-phase-15-sem-usb/) |
| 260630-c12 | Deploy Phase 15 web staging and decide API | 2026-06-30 | remote | Verified | [260630-c12-deploy-phase-15-web-staging-and-decide-a](./quick/260630-c12-deploy-phase-15-web-staging-and-decide-a/) |

## Performance Metrics

| Phase | Plan | Duration | Notes |
|-------|------|----------|-------|
| Phase 01 P01 | 8min | 2 tasks | 22 files |
| Phase 01 P02 | 7min | 3 tasks | 22 files |
| Phase 01 P03 | 10min | 2 tasks | 13 files |
| Phase 01 P04 | 10min | 3 tasks | 11 files |
| Phase 01 P05 | 12min | 3 tasks | 9 files |
| Phase 02 P01 | 7min | 2 tasks | 10 files |
| Phase 02 P02 | 5min | 3 tasks | 6 files |
| Phase 02 P03 | 6min | 3 tasks | 10 files |
| Phase 02 P04 | 5min | 3 tasks | 8 files |
| Phase 03 P01 | 11 min | 2 tasks | 13 files |
| Phase 03 P02 | 14 min | 2 tasks | 13 files |
| Phase 03 P03 | 9 min | 2 tasks | 10 files |
| Phase 03 P04 | 12 min | 2 tasks | 15 files |
| Phase 04 P01 | 10 min | 2 tasks | 14 files |
| Phase 04 P02 | 10 min | 2 tasks | 7 files |
| Phase 04 P03 | 13 min | 2 tasks | 10 files |
| Phase 04 P04 | 9 min | 2 tasks | 11 files |
| Phase 05 P01 | 8 min | 2 tasks | 6 files |
| Phase 05 P02 | 12 min | 2 tasks | 11 files |
| Phase 05 P03 | 20 min | 3 tasks | 6 files |
| Phase 05 P04 | 40 min | 2 tasks | 25 files |
| Phase 06 P01 | 7 min | 2 tasks | 12 files |
| Phase 06 P02 | 11 min | 2 tasks | 6 files |
| Phase 06 P03 | 24 min | 2 tasks | 7 files |
| Phase 06 P04 | 15 min | 2 tasks | 15 files |
| Phase 07 P01 | 5 min | 2 tasks | 8 files |
| Phase 07 P02 | 17min | 2 tasks | 8 files |
| Phase 07 P03 | 8min | 2 tasks | 9 files |
| Phase 07 P04 | 24min | 2 tasks | 21 files |
| Phase 08 P01 | 70 min | 3 tasks | 30 files |
| Phase 08 P02 | 35min | 2 tasks | 33 files |
| Phase 08 P03 | 90min | 2 tasks | 58 files |
| Phase 08 P04 | inline | 2 tasks | truthful close, mobile flow, Neon verification |
| Phase 08 P05 | inline | 2 tasks | memberships, E2E, security, and runbooks |
| Phase 10 P01 | 130min | 3 tasks | 27 files |
| Phase 10 P02 | 150min | 3 tasks | 34 files |
| Phase 10 P03 | 210min | 3 tasks | 23 files |
| Phase 10 P04 | inline | 3 tasks | terminal sync policy, central application, mobile reconciliation, migration check |
| Phase 10 P05 | inline | 3 tasks | capture-backed Command Center, role/store controls, central alert audience, migration check |
| Phase 10 P06 | inline | 3 tasks | central shift close, pilot UAT, release truth gate, Android/provider blockers |
| Phase 11 P01 | 13 min | 3 tasks | 13 files |
| Phase 11 P02 | 35 min | 3 tasks | 22 files |
| Phase 11 P03 | 25 min | 3 tasks | 7 files |
| Phase 11 P04 | 35 min | 3 tasks | 17 files |
| Phase 12 P01 | 24 min | 3 tasks | 10 files |
| Phase 12 P02 | 22 min | 3 tasks | 21 files |
| Phase 12 P03 | 64 min | 3 tasks | 22 files |
| Phase 12 P04 | 13 min | 3 tasks | 12 files |
| Phase 12 P05 | inline | 3 tasks | blocker synthesis, release docs, final gates, external blocker close |
| Phase 13 P01 | 8 min | 3 tasks | 6 files |
| Phase 13 P02 | 7 min | 3 tasks | 3 files |
| Phase 13 P03 | 5 min | 3 tasks | 4 files |
| Phase 13 P04 | 5 min | 3 tasks | 4 files |
| Phase 13 P05 | 13min | 3 tasks | 10 files |
| Phase 14 P01 | 25 min | 3 tasks | 6 files |
| Phase 14 P02 | 12 min | 3 tasks | 5 files |
| Phase 14 P03 | 14 min | 3 tasks | 4 files |
| Phase 14 P04 | 12 min | 3 tasks | 4 files |
| Phase 14 P05 | 18min | 3 tasks | 10 files |
| Phase 15 P01 | 6 min | 3 tasks | 7 files |
| Phase 15 P02 | 13 min | 3 tasks | 8 files |
| Phase 15 P03 | 9 min | 3 tasks | 4 files |
| Phase 15 P04 | 8 min | 3 tasks | 8 files |
| Phase 15 P05 | 10 min | 3 tasks | 6 files |
| Phase 15 P06 | 16 min | 3 tasks | 12 files |

## Session

**Last session:** 2026-06-30T11:06:07.660Z
**Stopped at:** Completed 15-06-PLAN.md
**Resume file:** None

## Decisions

- [Phase 12]: Operational blockers are a separate pilot readiness truth, not a replacement for the sales-area verdict. - A safe central state cannot authorize rollout while device/provider/camera/UAT blockers remain critical or external.
- [Phase 12]: Nyquist completion means every gate has a pass or explicit blocker. - `nyquist_compliant: true` is an honest validation closeout, not a green physical rollout claim.
- [Phase 12]: Device readiness stays on central_device_snapshots rather than a separate truth island. - Keeps device health tied to central prepare-turn and store scope.
- [Phase 12]: Device presence means timestamp facts only. - Last foreground, last sync, and last central read do not claim live presence or physical execution.
- [Phase 12]: Push readiness can be Atencao or Bloqueado depending on the current proof target. - Local-only push is not fatal for non-push steps, but blocks any step proving remote push.
- [Phase 12]: Safe push tests are diagnostic only. - Provider accepted, opened, or local-only outcomes never resolve task state, close shift, or prove the sales area safe.
- [Phase 12]: `pilot.push_test.send` is separate from Command Center read. - Same-store lead/admin can send the diagnostic while admin operational read remains separately denied unless granted.
- [Phase 12]: Push-test evidence is public-safe. - Timeline rows use masked device references, bounded states, requester labels, and next action without Expo tokens or raw provider payloads.
- [Phase 12]: Installed-build truth compares only against the approved staging artifact. - A later repo commit does not make APK `phase-12-staging-apk-120` outdated by itself.
- [Phase 12]: Build evidence is public-safe metadata, not an install record. - Mobile/web show version, versionCode, environment, API target, package, and bounded labels without build URLs, tokens, or provider identifiers.
- [Phase 12]: Old or unknown builds can still sync but remain visible as attention/blocking readiness. - Compatibility status is `atual`, `desatualizado`, `desconhecido`, or `incompativel` and drives the next action.
- [Phase 12]: Loja 18 UAT is a guided Command Center checklist while actions happen on mobile. - The checklist records status, cause, next action, and evidence label without becoming the source of physical execution truth.
- [Phase 12]: Product and lot UAT steps never pass from fixtures or seeds. - Real Loja 18 product/lot input must happen in the controlled run, while public repo records only sanitized status.
- [Phase 12]: External Android/provider/camera blockers are first-class UAT outcomes. - They remain visible as `external_blocked` with next action instead of being hidden behind repo-green tests.
- [Phase 11]: Synced transport is neutral and not proven safe. - Only central operational resolution or safe-close proof can use proven-safe success semantics.
- [Phase 11]: Hoje shows central/local/sync state directly under the sales-area verdict. - The operator sees truth status before explanatory copy, metrics, or actions.
- [Phase 11]: Prepare-turn local cache remains secondary and explicitly non-safe. - Local cache can continue visible work but cannot declare a safe central read.
- [Phase 11]: Product drafts and lot registration keep conservative pending-central semantics. - Rascunho operacional can continue work, but the lot carries warning copy until central validation.
- [Phase 11]: Terminal confirmation separates local save, synced transport, and resolved-central proof. - The final action screen must show consequence, evidence/no-photo path, actor, and central expectation before submission.
- [Phase 11]: Sync conflict discard is destructive and reason-gated. - Conflicts render before ordinary pending rows, and discarded offline commands state they will not be sent to central.
- [Phase 11]: Unsafe shift close explicitly says the area is not safe and work continues. - Only central revalidation plus checklist can enable `Encerrar turno com area segura`.
- [Phase 11]: Component journeys do not substitute for installed Android proof. - `adb devices` and `pnpm.cmd test:e2e:mobile` output must be recorded when the native target is unavailable.
- [Phase 11]: Screenshot evidence is committed as sanitized checkpoint names/UAT records only. - Raw Maestro artifacts remain local unless a narrow allowlist is reviewed and `security:evidence` passes.
- [Phase 11]: Historical APK/emulator evidence is context only. - Current release readiness must use the Phase 11 matrix for repo, installed Android, provider, camera, and physical-device status.
- [Phase 11]: Provider/camera gates pass only with approved external proof. - Expo Go, local mocks, sync-only APKs, and component tests remain blocked for remote push or real camera/device evidence.
- [Phase 10]: Central lot write-through is gated by a ready central prepare-turn cache. - Degraded operation can still capture locally, but it remains visibly pending instead of claiming central acknowledgement.
- [Phase 10]: Mobile lot saves persist the returned central id, source, sync state, task projection, and acknowledgement copy locally. - Keeps recent/detail/Hoje views aligned with second-device prepare-turn truth.
- [Phase 10]: Task projection is recalculated on lot and observation writes, while terminal action sync remains reserved for the next plan. - Avoids resolving critical work before the terminal slice enforces compatible outcomes.
- [Phase 10]: Terminal task resolution is central business state, not transport state. - A plain sync ack marks delivery only; `centralResult.resolved_history` is required before mobile hides active risk.
- [Phase 10]: Central sync conflicts preserve active task visibility and local action context. - Incompatible actions, changed active keys, and missing evidence return conflict/retry instead of clearing Hoje.
- [Phase 10]: Mobile repositories reconcile central resolved history into resolved local tasks. - Keeps Hoje, audit context, and second-device truth aligned after central acknowledgement.
- [Phase 10]: Command Center reads central capture truth by default and fails closed when central facts are missing. - Prevents an audit-only interpretation from producing a false safe verdict.
- [Phase 10]: Command Center read and catalog review use explicit capabilities. - Collaborators can read allowed operational state, leads keep audit/shift authority, and admins can govern catalog/users without implicit shift/task authority.
- [Phase 10]: Push/escalation dispatch is derived from active central tasks and store-scoped audience registrations. - Delivery is a reminder signal only and never resolves persistent task truth.
- [Phase 10]: Safe shift close revalidates central capture truth immediately before acceptance. - Prevents stale, local, draft, conflict, discarded, or active-task state from becoming a false safe close.
- [Phase 10]: Release readiness separates repository gates, Neon staging migration evidence, and Android/provider evidence. - `pnpm check` and staging migration can pass while installed-build and provider validation remain externally blocked.
- [Phase 10]: Mobile repository construction happens after authentication. - Central lot API calls use the current authenticated session instead of a pre-auth singleton.
- [Phase 10]: Product search, reuse, and draft creation are one operational path with central duplicate prevention. - Prevents local-only product shortcuts from creating accidental duplicates before lot work.
- [Phase 10]: Mobile product confirmation no longer forces immediate lot registration. - Keeps product truth and lot lifecycle separate while preserving an explicit `Registrar lote` next step.
- [Phase 10]: Product drafts stay visible as pending central review on mobile and web. - Prevents a draft from being mistaken for an approved catalog item.
- [Phase 10]: Prepare-turn uses session-authorized POST and never accepts client-provided store, role, or capability authority. - Keeps central read hydration scoped to server-owned membership.
- [Phase 10]: Mobile blocks normal Hoje until a prepared central package is hydrated; cache fallback is explicitly labeled as not safe. - Prevents stale local data from looking like a current sales-area verdict.
- [Phase 10]: Prepare-turn cache status is separate from offline command cache status. - Keeps central-read freshness independent from local command acknowledgement.

- [Phase 08]: Only central private-store acknowledgement can produce `Evidência enviada`; local capture and connectivity are not proof. - Prevents offline evidence from being misread as centrally available.
- [Phase 08]: Evidence upload uses a separate queue from command sync. - Keeps device paths and binary material out of operational command payloads.
- [Phase 08]: Evidence invalidation preserves original metadata/history and may link a replacement instead of mutating proof. - Keeps proof corrections accountable and append-only.
- [Phase 08]: Admin cross-store evidence reads are exceptional and audited. - Maintains store isolation while allowing controlled investigation.
- [Phase 08]: Safe close requires central revalidation and the ordered physical checklist; offline or stale state can only close unsafe. - Prevents a cached view from becoming a false safety claim.
- [Phase 08]: Handoff acknowledgement and reopening add append-only records without resolving active physical work. - Preserves truthful continuity and immutable history.
- [Phase 08]: Admin membership is explicit and does not grant shift.close without a separate lead membership. - Keeps operational authority least-privilege.
- [Phase 08]: Neon migration verification captures CLI connection output only in process memory and deletes disposable branches by default. - Prevents credential leakage in logs while retaining a real migration gate.
- [Phase 08]: Audit producer vocabulary covers domain/security events only; navigation, filters, and ordinary clicks remain outside the audit trail. - Keeps audit useful for operational accountability instead of becoming noisy UI telemetry.
- [Phase 08]: Pending local audit timeline entries omit receivedAt until central acknowledgement exists. - Prevents offline physical actions from looking centrally confirmed before sync.
- [Phase 08]: Corrections, conflicts, and discards create linked audit events instead of rewriting the original operational fact. - Preserves append-only history and explains later changes.
- [Phase 08]: The web audit surface stays an investigation table/list with filters and cursor loading, not a dashboard with totals or charts. - Supports leadership explanation without inventing analytics the pilot does not yet need.
- [Phase 07]: Offline/sync support stays inside Hoje, directly below the sales-area verdict, instead of becoming a separate dashboard. - Keeps the operator focused on visible task execution while still exposing cache, queue, retry, and conflict state.
- [Phase 07]: Local-save feedback says the action is saved on this device and pending sync; it never claims central confirmation before ack. - Prevents an offline action from being misread as proof that the sales area is safe.
- [Phase 07]: Critical sync conflicts require explicit review and destructive discard requires a non-empty reason. - Prevents critical offline actions from being silently confirmed or erased.
- [Phase 07]: Network state only gates sync attempts; a command becomes synced only after a strict transport ack. - Prevents connectivity from being mistaken for physical-resolution proof.
- [Phase 07]: Offline command persistence writes a durable command before local Today task projection and keeps pending/conflict sync metadata visible until ack or explicit conflict resolution. - Prevents local saves from silently hiding critical sales-area risk.
- [Phase 07]: Today task sync metadata lives beside TodayTaskRecordSchema to avoid a contracts import cycle. — Keeps the task record extension runtime-safe while sync contracts still reuse task and markdown command schemas.
- [Phase 04]: Today tasks are created only for actionable risks: expired, critical, markdown_due, and uncertain; radar remains future attention, not a task. — Keeps the shift workflow focused on execution instead of noise.
- [Phase 04]: Sales-area expired/critical risks require compatible action plus reconference before the area can be marked safe. — Prevents a weak click from hiding expired product in the sales area.
- [Phase 04]: Withdrawal of expired product from the sales area requires reinforced confirmation, destination Retirada/perda, reconference, and photo when possible or explicit no-photo reason. — Provides strong validation without pulling full evidence storage/audit into Phase 4.
- [Phase 04]: The Hoje screen leads with sales-area safety, dominant critical states, operational sections, and direct non-blaming copy. — Aligns the UI with the core value of zero expired product in the sales area.
- [Phase 03]: Capture contracts preserve product-mode and quantity-state discriminants at the persistence boundary. — Required lot dates and explicit quantity uncertainty cannot be lost in optional fields.
- [Phase 03]: Local corrections append observations and refresh only the latest lot snapshot. — This preserves the original physical fact without claiming Phase 8 audit scope.
- [Phase 03]: Manual product lookup remains the initial mobile path and a candidate must be explicitly confirmed before lot entry. — Barcode assistance comes later and cannot create an implicit registration.
- [Phase 03]: The lot form uses the Phase 2 risk calculator for immediate operational feedback. — Risk rules stay in the pure domain package instead of being duplicated in React Native.
- [Phase 13]: Validacao owns Go/No-Go synthesis and Loja 18 rollout proof. — Keeps daily Operacao focused on sales-area safety while rollout gates stay explicit.
- [Phase 13]: Validacao references Aparelhos, Atualizacoes, and Operacao instead of duplicating their actions. — Push tests, update paths, and daily execution remain in their owning routes.
- [Phase 13]: Approved APK artifact labels remain in Atualizacoes, not Validacao. — Build truth stays separated from Loja 18 evidence review and Go/No-Go synthesis.

## Current Position

Phase: 16 (loja-18-validation-runbook-and-go/no-go-proof) - READY_TO_PLAN
Plan: Not started
Status: Ready to plan
Last activity: 2026-06-30

## Operator Next Steps

- Start `$gsd-discuss-phase 16` or `$gsd-plan-phase 16` for the Loja 18 validation runbook and Go/No-Go proof.
- Preserve the Phase 15 proof boundary: repo-local gates are green, while installed APK, provider push, camera/evidence, second-device convergence, and physical Loja 18 UAT remain external validation evidence.

## Deferred Items

Items acknowledged and deferred at milestone close on 2026-06-28:

| Category | Item | Status |
|----------|------|--------|
| debug | first-central-read-empty | resolved |
| debug | lotes-centrais-nao-persistem | fixing |
| debug | mobile-perfect-navigation-push | fixing |
| debug | mobile-web-sync | investigating |
| debug | uat-refresh-feedback | unknown |
| debug | uat-today-polish | unknown |
| quick_task | 260619-a1b-fix-medium-dependabot-alerts-for-qs-and- | missing |
| quick_task | 260619-tw4-exibir-hor-rios-de-observa-o-sem-segundo | missing |
| quick_task | 260620-ag5-fechar-gaps-uat-da-fase-4-feedback-de-at | missing |
| quick_task | 260620-ge8-tornar-os-atalhos-frequentes-e-por-categ | missing |
| quick_task | 260623-a41-adicionar-react-native-web-para-executar | missing |
| quick_task | 260623-aif-adaptar-a-autenticacao-web-para-desktop- | missing |
| quick_task | 260623-b5m-ligar-api-e-web-locais-ao-neon-staging-e | missing |
| quick_task | 260623-h7v-polir-ui-ux-mobile-do-login-e-da-tela-ho | missing |
| quick_task | 260623-r8m-configurar-o-apk-android-staging-para-us | missing |
| quick_task | 260623-rq1-corrigir-login-da-api-staging-no-cloudfl | missing |
| quick_task | 260624-atx-melhorar-web-ui-ux-com-impeccable-corrig | missing |
| quick_task | 260624-hpj-corrigir-web-em-producao-command-center- | missing |
| quick_task | 260624-inv-corrigir-validade-convite-web | missing |
| quick_task | 260626-hte-melhorar-painel-admin-command-center-par | missing |
| quick_task | 260626-i4v-enriquecer-command-center-com-causa-estr | missing |
| quick_task | 260627-hkt-prepare-staging-for-23-store-real-uat-wi | missing |
| quick_task | 260627-iar-ajustar-rbac-multi-loja-para-dono-admin- | missing |
| quick_task | 260627-mpa-adicionar-m-ltiplos-identificadores-por- | verified |
| quick_task | 260627-p0-backend-db-production-hardening | missing |
| quick_task | 260627-p1-db-production-ops-hardening | missing |
| quick_task | 260627-qcz-expor-foto-central-real-no-command-center | missing |
| uat | 09-UAT.md | complete_with_external_blockers |
| uat | 10-UAT.md | complete_with_external_blockers |
| uat | 12-UAT.md | complete_with_external_blockers |
