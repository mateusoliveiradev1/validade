---
status: blocked
trigger: "Usuario quer fechamento automatico do push real Android e navegacao mobile perfeita, nao apenas handler minimo de voltar."
created: 2026-06-24
updated: 2026-06-24
---

# Debug Session: mobile-perfect-navigation-push

## Symptoms

- expected_behavior: O app mobile deve ter navegacao operacional com historico previsivel, voltar nativo Android por gesto/botao sem fechar o app indevidamente, e push real funcionando em aparelho Android quando o APK staging e instalado.
- actual_behavior: A navegacao ainda estava baseada em estado local `screen/setScreen`, e push Android real exige configuracao Firebase/FCM nativa ausente.
- error_messages: "Unable to get Firebase Messaging instance..." quando o APK nao contem configuracao Firebase Android.
- timeline: Apos validar login real no APK staging e remover o erro tecnico visivel de push.
- reproduction: Navegar em telas internas e usar gesto de voltar; tentar ativar alertas em APK sem `google-services.json`/FCM V1 configurado.

## Current Focus

- hypothesis: A navegacao fica confiavel se o app operacional usar uma pilha de rotas explicita em vez de telas soltas; push real so pode ser fechado automaticamente se houver acesso/criacao das credenciais Firebase e upload FCM V1 no EAS.
- test: Refatorar `CaptureApp` para stack router com push/replace/reset/pop, cobrir back Android e fluxos criticos em testes, verificar config Firebase/EAS disponivel.
- expecting: Back nativo sempre navega pela pilha; notificacoes e conclusoes resetam/abrem a rota correta; ausencia de credenciais Firebase fica como bloqueio externo objetivo.
- next_action: implement stack router and probe Firebase automation options
- reasoning_checkpoint:
- tdd_checkpoint:

## Evidence

- timestamp: 2026-06-24
  observation: O workspace nao contem `google-services.json`, service account FCM, Firebase CLI instalado ou credenciais Firebase locais.
  implication: Codigo JS nao consegue sozinho fazer o push real funcionar em Android release; falta configuracao nativa/externa.
- timestamp: 2026-06-24
  observation: O estado atual do `CaptureApp` usa `screen` e objetos selecionados separados.
  implication: O historico de navegacao nao e uma fonte unica da verdade e fica propenso a retornos inconsistentes.
- timestamp: 2026-06-24
  observation: `CaptureApp` foi refatorado para uma pilha explicita de rotas; a suite mobile passou com 29 arquivos e 148 testes, alem de typecheck limpo.
  implication: A navegacao operacional agora tem uma fonte unica de historico e cobre gestos Android em fluxos de tarefa e detalhe/observacao.
- timestamp: 2026-06-24
  observation: `pnpm dlx firebase-tools@latest projects:list --json` falhou com "Failed to authenticate, have you run firebase login?".
  implication: Fechar push Android real automaticamente exige login/credenciais Firebase externas antes de criar app Android, baixar `google-services.json` e gerar chave FCM V1.

## Eliminated

## Resolution

- root_cause: Navegacao operacional ainda estava acoplada a estado local por tela; push Android real depende de credenciais Firebase/FCM nativas que nao existem localmente e nao ha sessao Firebase CLI autenticada.
- fix: Refatorar `CaptureApp` para stack router explicito com `navigate`, `replace`, `resetToToday` e `goBack`; manter handlers nativos Android usando essa pilha; preparar o app para receber `google-services.json` e EAS FCM V1.
- verification: `pnpm.cmd --filter @validade-zero/mobile test`; `pnpm.cmd --filter @validade-zero/mobile typecheck`; `git diff --check`; `pnpm.cmd dlx firebase-tools@latest projects:list --json` para confirmar bloqueio de auth Firebase.
- files_changed: apps/mobile/src/capture/CaptureApp.tsx; apps/mobile/src/App.test.tsx; .planning/debug/mobile-perfect-navigation-push.md
