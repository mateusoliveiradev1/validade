---
status: blocked_on_vercel_auth
created: 2026-06-24
---

# Quick Task 260624-atx: Web UI/UX, convite funcional e deploy Vercel

## Objetivo

Melhorar a experiencia web do Validade Zero com o registro `product` do impeccable, corrigir o fluxo de convite/primeiro acesso para ficar acionavel ponta-a-ponta e publicar a versao web no Vercel.

## Plano

1. Mapear web/auth/memberships e confirmar falhas de deploy/convite.
2. Adicionar configuracao Vercel para build do monorepo web e rewrites da API staging.
3. Melhorar o fluxo de convite:
   - token visivel;
   - link de ativacao;
   - copiar token/link;
   - abrir primeiro acesso ja preenchido;
   - erros e sucesso claros.
4. Melhorar UI/UX web:
   - tema mais consistente e confiavel;
   - auth shell menos cru;
   - app shell mais operacional;
   - administracao de acessos com hierarquia melhor.
5. Cobrir com testes unitarios/e2e proporcionais.
6. Validar localmente e fazer deploy Vercel.

## Verificacao esperada

- `pnpm.cmd --filter @validade-zero/web test`
- `pnpm.cmd --filter @validade-zero/web typecheck`
- `pnpm.cmd --filter @validade-zero/web build`
- navegador local em `http://127.0.0.1:3000`
- deploy Vercel com URL final acessivel

## Resultado local

- Convite web agora gera token, link de ativacao e acao para abrir primeiro acesso preenchido.
- `/?invite=<token>` abre diretamente a tela de primeiro acesso com o codigo preenchido.
- UI web recebeu polimento operacional no auth shell, app shell, administracao de acessos, tabela e tokens visuais.
- Testes web: 27/27 passaram.
- Build web de producao passou.
- Validacao local confirmou a tela inicial e o link de convite preenchido.

## Bloqueio atual

- Deploy Vercel nao foi executado porque o ambiente nao tem `VERCEL_TOKEN`, nao tem `.vercel/` linkado e `vercel.cmd whoami` ficou aguardando login interativo.
