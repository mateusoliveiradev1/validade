# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 - Repository Complete

**Shipped:** 2026-06-28
**Phases:** 12 | **Plans:** 54 | **Tasks:** 107

### What Was Built

- A mobile-first operational app spine for product/lot capture, physical presence, Hoje tasks, rebaixa, terminal resolution, offline queue, audit, evidence control, RBAC and shift close.
- A central-truth pilot flow where product creation/reuse, lot lifecycle, task projection, resolved history, second-device convergence and Command Center views share the same operational facts.
- A leadership surface for device readiness, push-test diagnostics, release metadata, guided Loja 18 UAT, blocker synthesis and next-action clarity.
- A verification record with all 37 v1 requirements traced through requirements, summaries and verification artifacts.

### What Worked

- Treating "área de venda segura?" as the first product question kept the work grounded in operational truth.
- The later phases corrected the most important risk: local/mobile success was not allowed to masquerade as central, second-device or provider truth.
- External blockers were recorded as first-class outcomes instead of being hidden behind passing repo gates.
- The monorepo/provider-adapter approach kept the pilot zero-cost-friendly while preserving real seams for Neon, Cloudflare, Expo push and local fakeable tests.

### What Was Inefficient

- Several quick/debug artifacts remained open as workflow metadata even after their product work had been folded into later phases.
- Android/provider/camera proof was chased late, after repository readiness was already strong; the next milestone should put live-device proof near the front.
- Some early PROJECT/ROADMAP narrative stayed stale until milestone close, so future phase closures should update project truth sooner.

### Patterns Established

- "Repository complete" and "physical rollout ready" are different states.
- Push acceptance, sync transport and central business resolution need separate labels.
- Offline actions must stay visible as local/pending/conflict until acknowledged or explicitly discarded.
- Command Center should explain blockers, causes and next actions, not only show passive dashboard metrics.

### Key Lessons

1. Device/provider/camera evidence should be planned as concrete gates, not cleanup at the end of a milestone.
2. A second-device truth test is a stronger product check than a single happy-path mobile demo.
3. UAT can close honestly with external blockers if every blocker has owner-visible status, cause and next action.
4. Planning artifacts should distinguish archival truth from active next-step guidance immediately after milestone close.

### Cost Observations

- Model mix: not measured in repo artifacts.
- Sessions: not measured in repo artifacts.
- Notable: sequential inline execution reduced coordination overhead for late milestone audit and closeout.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | Not measured | 12 | Product moved from foundation to repository-complete closed-pilot spine with explicit external rollout blockers. |

### Cumulative Quality

| Milestone | Requirements | Plans | External Proof State |
|-----------|--------------|-------|----------------------|
| v1.0 | 37/37 traced | 54/54 complete | Android/provider/camera/physical Loja 18 proof still external. |

### Top Lessons

1. Do not treat a green repository as a green store rollout.
2. Keep every operational state tied to the truth source that actually proved it.
3. Make blocker causes and next actions visible to leadership before asking for pilot confidence.
