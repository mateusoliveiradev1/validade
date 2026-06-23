# Phase 09 Pilot UAT

Run these scenarios with fictional pilot data first. Stop the release decision if an expected truth label is missing or misleading.

| Scenario | Expected result | Evidence |
|---|---|---|
| Open mobile without session | Login appears; Hoje does not appear before session validation. | `auth-flow` and `mobile-release-journeys` tests; manual APK check. |
| Activate a valid invitation | Store and role are shown before password activation; access opens only after success. | API/auth tests; manual APK check. |
| Use an invalid or expired invitation | No account detail is disclosed; the next action asks for a new invitation. | Auth tests. |
| Open Privacy Center | All seven sections are readable, and a rights request route is present. | UI scanner, web/mobile privacy tests, manual check. |
| Resolve a critical sales-area task offline | The action says it is saved on the device and still pending central sync. | Offline/sync tests; manual device check. |
| Attach evidence | Pending upload is not described as centrally available; central acknowledgement is explicit. | Evidence tests; manual device check. |
| Close a risky shift | Safe close is blocked; unsafe handoff asks for reason, owner, deadline, and note. | Shift-close tests; manual device check. |
| Open Command Center as leadership | The first question is safety; the funnel order is verdict, lots, tasks, markdowns, evidence, sync, closes, history. | Playwright and Command Center tests. |
| Open Command Center without central task data | It says review is required, never that the area is safe. | API and web Command Center tests. |
| Create and revoke an invite as admin | Person, store, role, expiry, issuer, and consequence are visible; no public signup is offered. | API/web tests and Playwright journey. |
| Revoke a membership | A non-empty reason is required and the action does not resolve open tasks. | API/web tests and Playwright journey. |
| Try another store or forged role | Server returns a generic access denial without resource details. | API authorization tests. |

## Acceptance Rule

The pilot owner can accept only when every applicable scenario passes and the Android device/APK blockers in `09-VALIDATION.md` are resolved. A visual approximation, local fixture, or push notification alone is not proof of physical execution or central confirmation.
