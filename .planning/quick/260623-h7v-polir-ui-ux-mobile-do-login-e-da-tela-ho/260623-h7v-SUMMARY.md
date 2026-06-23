---
id: 260623-h7v
title: Polir UI/UX mobile e preparar APK staging
status: complete
date: 2026-06-23
---

# Summary

Polish aplicado nas telas mobile de login, Hoje, shell autenticado e Centro de Privacidade, mantendo a semantica operacional do Phase 09: seguro apenas quando confirmado, sincronizado apenas quando ack existe, e privacidade sem juridiquês cru.

## Entregas

- Login mobile ganhou bloco de marca operacional, painel de credenciais e acoes de primeiro acesso/suporte visiveis no primeiro viewport.
- Shell autenticado ficou mais compacto, com loja/papel/sessao e acoes de privacidade/sair sem ocupar o topo inteiro.
- Hoje ganhou hero de seguranca, metricas compactas, acoes primarias mais claras e removeu botao de sincronizacao morto quando nao ha pendencias.
- Centro de Privacidade mobile foi transformado em hero + cards + formulario LGPD separado.
- Web Privacy manteve o h1 acessivel `Centro de Privacidade` para Playwright e leitores de tela.
- Perfil `staging` de EAS foi adicionado para APK interno Android, e o Worker ganhou `env.staging` com script de deploy.
- Guia de instalacao Android/staging foi atualizado com deploy API, secrets e build APK.

## Validacao

- `pnpm.cmd check` — PASS
- `pnpm.cmd test:e2e:mobile` — PASS no AVD `ValidadeZeroApi36`
- `pnpm.cmd test:e2e:web` — PASS, 5/5 Chromium
- `pnpm.cmd --filter @validade-zero/api exec wrangler deploy --env staging --dry-run` — PASS
- Detector Impeccable em `apps/mobile/src/auth`, `apps/mobile/src/capture`, `apps/mobile/src/privacy` e `apps/web/src/privacy` — PASS (`[]`)
- Banco configurado em `apps/api/.dev.vars` — reachable; 11/11 tabelas, 39/39 indices e 4/4 triggers esperados presentes.
- Conta solicitada — ativa em `loja-piloto` com papeis `lead` e `admin`.

## Bloqueios restantes

- Deploy real do Worker staging esta bloqueado porque `wrangler whoami` indica maquina nao autenticada.
- Build cloud/APK staging esta bloqueado porque `eas whoami` indica maquina nao autenticada.
- Nao ha `neonctl` nem token Neon no ambiente; foi possivel validar o banco por connection string, mas nao provar/renomear a branch visual no console Neon via CLI.
- Build Android debug local no Windows ainda pode bater no limite de caminho do CMake/New Architecture; o E2E foi destravado reiniciando o Metro em IPv4 e usando o APK ja instalado no emulador.
