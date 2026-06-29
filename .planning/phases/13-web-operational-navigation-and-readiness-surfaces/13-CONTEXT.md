# Phase 13: Web Operational Navigation and Readiness Surfaces - Context

**Gathered:** 2026-06-28T22:20:27.0893976-03:00
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 13 reorganizes the web leadership surface so daily store operation is separate from pilot diagnostics. The existing Command Center projection remains the shared truth source, but the web experience must split it into durable routes: Operacao, Aparelhos, Atualizacoes, and Validacao. This phase should not invent new operational facts or weaken the Phase 12 truth boundaries; it changes how those facts are navigated, weighted, and acted on by leadership.

</domain>

<decisions>
## Implementation Decisions

### Primeira leitura do Command Center
- **D-01:** The daily first screen is Operacao first. It must answer "area de venda segura agora?" before device, build, UAT, or rollout diagnostics.
- **D-02:** Device readiness remains permanently visible in the daily shell as a short header strip with counts for Aptos, Atencao, and Bloqueados plus a route/link to Aparelhos.
- **D-03:** A device becomes a strong daily-operation blocker only when it affects daily execution, such as missing central read, critical sync stuck, or invalid store/user authorization.
- **D-04:** UAT, build/update details, and detailed push-test history leave the daily primary flow. They belong in dedicated routes.

### Navegacao web
- **D-05:** The web shell should use durable side-menu routes, not tabs inside Command Center and not one long anchored page.
- **D-06:** The main daily route should be named `Operacao`, replacing the old mental model where everything lived under Command Center.
- **D-07:** The side-menu order is `Operacao -> Aparelhos -> Atualizacoes -> Validacao`, followed by existing access/audit surfaces where allowed.
- **D-08:** Routing stays fail-closed by capability. New routes must not relax RBAC; users without the required store-scoped capability see the route disabled or are routed to their first allowed surface.

### Aparelhos e atualizacoes
- **D-09:** `Aparelhos` leads with a readiness-ordered device list: Bloqueado, Atencao, Apto. Each device shows cause and next action.
- **D-10:** `Aparelhos` may show build compatibility as a summary, but artifact/build/update instructions belong to `Atualizacoes`.
- **D-11:** `Atualizacoes` owns approved build truth, installed versions by device, stale/incompatible devices, and the safe update path.
- **D-12:** APK link/QR appears only when it is public-safe and explicitly configured. If the update path would expose a token, private URL, build URL, or secret, the route must show manual instructions plus pending/blocked status instead.
- **D-13:** The safe push-test action lives in `Aparelhos` because it is per-device. `Validacao` references the result and next step instead of duplicating the action.

### Validacao / Go-No-Go
- **D-14:** `Validacao` is a rollout validation room, not the daily operating surface.
- **D-15:** The route shows the Loja 18 checklist, external gates, pass/blocked/external-blocked status, sanitized evidence references, and next actions.
- **D-16:** Go/No-Go is an explicit verdict: `Go`, `No-Go`, or `Aguardando prova externa`, always backed by the gates that explain the result.
- **D-17:** Evidence on this route must be public-safe and traceable: safe labels, status, timestamps, masked device references, and safe evidence reference labels only. No real product names, real photos, tokens, private URLs, raw device ids, or build URLs.
- **D-18:** `Validacao` references actions in other routes instead of duplicating them. Push is resolved in `Aparelhos`; update/build path is resolved in `Atualizacoes`; validation displays the result and next step.

### the agent's Discretion
- The planner may choose component boundaries, route file organization, and projection adapters that best fit the existing React shell, as long as the user-facing route split and truth boundaries above hold.
- The planner may decide whether to keep the `CommandCenter` component as a shared projection container or extract smaller route-specific components first.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and milestone truth
- `.planning/ROADMAP.md` - Phase 13 goal, WEB-01..WEB-05 mapping, and success criteria for Operacao, Aparelhos, Atualizacoes, and Validacao.
- `.planning/REQUIREMENTS.md` - v1.1 requirements, especially WEB-01 through WEB-05 and the public-safe boundaries for rollout proof.
- `.planning/PROJECT.md` - milestone context and key decisions: devices are permanent operational truth, UAT is validation, and APK update truth must be explicit.
- `.planning/milestones/v1.0-MILESTONE-AUDIT.md` - current external blockers: installed Android, provider push, camera/device proof, and physical Loja 18 UAT remain external proof gates.

### Existing contracts and services
- `packages/contracts/src/command-center.ts` - single projection carrying operational state, device readiness, build compatibility, pilot UAT, and pilot blockers.
- `apps/api/src/command-center.ts` - service projection assembly, fail-closed behavior, approved pilot build defaults, UAT checklist, and blocker synthesis.

### Existing web surfaces
- `apps/web/src/command-center/CommandCenter.tsx` - current all-in-one rendering that must be split or refactored into route-specific surfaces.
- `apps/web/src/command-center/command-center-client.ts` - existing web client for `/command-center` and `/pilot/push-tests`.
- `apps/web/src/shell/AppShell.tsx` - current side navigation, route typing, mobile sheet navigation, and route-disabled behavior.
- `apps/web/src/App.tsx` - route selection, capability checks, first allowed route fallback, and Command Center wiring.
- `apps/web/e2e/fixtures/v1-readiness.ts` - public-safe fixture shape for devices, UAT, pilot blockers, and sanitized web proof.
- `apps/web/e2e/v1-readiness.spec.ts` - current web E2E expectations that will need updating after route split.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CommandCenterProjection` already contains the facts needed for all four web routes: operational verdict/funnel, central snapshot, devices, UAT checklist, and pilot blockers.
- `CommandCenter` already has render helpers for device readiness, push-test timeline, UAT, blockers, central snapshot, and operational insight. These can be extracted into route-specific components instead of rebuilt.
- `AppShell` already supports side navigation, route disabled states, a mobile navigation sheet, privacy/logout actions, and first allowed route fallback.
- `createFetchCommandCenterClient` already reads `/command-center` and sends `/pilot/push-tests`; Phase 13 can reuse it while reshaping presentation.

### Established Patterns
- Web routes are store-scoped and capability-gated from the session object.
- UI copy is operational, direct, and public-safe; web fixtures use fictitious labels and must not leak real operational data.
- The product favors fail-closed behavior: missing central truth or missing capability must not look like a safe state.
- Push test is diagnostic only; it never resolves tasks, closes shifts, or proves the sales area safe.

### Integration Points
- Extend `AppRoute` in `apps/web/src/shell/AppShell.tsx`.
- Update route selection and fallback in `apps/web/src/App.tsx`.
- Split or adapt `apps/web/src/command-center/CommandCenter.tsx` into Operacao, Aparelhos, Atualizacoes, and Validacao views.
- Keep `/command-center` as the first data source unless planning identifies a strong reason for route-specific read models.
- Update web component tests and Playwright readiness specs so daily Operacao no longer expects UAT/build/push details in the first flow.

</code_context>

<specifics>
## Specific Ideas

- The daily header strip should read like a compact status: Aptos / Atencao / Bloqueados, with a clear link to `Aparelhos`.
- `Atualizacoes` should be honest about manual APK distribution: if no safe QR/link exists, the page should say what is missing instead of pretending an automatic update path exists.
- `Validacao` should feel like leadership's rollout proof room, not another daily dashboard.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 13-Web Operational Navigation and Readiness Surfaces*
*Context gathered: 2026-06-28T22:20:27.0893976-03:00*
