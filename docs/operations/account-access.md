# Account Access Runbook

## Closed Pilot Access

Only an authorized administrator creates access. The admin chooses the person identifier, displayed name, store, role, and expiry in the invite screen. There is no public signup.

The recipient validates the invite, sees the assigned store and role, creates a password, and receives a server-owned session. The client never grants itself a role, store, or capability.

## Recovery And Session

- Recovery requests use neutral feedback and do not confirm whether an account exists.
- An expired session requires login again; local actions remain pending until their normal sync acknowledgement.
- Logout clears the client path, but a server session remains subject to its own expiry and revocation policy.
- A blocked, revoked, or recovery-pending account cannot open operational capabilities.

## Revocation And Incident Response

1. In the membership screen, verify person, store, current role, and capability impact.
2. Provide a non-empty revocation reason and confirm the action.
3. Revocation is honored on the next server session refresh; clients must not self-authorize while waiting.
4. Review the append-only audit history for the person and store.
5. For suspected account compromise, revoke the membership, invalidate active provider/session credentials through the configured operation, and document the corrective event without adding credentials to the repository.

## Role Scope

- Collaborator: physical execution and evidence inside the active store scope.
- Leadership: operational task work, local audit, evidence invalidation, and shift close only when the active store membership permits it.
- Administration: membership and invitation governance. Administration alone does not grant shift close without an explicit leadership membership in the same store.
