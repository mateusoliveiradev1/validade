---
id: 260623-b5m
title: Staging Neon e autenticacao persistente
status: complete
date: 2026-06-23
code_commit: 81605af
---

# Summary: Staging Neon e autenticacao persistente

## Resultado

- A API local agora exige configuracao persistente para banco e peppers de autenticacao quando roda como Worker.
- O web local encaminha rotas reais de autenticacao e operacao para a API em `127.0.0.1:8787`.
- A branch Neon `staging` recebeu as migracoes, foi verificada e ficou pronta para teste real sem alterar producao.
- A conta solicitada foi preparada no banco de staging com papeis de administracao e lideranca.
- O fluxo de primeiro acesso agora mostra erros acionaveis, estado de carregamento e politica de senha de 10 caracteres.
- O Centro de Privacidade foi reconstruido com hierarquia visual, cards, leitura mobile/desktop e acesso pelo menu mobile.

## Correcao do incidente

O login/ativacao falhava porque a politica de senha do contrato exigia 12 caracteres, enquanto a senha operacional solicitada para staging tinha 10 caracteres. A politica foi alinhada para 10 caracteres e o fluxo passou a mostrar erro visivel quando a ativacao falha, em vez de parecer que o botao nao fez nada.

## Verificacao

- `pnpm.cmd check`
- `pnpm.cmd --filter @validade-zero/contracts test`
- `pnpm.cmd --filter @validade-zero/web test`
- `pnpm.cmd --filter @validade-zero/api test`
- Detector Impeccable sem alertas para FirstAccess, PrivacyCenter e AppShell.
- Login real em `http://127.0.0.1:8787/auth/login` retornou sessao autenticada.
- Login real pelo browser em `http://127.0.0.1:3000/` abriu o Command Center da Loja Piloto - Staging.
- Centro de Privacidade foi aberto no browser com layout revisado e sem logs de warning/erro no console.
- Busca local confirmou que e-mail/senha reais da conta de staging nao ficaram versionados em `apps`, `packages` ou `.planning`.

## Seguranca

- `.dev.vars` local continua ignorado e nao foi versionado.
- Connection string real, peppers e senha real nao foram registrados nos commits.
- Os testes usam credenciais ficticias de dominio `.test` e URL `.invalid`.
