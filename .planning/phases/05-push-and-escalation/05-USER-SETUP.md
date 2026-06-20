# Phase 05: User Setup Required

**Generated:** 2026-06-20
**Phase:** 05-push-and-escalation
**Status:** Incomplete

Remote native push delivery needs setup outside this local repository. The app now has the dependency, config plugin, local adapter seam, fake test channel, and repository state, but native delivery still depends on a compatible Expo development build or supported simulator/device.

## Environment Variables

No secret environment variables are required for the local tests delivered in Plan 05-02.

## Account Setup

- [ ] **Prepare native push test environment**
  - Use: Expo development build or another supported native runtime for `expo-notifications`.
  - Skip if: You only need the local component/provider tests for this phase.

## Dashboard Configuration

- [ ] **Confirm Expo project identity before remote token tests**
  - Location: Expo/EAS project configuration.
  - Required value: valid Expo project id for `getExpoPushTokenAsync`.
  - Notes: The repository uses fake token fixtures only; never paste real device tokens into tests, docs, or committed files.

## Verification

After native setup exists, verify with:

```powershell
pnpm.cmd --filter @validade-zero/mobile test -- push-channel
pnpm.cmd --filter @validade-zero/mobile typecheck
```

Expected results:
- Local tests pass without real device tokens.
- Native runtime can request permission only from the explicit UI action, not at app launch.
- Remote delivery is still not treated as proof of physical task resolution.

---

**Once all items complete:** Mark status as "Complete" at top of file.
