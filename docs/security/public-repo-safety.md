# Public Repo Safety

Validade Zero is planned as a public repository. The repository must be useful for development without containing production secrets, real operational data, or real evidence assets.

## Zero Tolerance Content

Do not commit:

- Production secrets, API keys, tokens, private keys, credentials, or privileged database URLs.
- Real store, customer, collaborator, supplier, product, lot, report, sales, stock, or operational data.
- Real evidence photos, shelf photos, label photos, uploaded images, exports, spreadsheets, or private reports.
- Real CPF/CNPJ examples unless the line is explicitly marked as fictitious example data.
- Provider dashboard exports or generated credentials.
- Mobile signing credentials, service account files, or app store credentials.

Allowed examples must be visibly fake and use markers such as `FICTICIO`, `EXEMPLO`, `example`, `placeholder`, `localhost`, or `00000000`.

## Environment Files

- Use `.env.example` as the only committed env contract.
- Keep local `.env`, `.env.*`, `.dev.vars`, and `*.local` files untracked.
- Example values must be fake and non-operational.
- Mobile and web apps must not receive privileged database credentials.

## Evidence And Media

Real evidence photos are forbidden in git. Evidence examples must be fake object keys, placeholders, or generated sample assets that cannot be mistaken for real operations.

The `.gitignore` blocks common media file extensions and evidence/upload directories. Future phases that need evidence should store binaries outside Postgres and commit only safe code plus fake examples.

## Fixtures

Use `@validade-zero/test-utils` fixtures for tests. Future fixtures must:

- Stay in Portuguese-BR where operationally useful.
- Include `FICTICIO` or `EXEMPLO` markers in operational strings.
- Avoid real names of stores, collaborators, suppliers, customers, products, or reports.
- Avoid real images and private exports.

## Automated Guards

- `pnpm security:env` validates `.env.example`.
- `pnpm security:secrets` scans code, docs, workflows, root files, and `.env.example`.
- `pnpm security:data` scans code, docs, and README for secret-like or real-data-looking content.
- `pnpm security` runs the full public-repo safety baseline.
- `pnpm check` runs the full local readiness baseline.

## Review Rule

Any suspected production secret, real operational data, or real evidence asset is treated as a release blocker until removed and investigated. If a real secret was committed, rotate it outside the repo before considering the issue closed.

