---
quick_id: 260702-gpl
description: Corrigir login local para testar Controle GPP web
status: passed
verified: 2026-07-02T20:03:09-03:00
---

# Quick Task 260702-gpl Verification

## Must-Have Results

| Must-have | Status | Evidence |
|---|---|---|
| Conta `gpp` ativa autentica com `controle_gpp_enabled` ligado. | PASSED | `POST /auth/login` retornou `authenticated`, `activeRole=gpp`, `canReadGppQueue=true`. |
| Sessao de login expoe flag e acoes GPP. | PASSED | Teste de autenticacao cobre ativacao e login com `featureFlags.controle_gpp_enabled=true` e acoes GPP. |
| Vite web local encaminha `/gpp`. | PASSED | `GET http://127.0.0.1:4173/gpp/queue?storeId=loja-piloto` retornou dados com token da conta GPP. |
| Verificacoes focadas passam. | PASSED | Vitest API, typecheck API e testes web GPP/App passaram. |

## Notes

- A credencial local usada para teste e fake, em memoria, com dominio `.invalid`.
- O processo local semeia 2 grupos de avaria e 1 compra interna somente para teste de navegador.
