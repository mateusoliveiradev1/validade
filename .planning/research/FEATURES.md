# Feature Research: Validade Zero

## Product Shape

Validade Zero is not a generic stock system. It is a **risk-removal workflow** for products that could expire in the sales area. The feature set should optimize for daily action, physical verification, accountability, and escalation.

## Table Stakes

### Product and Lot Control

- Register products by category, supplier, code/GTIN when available, and operational rule profile.
- Register lots with product, quantity, validity date or quality window, received date, and current location.
- Distinguish formal validity products from FLV fresh products that use inspection/quality rules.
- Allow camera/barcode-assisted entry, but never require scanning as the only path.

### Locations

- Track area of sale, stock, cold room, promotional island, and segregated withdrawal/loss area.
- Record movement between locations.
- Generate checklists by location so collaborators can walk the store naturally.

### Alerts and Tasks

- Generate tasks from validity/risk rules.
- Support 60-day radar, 15-day markdown request, critical near-expiry alerts, expired withdrawal tasks, and configurable category overrides.
- Require task ownership, due time, status, and resolution.
- Escalate unresolved critical tasks to leadership.

### Push and Operational Attention

- Strong push reminders for collaborators.
- Repeated reminders until task resolution.
- In-app inbox as source of truth, because OS push can be delayed, muted, or missed.
- Shift close state: area safe vs pending risk.

### Markdown/Rebaixa Workflow

- Request markdown.
- Track approval.
- Track price label/application.
- Confirm on shelf.
- Attach optional photo evidence.

### Physical Verification Without Sales Data

- Mark item as still present, moved, sold out/probably gone, withdrawn, loss, or not found.
- Use last_seen_at, last_seen_by, and last_seen_quantity as risk inputs.
- Treat unverified lots as uncertain, not safe.

### Evidence and Audit

- Record who did what, when, where, and from which device/session.
- Store optional photos in R2.
- Keep append-only audit trail for critical actions.

### Roles

- Collaborator: sees own and sector tasks, resolves checks.
- Lead/encarregado: assigns, confirms, escalates, audits.
- Admin: manages products, categories, rules, stores, users.

### Offline

- Allow task viewing and action recording during poor connection.
- Queue commands locally and sync idempotently.
- Surface sync conflicts clearly.

## Differentiators

- "Area de venda segura?" as the daily operating center.
- Risk engine that persists until physical confirmation.
- Push + escalation as a core workflow, not a notification afterthought.
- Store-walk checklist by location.
- Evidence-backed markdown and withdrawal confirmation.
- CI/E2E database branching to keep quality high from the start.

## Anti-features

- Exact inventory or sales forecasting in v1.
- Automatic ERP price change in v1.
- Scanner-only workflow.
- Big passive dashboards as the primary mobile screen.
- Paid stock imagery.
- App-store-only distribution during zero-cost pilot.

## Research Notes

- Fresh produce may not have declared validity dates; quality and inspection rules must be modeled separately from formal expiration.
- Eggs and packaged items require category-specific validity control.
- Barcode/GTIN often identifies product, not necessarily lot and validity; GS1 DataMatrix/QR may carry more data when suppliers support it.
- Selling expired products is a legal and reputational risk; the app should optimize for prevention and audit evidence.

## Sources

- ANVISA/RDC 727/2022: https://www.in.gov.br/en/web/dou/-/resolucao-rdc-n-727-de-1-de-julho-de-2022-413249279
- MAPA eggs context: https://www.gov.br/agricultura/pt-br/assuntos/noticias/2025/portaria-sobre-ovos-de-consumo-representa-avanco-e-seguranca-para-o-setor-produtivo
- MAPA revocation note: https://www.gov.br/agricultura/pt-br/assuntos/noticias/2025/mapa-revoga-artigo-de-portaria-sobre-requisitos-para-granjas-avicolas-e-beneficiamento-de-ovos-2
- Procon-SP/APAS validity guidance: https://www.procon.sp.gov.br/wp-content/uploads/2026/02/CartilhaOrientativa-Final-5.pdf
- GS1 DataMatrix: https://www.gs1br.org/gs1-datamatrix

