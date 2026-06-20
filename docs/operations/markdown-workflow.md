# Markdown/Rebaixa Workflow

This note describes what Phase 6 delivers for the pilot and what it deliberately does not claim yet.

## What The App Tracks

Validade Zero tracks markdown/rebaixa as a local workflow per lot:

1. Request markdown for an eligible lot or an early exception.
2. Leadership approves or rejects the request.
3. The shift team records that the price label was applied.
4. The shift team confirms the label in the sales area.

Only one active markdown workflow can exist for a lot at a time. A rejected workflow closes with a reason and stops charging follow-up tasks. An approved workflow stays open until application and sales-area confirmation are physically recorded.

## Eligibility And Exceptions

Rule-window requests use `rule_window` when the lot is in the configured markdown window and physical presence is fresh.

Early exceptions require both:

- a reason: excess stock, quality issue, package damage, operational guidance, or other;
- a non-empty justification.

Presence is a gate. If the lot is missing, stale, not found, probably sold out, or otherwise uncertain, the app routes the collaborator to physical observation before allowing a markdown request.

## Delays, Alerts, And Acknowledgement

Approval, application, and shelf confirmation each produce a visible Hoje task. Delayed stages stay visible with explicit text:

- `Aprovacao de rebaixa atrasada`
- `Aplicacao de rebaixa atrasada`
- `Conferencia da etiqueta atrasada`

Push reminders and escalation can charge the responsible person and leadership, but they never resolve a stage. Leadership acknowledgement records receipt of the charge only. The task and workflow remain active until the physical stage is completed in the app.

## Evidence Scope In Phase 6

Application and shelf confirmation accept metadata only:

- `photo_recorded_placeholder`
- `no_photo_reason`

Phase 6 does not store real image files, local photo URIs, base64 image data, R2 object keys, or private evidence assets. Camera and native evidence smoke remain manual until storage and audit hardening are implemented later.

## What Phase 6 Does Not Do

Phase 6 does not:

- change ERP or point-of-sale prices;
- integrate with sales, stock, pricing, or internal supermarket APIs;
- upload photos to R2 or any object storage;
- provide formal RBAC or store-level audit trails;
- provide offline sync across devices;
- prove native camera delivery in automated Maestro smoke.

The workflow is local-first and operational: it makes the markdown risk visible, blocks stage skipping, and records structured local metadata so the pilot can validate behavior before deeper integrations are added.

## Pilot Operating Guidance

- Treat Hoje as the source of truth for open markdown stages.
- Do not consider a push notification or acknowledgement as proof of execution.
- For rejected markdown, review the rejection reason before opening a new request.
- For applied labels, confirm the shelf state in the sales area before treating the stage as closed.
- Use only fictitious data in demos, tests, screenshots, and public repository artifacts.
