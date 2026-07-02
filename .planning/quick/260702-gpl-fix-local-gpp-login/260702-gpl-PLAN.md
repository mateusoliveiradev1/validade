---
quick_id: 260702-gpl
description: Corrigir login local para testar Controle GPP web
status: complete
created: 2026-07-02
---

# Quick Task 260702-gpl: Corrigir Login Local GPP

## Objective

Permitir que o ambiente local tenha uma credencial fake de GPP capaz de autenticar e abrir a fila do Controle GPP pelo web dev server.

## Must-Haves

- O login de uma conta `gpp` ativa deve passar quando `controle_gpp_enabled` estiver ligado.
- A resposta de `/auth/login` e `/auth/session` deve expor `featureFlags.controle_gpp_enabled` e as acoes GPP.
- O Vite web local deve encaminhar chamadas `/gpp` para a API local.
- A credencial local deve ser validada por HTTP pela API e pelo proxy web.

## Tasks

| # | Files | Action | Verify | Done |
|---|-------|--------|--------|------|
| 1 | `apps/api/src/authentication.ts`, `apps/api/src/index.ts` | Conectar o feature flag GPP a autenticacao e expor acoes GPP na sessao. | Teste de login GPP e typecheck API. | Yes |
| 2 | `apps/api/src/authentication.test.ts` | Cobrir ativacao/login de conta `gpp` com flag ligado. | Vitest do arquivo de autenticacao. | Yes |
| 3 | `apps/web/vite.config.ts` | Adicionar proxy `/gpp` para a API local. | Login e fila GPP via `http://127.0.0.1:4173`. | Yes |

## Scope Notes

- Usar somente contas fake locais com dominio `.invalid`.
- Nao adicionar segredo, dado real ou dependencia de staging/producao.
- Nao alterar a regra de autorizacao de roles; apenas fazer a sessao de login refletir as capacidades ja existentes.
