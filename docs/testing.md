# Testing And Proof Boundaries

## Phase 16 Loja 18 Validation

Phase 16 repository gates prove code behavior and sanitized artifacts only. They verify contracts, API derivation, web `Validacao`, mobile real-flow boundaries, Playwright navigation, and public-safe evidence scanning.

They do not prove physical rollout readiness by themselves.

External proof is still required for:

- Approved APK installed on real Loja 18 Android devices.
- Remote provider push received/opened on an approved device.
- Camera evidence or accepted no-photo fallback on the approved device path.
- Second approved mobile device reading the same central facts.
- Safe shift close after central revalidation and physical checklist.
- Physical Loja 18 UAT in the aisle.

Public records for those checks must use only sanitized state, timestamp, owner route, masked device, generic role, and bounded evidence labels. Do not store real product names, readable lot identifiers, photos, private links, raw device identifiers, contact data, or personal names in repository artifacts.

When repository gates are green but external proof is missing, the honest status remains `Aguardando prova externa` or `No-Go`, never physical Go.
