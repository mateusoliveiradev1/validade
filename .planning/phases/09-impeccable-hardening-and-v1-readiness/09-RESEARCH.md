# Phase 09 Research: Impeccable Hardening and v1 Readiness

**Researched:** 2026-06-22
**Mode:** release-readiness planning

## Summary

Phase 09 is not a cosmetic pass. It is the closed-pilot productization pass for
Validade Zero: real authentication, invite-first onboarding, privacy/LGPD
surfaces, final mobile Android shell, operational web Command Center, complete
states, accessibility, security, performance, E2E, APK readiness, and release
documentation.

The current codebase has strong operational foundations from Phases 04-08:
Hoje-first task execution, push/escalation semantics, markdown workflow,
offline/sync truthfulness, evidence queue, audit, role/store authorization, and
truthful shift close. Phase 09 should wrap those capabilities in product-grade
auth, shell, state coverage, visual identity, and release gates without
weakening the semantic rules already implemented.

## Codebase Findings

- Mobile currently enters `CaptureApp` directly from `apps/mobile/App.tsx`; there
  is no splash/session/auth gate before operational surfaces.
- Mobile already has useful local primitives in
  `apps/mobile/src/capture/capture-ui.tsx`, tokens in
  `apps/mobile/src/capture/capture-theme.ts`, and operational copy in
  `apps/mobile/src/capture/today-copy.ts`.
- Mobile still contains pilot labels such as `Colaborador local` and
  `Lideranca local`; Phase 09 must replace these with server/session resolved
  actor/store/role context where actions are security-sensitive.
- Web currently starts as a smoke/admin page. `CurrentScope`,
  `MembershipAdministration`, and `AuditWorkbench` are useful building blocks,
  but `apps/web/src/App.tsx` still says "Smoke web ficticio" and lacks a product
  shell, auth screens, privacy, Command Center, and release-ready states.
- API authorization already has a replaceable `AuthProvider`, JWT verifier seam,
  membership repository, and sanitized denial tests. Phase 09 can extend this
  instead of replacing it.
- Database has Phase 08 repositories and migrations for memberships, audit,
  evidence, and shift close. Auth/session/invite tables should build beside
  these records with hashed secrets/tokens and append-only audit where relevant.

## External Findings

### LGPD and ANPD

- ANPD describes a titular as the natural person to whom processed data relates,
  and the controlador as the treatment agent responsible for key decisions and
  responding to data subject rights.
- ANPD explains the encarregado as the communication point among treatment
  agents, titulares, and ANPD. The Privacy Center therefore needs a clear contact
  route/channel, not only static policy text.
- ANPD FAQ, modified 2026-06-03, reinforces that LGPD applies to personal data
  treatment by public or private legal persons, and that personal data includes
  information related to an identified or identifiable natural person.
- Planning implication: privacy copy must plainly name the operational data used
  by the app: identity, store, role, physical actions, lots, tasks, evidence,
  timestamps, audit events, sync state, and device permissions. The app should
  provide a data-rights request path without pretending to be full legal advice.

Sources:
- https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1
- https://www.gov.br/anpd/pt-br/acesso-a-informacao/perguntas-frequentes

### Accessibility

- WCAG 2.2 is a W3C Recommendation dated 2024-12-12. It covers perceivable,
  operable, understandable, and robust criteria across desktop and mobile.
- Planning implication: Phase 09 should gate contrast, focus visibility, target
  sizes, labels/name-role-value, status messages, keyboard support, reduced
  motion, and accessible authentication.

Source:
- https://www.w3.org/TR/WCAG22/

### Expo Android Internal Distribution

- Expo internal distribution documents that `"distribution": "internal"` changes
  Android default behavior to generate an APK rather than an AAB, unless a custom
  Gradle command overrides this.
- Expo APK documentation says EAS Build defaults to AAB for Play Store
  distribution; direct Android device/emulator install requires an APK via
  `distribution: "internal"`, `android.buildType: "apk"`, `developmentClient`,
  or an APK-producing Gradle command.
- Internal distribution build URLs may be accessible to anyone with the URL
  unless access is restricted in project settings.
- Planning implication: v1 readiness needs `eas.json` APK/internal profile,
  app icon/splash assets, install/run documentation, and a reminder not to treat
  build URLs as public release artifacts.

Sources:
- https://docs.expo.dev/build/internal-distribution/
- https://docs.expo.dev/build-reference/apk/

### Neon Auth

- Neon Auth with Better Auth is still marked Beta in the current docs. It stores
  users, sessions, and auth configuration in the Neon database and branches auth
  state with database branches.
- The docs list Better Auth support, branch-aware auth, and Free-plan MAU
  coverage, but also note current limitations such as AWS-region availability
  and no support for projects with IP Allow or Private Networking.
- Planning implication: keep auth behind the existing `AuthProvider` adapter. A
  pilot-ready first-party invite/password/session adapter can ship the closed
  pilot without irreversible coupling; a Neon Auth adapter can be added or
  swapped later if product/provider constraints fit.

Source:
- https://neon.com/docs/auth/overview

## Planning Implications

- Use one dependency root plan for auth/session/invites/privacy contracts. Mobile
  and web product shells can then run in parallel.
- Preserve all Phase 04-08 semantic truth rules. UI polish must never relabel a
  local save as central sync, pending evidence as storage proof, or an unsafe
  shift close as safe.
- Treat UI-04 as a release contract: plans must include Impeccable shape/craft,
  critique/polish/audit/harden evidence, not just component edits.
- Keep generated assets repo-safe and deterministic. No real store photos, paid
  stock, sensitive evidence, private IDs, build tokens, signed URLs, or Expo
  build URLs in tracked files.
- Use `pnpm.cmd check` as the broad local gate, plus focused tests for auth,
  mobile, web, E2E, security, performance, and asset/release checks.

