---
quick_id: 260725-x9l
slug: gerar-nova-build-android-local-incluindo
status: complete
completed_at: 2026-07-26T00:11:00-03:00
commits:
  - 7c88cdb
  - 9f4ef28
---

# Summary: Build Android staging com correção de cadastro

## Resultado

- Corrigido o cadastro de produto com GTIN opcional: valor vazio é omitido, valor válido é normalizado e valor inválido é bloqueado com orientação antes da fronteira do repositório.
- Identidade pública e nativa alinhada em `0.12.0` build `173`.
- Artifact label: `product-registration-fix-staging-apk-173`.
- Build ref: `product-registration-fix-staging-173`.
- Package Android: `com.validadezero.app`.
- API configurada: `https://validade-zero-api-staging.validadezero.workers.dev`.
- Ambiente configurado: `staging`.

## Verificações

- `rtk proxy pnpm --filter @validade-zero/mobile typecheck`: passou sem erros.
- `rtk proxy pnpm --filter @validade-zero/mobile test`: 45 arquivos e 320 testes passaram.
- `rtk pnpm security:secrets`: passou.
- `rtk git diff --check`: passou.
- Diff inspecionado antes da build: somente correção de cadastro/GTIN, regressões e identidade do build `173` compunham o source set mobile.
- `rtk pnpm build:android:local`: passou.
- `aapt dump badging`: confirmou `package=com.validadezero.app`, `versionName=0.12.0` e `versionCode=173`.
- `apksigner verify --print-certs`: assinatura válida; certificado SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.
- SHA-256 do APK: `1f40cf5dedd93825f0b7e94387c69939b0a48eae34411072e54c083cef60177e`.

## Artefato

- Caminho absoluto: `C:\Users\Liiiraa\Documents\estudos\validade\artifacts\validade-zero-staging-0.12.0-173.apk`.
- Tamanho: `103432236` bytes.
- Gerado em: `2026-07-26 00:09` (America/Sao_Paulo).

## Limites da evidência

- O APK foi gerado e validado localmente.
- Não foi afirmada instalação em aparelho nem UAT físico; esses passos permanecem separados.
