# UAT Debug: Today screen visual polish

## Symptom

During UAT test 10, the mobile screen was usable and understandable, but felt not fully refined or polished.

## Root Cause

The current UI intentionally satisfies accessibility and operational clarity, but the visual system is still MVP-level. `TodayScreen` and `capture-ui` rely on flat color slabs, square blocks, repeated pink critical backgrounds, and minimal component states. The screen has adequate information hierarchy for functionality, but lacks a more deliberate card/header treatment, spacing rhythm, pressed/disabled affordances, and calmer risk emphasis.

## Evidence

- `apps/mobile/src/capture/TodayScreen.tsx` uses repeated plain `View`/`Pressable` blocks with the same critical background for header and task rows.
- `apps/mobile/src/capture/capture-ui.tsx` primitives are square, minimal, and mostly tokenless beyond raw colors.
- Existing accessibility tests verify labels, touch targets, wrapping, and textual risk meaning, but do not assert visual refinement.

## Suggested Fix Direction

Run a focused UI polish pass on the Today workflow: introduce a small local token layer, refine cards/sections/buttons, add subtle hierarchy without hiding risk severity, and add screenshot-driven verification for the mobile viewport.
