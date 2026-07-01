# Phase 16 UAT - Loja 18 Validation Runbook

Status: repository-ready with explicit external proof gates
Audience: Loja 18 operator, store lead, and pilot reviewer

## Purpose

This runbook guides the real Loja 18 validation path without storing private store evidence in the repository. Mobile remains the place where physical work happens. Web `Validacao` consolidates central proof, blocked states, external proof gaps, and the final Go/No-Go decision.

Repository artifacts may record only sanitized state, timestamp, owner route, masked device, generic role, and bounded evidence labels.

## Preconditions

- Approved APK/build is known by `Atualizacoes`.
- At least one authorized Loja 18 mobile device can prepare the turn.
- The operator has access to the real store flow for product, lot, task resolution, evidence/fallback, and shift close.
- Leadership can open web `Validacao`, `Aparelhos`, `Atualizacoes`, and `Operacao`.
- No private store evidence is copied into repository files.

## Mandatory Sequence

| Order | Step ID | UI label | Owner | What happens | Public-safe evidence label |
|---:|---|---|---|---|---|
| 1 | `prepare_turn` | Turno preparado | Mobile physical flow / Operacao | Prepare the real Loja 18 turn on the approved APK so central facts can be read. | `Leitura central preparada` |
| 2 | `product_real_input` | Produto real usado no teste | Operacao | Use a real Loja 18 product in the operational flow. Do not write the product name in public artifacts. | `Produto real confirmado` |
| 3 | `lot_registration` | Lote real registrado | Operacao | Register the real lot for the chosen product. Do not write a readable lot identifier in public artifacts. | `Lote real confirmado` |
| 4 | `terminal_resolution` | Resolucao terminal registrada | Operacao / physical execution | Resolve the real terminal task with the compatible action and central confirmation. | `Resolucao terminal confirmada` |
| 5 | `second_device_convergence` | Segundo aparelho conferiu os mesmos fatos | Aparelhos | Prepare turn on a second approved mobile device and confirm it reads the same central facts. | `Aparelho Loja 18 #2` |
| 6 | `command_center_consistency` | Command Center consistente | Operacao / Validacao | Compare Hoje, history, and Command Center after sync so the web proof matches central truth. | `Painel atualizado com leitura central` |
| 7 | `safe_push_test` | Push seguro recebido no aparelho aprovado | Aparelhos | Run the safe push test on an approved device and record only sanitized provider/app state. | `Push seguro confirmado` |
| 8 | `camera_evidence_or_fallback` | Camera ou fallback operacional comprovado | Aparelhos / Operacao | Record camera evidence or an accepted no-photo reason on the approved device. | `Camera indisponivel com fallback registrado` |
| 9 | `shift_close` | Fechamento seguro do turno | Mobile physical flow / Operacao | Close the turn only after central revalidation and the physical checklist pass. | `Fechamento seguro confirmado` |

## Owner Routes And Actions

- `Aparelhos`: device authorization, masked device identity, push proof, camera readiness, and second-device proof.
- `Atualizacoes`: approved APK/build, installed version/build readiness, and build blockers.
- `Operacao`: product, lot, task projection, terminal resolution, sync state, and shift close.
- Physical execution: anything that must happen in the aisle before central proof can exist.

## Allowed Public Evidence

Use only bounded labels like:

- `Produto real confirmado`
- `Lote real confirmado`
- `Resolucao terminal confirmada`
- `Aparelho Loja 18 #1`
- `Aparelho Loja 18 #2`
- `Push seguro confirmado`
- `Camera indisponivel com fallback registrado`
- `Fechamento seguro confirmado`
- `Lideranca Loja 18`
- `Operacao Loja 18`

Allowed metadata:

- Step state: `passed`, `pending`, `blocked`, or `external_blocked`
- Timestamp
- Owner route
- Masked device label
- Generic role label
- Public-safe evidence label
- Cause and next action when blocked or pending

## Forbidden Public Evidence

Do not commit or paste:

- Real product names.
- Readable lot identifiers.
- Photos, thumbnails, or binary evidence.
- Push tokens, provider payloads, request receipts, private build links, or signed object links.
- Raw device identifiers.
- Phone numbers, emails, CPF, or personal names.
- Free-text notes that identify a real person, supplier, device, or private store event.

If evidence is rejected for privacy, record:

- State: `pending`
- Cause: `Evidencia contem dado sensivel`
- Next action: `Registre uma evidencia sanitizada em Operacao`

## Verdict Criteria

### Go

Use `Go` only when all are true:

- All nine runbook steps are `passed`.
- Approved APK/build is installed on approved devices.
- Second approved mobile device has read the same central facts.
- Safe push proof is recorded from the approved device path.
- Camera/fallback proof is recorded as sanitized status.
- Safe shift close is confirmed after central revalidation.
- No `critical` or `external` pilot blocker remains.

Copy: `Go confirmado para Loja 18 com prova central completa e fechamento seguro.`

### No-Go

Use `No-Go` when an actionable critical blocker exists, including:

- Blocked central read.
- Critical sync conflict.
- Incompatible build.
- Invalid store/account/device authorization.
- Unresolved critical task.
- Unsafe shift close.
- Any blocked UAT step that the store/team can act on.

Copy pattern: `No-Go: X impede a validacao. Corrija em Z antes de continuar.`

### Aguardando Prova Externa

Use `Aguardando prova externa` when no actionable critical blocker remains, but real evidence is missing or still external, including:

- Approved APK installed proof.
- Remote push proof.
- Camera/fallback proof.
- Second approved mobile device proof.
- Physical Loja 18 UAT proof.
- Sanitized final evidence label.

Copy pattern: `Ainda nao e Go porque falta prova X. Faca a acao em Z.`

## Leadership Review Checklist

- Confirm `Validacao` shows the nine steps in order.
- Confirm every non-passed row has cause and next action.
- Confirm `Aparelhos`, `Atualizacoes`, and `Operacao` own the missing actions.
- Confirm no manual pass control was used as validation truth.
- Confirm public artifacts contain only allowed evidence labels.
- Confirm installed APK, provider push, camera/fallback, second-device convergence, safe close, and physical Loja 18 UAT are either proven with approved labels or kept as explicit blockers.

## Current Repository Sign-Off

Repository gates can prove contracts, API derivation, UI behavior, mobile boundaries, and public-safe artifact scanning. They do not prove the real Android install, remote provider receipt, camera hardware, second-device physical convergence, or in-aisle Loja 18 UAT.

Until those external proofs are recorded through approved public-safe labels, the correct status is `Aguardando prova externa` or `No-Go`, not physical Go.
