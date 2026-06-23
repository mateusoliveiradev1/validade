---
status: complete
quick_id: 260623-r8m
date: 2026-06-23
commit: 4854228
---

# Quick Task 260623-r8m Summary

## Goal

Configurar o APK Android staging para usar a API Cloudflare publicada e gerar um build interno instalável para teste em dispositivo real.

## Completed

- Publicou/validou a API staging em `https://validade-zero-api-staging.validadezero.workers.dev`.
- Vinculou o projeto Expo/EAS `@liiiraak1ng/validade-zero`.
- Configurou o perfil EAS `staging` com:
  - `EXPO_PUBLIC_API_URL=https://validade-zero-api-staging.validadezero.workers.dev`
  - `VALIDADE_ZERO_APP_ENV=staging`
  - build Android interno em formato APK.
- Adicionou `staging` ao schema compartilhado de ambientes.
- Ajustou `.gitignore` para permitir os assets estáticos da app em `apps/mobile/assets/*.png`, evitando que o arquivo enviado para EAS perca `icon.png`, `adaptive-icon.png` e `splash.png`.
- Removeu o `channel` do perfil staging porque `expo-updates` ainda não está instalado e o build interno não precisa desse canal agora.

## Verification

- `pnpm.cmd --filter @validade-zero/config test` — passou.
- `pnpm.cmd --filter @validade-zero/mobile typecheck` — passou.
- `pnpm.cmd dlx eas-cli@latest config --profile staging --platform android --json --non-interactive` — confirmou o env staging e o projectId EAS.
- Primeiro build EAS `cac0c727-c7d3-4c28-8638-cf7635a31282` falhou em prebuild porque os PNGs eram ignorados no archive.
- Build EAS final `6309d52e-f1e1-4073-975e-02026ccb431c` — `FINISHED`.

## APK

- Página do build: https://expo.dev/accounts/liiiraak1ng/projects/validade-zero/builds/6309d52e-f1e1-4073-975e-02026ccb431c
- APK direto: https://expo.dev/artifacts/eas/Ghh2ammmA9GMxNGqvDxphfzNDm2KBjEqli2_ez9qHYE.apk
