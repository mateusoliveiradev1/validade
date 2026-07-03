---
target: apps/web/src/gpp/GppControlRoute.tsx
total_score: 26
p0_count: 0
p1_count: 1
timestamp: 2026-07-03T00-19-25Z
slug: apps-web-src-gpp-gppcontrolroute-tsx
---

# Impeccable Critique: Controle GPP Web

## Design Health Score

| #         | Heuristic                       |     Score | Key Issue                                                                                               |
| --------- | ------------------------------- | --------: | ------------------------------------------------------------------------------------------------------- |
| 1         | Visibility of System Status     |         3 | Central freshness and action feedback are visible, but the purchase queue mixed active and closed work. |
| 2         | Match System / Real World       |         2 | A queue that keeps closed purchases reads like a history list, not an operational queue.                |
| 3         | User Control and Freedom        |         3 | Filters and exits exist; purchase history needed a clearer path.                                        |
| 4         | Consistency and Standards       |         3 | Components are consistent; information architecture drifted in Compras internas.                        |
| 5         | Error Prevention                |         3 | Stale actions are now guarded, but queue growth created false work.                                     |
| 6         | Recognition Rather Than Recall  |         3 | Main actions are visible; users still needed to infer where closed purchases belonged.                  |
| 7         | Flexibility and Efficiency      |         2 | Search and filters help, but active/completed separation was not efficient.                             |
| 8         | Aesthetic and Minimalist Design |         2 | Closed rows consumed the main work surface and increased scroll noise, especially on mobile.            |
| 9         | Error Recovery                  |         3 | Conflict messages are operational and refresh the queue.                                                |
| 10        | Help and Documentation          |         2 | Empty and closed states needed clearer task-focused guidance.                                           |
| **Total** |                                 | **26/40** | **Acceptable: solid foundation, but active queue IA needed polish.**                                    |

## Anti-Patterns Verdict

LLM assessment: The surface does not look like generic marketing AI output; it uses a restrained product UI system. The failure was product semantics: Compras internas showed zero pending work while still rendering eight completed rows. That makes the page feel busy while saying there is nothing to do.

Deterministic scan: `node .agents/skills/impeccable/scripts/detect.mjs --json apps/web/src` returned `[]`.

Browser evidence: Desktop and mobile screenshots showed the same issue. The active purchase tab had no action buttons and no pending count, but still required scrolling through completed purchases and Details buttons.

## Priority Issues

**[P1] Active queue retained completed purchase requests**

Why it matters: Operators need the queue to answer "what still needs action?". Closed purchases staying in the queue create false work and infinite growth.

Fix: Filter Compras internas to `solicitado` requests only. Move closed requests to Historico and add a direct filtered link from the empty/summary state.

Suggested command: `$impeccable polish`

**[P2] Closed-state copy appeared in the wrong surface**

Why it matters: The copy was accurate but located in the active queue, where it competed with real work.

Fix: Keep completion copy in Historico and use the queue only for active next actions plus a small summary.

Suggested command: `$impeccable clarify`

**[P2] Mobile purchase queue became long-scroll archive**

Why it matters: The mobile operator sees one column, so every closed row pushes the next real task farther away.

Fix: Same active-only filter, with a compact empty state and one history action.

Suggested command: `$impeccable adapt`

## Persona Red Flags

Alex, power user: Seeing eight closed purchases in a zero-pending queue makes the screen feel slow and untrustworthy. Alex cannot scan for actionable work quickly.

Jordan, first-timer: "0 pendentes" plus many rows creates a contradiction. Jordan will not know whether the work is complete or still needs review.

Casey, distracted mobile user: On a phone, closed rows become a scroll wall. The real next action is not protected from archive noise.

## Positive Findings

- The design system is restrained and consistent with the product register.
- Buttons, sheets, badges, and filters use familiar components.
- Conflict copy is now operational and avoids exposing raw 409/server language.

## Polish Applied

- Compras internas now renders only active pending purchases.
- Closed purchases are counted in a compact summary and accessed through Historico filtered to Compras.
- Empty purchase state now explains that closed requests left the active queue.
- Tests cover the active queue rule and purchase summary.
