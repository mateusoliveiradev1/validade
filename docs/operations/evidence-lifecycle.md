# Evidence lifecycle

Evidence in Validade Zero is private operational proof. A device capture is not treated as available proof until the API receives a verified central storage acknowledgement.

## States

| State            | Meaning shown to operators | Authority                                                     |
| ---------------- | -------------------------- | ------------------------------------------------------------- |
| `waiting_upload` | `Aguardando envio`         | Local mobile queue only.                                      |
| `uploading`      | `Enviando evidência`       | Local runner is attempting intent/upload.                     |
| `failed`         | `Falha no envio`           | Local runner keeps the item for retry.                        |
| `uploaded`       | `Evidência enviada`        | API accepted the private-store `put/head` acknowledgement.    |
| `invalidated`    | `Evidência invalidada`     | Lead/admin invalidated with reason; original history remains. |
| `expired`        | `Arquivo expirado`         | Binary object aged out; metadata/audit remain.                |

The mobile app must never render `Evidência enviada` from a local file alone. Only the central upload acknowledgement returned by the API can move the queue item to `uploaded`.

## Local and fake setup

- `apps/api/wrangler.toml` defaults to `EVIDENCE_STORE_MODE=memory` for local work.
- The in-memory evidence store verifies MIME, size and SHA-256, but it is not durable across process restart.
- Local device paths stay in the mobile SQLite `evidence_uploads` table. They are not serialized into `sync_commands`, API payloads, audit metadata, or database rows.
- Real Cloudflare R2 bucket names and account identifiers must be configured outside the committed `wrangler.toml`. Do not commit credentials, object keys, photos, preview bucket names, signed links, or real store data.

## Central storage and metadata

The API creates an upload intent with a server-generated private object key and persists metadata in `evidence_assets`. Postgres stores:

- store, target and author metadata;
- MIME type, size and SHA-256;
- lifecycle timestamps;
- retention deadline;
- invalidation reason and replacement link when present.

Postgres and public contracts must not contain raw photo bytes, device-local paths, base64 payloads, signed links, or private object keys.

## Access rules

- Collaborators can attach evidence inside their own store scope.
- Authorized same-store readers can open evidence through the API path; storage internals remain hidden.
- Admin cross-store access is exceptional: the UI must show the target store, require a reason, require explicit confirmation, and write an `evidence.accessed_exceptionally` audit event.
- Denied reads must not reveal whether the object key, URL, or binary exists.

## Invalidation and replacement

Lead/admin invalidation requires a reason. Invalidating evidence does not delete its history: author, target, hash, capture time, upload time and audit events remain. A replacement evidence asset may be linked to show the corrected proof.

## Retention and expiry

Pilot retention is 90 days from central acknowledgement. R2 lifecycle policy should remove the private binary after 90 days. The API reconciliation marks eligible metadata as `expired` only after the object is no longer available in the private store.

Expiry preserves:

- actor and role snapshot;
- target and store;
- MIME, size and SHA-256;
- upload/invalidation timestamps;
- invalidation reason and replacement link;
- audit events.

## Recovery and inspection

For a stuck upload:

1. Check the mobile `evidence_uploads` row state and `last_error`.
2. Confirm the local file still matches queued MIME, size and SHA-256.
3. Retry through the evidence upload runner; the intent idempotency key is `evidence:<localEvidenceId>`.
4. If the API has already acknowledged the asset, replay returns the same asset metadata and the mobile queue can safely apply the ack.
5. If evidence was invalidated, capture a replacement and link it during invalidation instead of editing the original asset.

For a privacy audit:

1. Inspect `sync_commands` payloads for absence of local paths and binary material.
2. Inspect `evidence_assets` for metadata-only columns.
3. Inspect audit events for lifecycle actions and exceptional access reasons.
4. Confirm API responses return metadata only unless an authorized streaming endpoint is intentionally used.
