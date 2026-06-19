# Validade Zero

Validade Zero e um aplicativo operacional, mobile-first, para apoiar equipes de hortifruti a manter produtos vencidos fora da area de venda. A Fase 1 entrega a fundacao tecnica: monorepo pnpm/Turborepo, apps smoke, pacotes compartilhados, quality gates, fixtures ficticias, CI e seguranca de repositorio publico.

## Estado Atual

- API Hono em `apps/api` com health check e safe probe local.
- Web React/Vite em `apps/web` com smoke de conexao segura.
- Mobile Expo em `apps/mobile` com smoke de tela inicial.
- Pacotes compartilhados em `packages/contracts`, `packages/config`, `packages/domain`, `packages/adapters` e `packages/test-utils`.
- Nenhum dado real, segredo real, foto real ou credencial operacional deve ser commitado.

## Requisitos Locais

- Node 24.
- pnpm 11 via Corepack ou instalacao local equivalente.
- Git.

```powershell
corepack enable
corepack prepare pnpm@11 --activate
pnpm install --frozen-lockfile
```

## Desenvolvimento

Rodar todos os apps em paralelo:

```powershell
pnpm dev
```

Rodar um app especifico:

```powershell
pnpm --filter @validade-zero/api dev
pnpm --filter @validade-zero/web dev
pnpm --filter @validade-zero/mobile dev
```

## Validacao

O gate principal local e o mesmo baseline usado pela CI:

```powershell
pnpm check
```

Ele roda typecheck, lint com boundary check, format check, testes Vitest, smoke tests, build e seguranca.

Comandos focados:

```powershell
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm test:smoke
pnpm build
pnpm security
```

Comandos locais opcionais com setup externo:

```powershell
pnpm test:e2e:web
pnpm test:e2e:mobile
pnpm test:mutation
```

Veja [docs/operations/commands.md](docs/operations/commands.md) para a lista completa.

## Ambiente

Use `.env.example` como contrato de variaveis. Copias locais como `.env`, `.env.*`, `.dev.vars` e `*.local` ficam fora do git.

Os valores de exemplo precisam continuar falsos, locais ou placeholders. Mobile e web nao devem receber credenciais privilegiadas de banco de dados.

## Adaptadores Fake/Locais

Phase 1 nao exige Neon, Cloudflare R2, Cloudflare Workers em producao, Expo Push ou outro provedor real. Os pontos de integracao nascem atras de adaptadores, com safe probe local e valores ficticios. Provedores reais entram em fases futuras, com threat model, env seguro e testes proporcionais.

## Seguranca De Repo Publico

Nenhum dado real entra no repositorio:

- Nada de segredos de producao.
- Nada de dados reais de loja, usuario, cliente, fornecedor, produto, lote, relatorio, venda ou estoque.
- Nada de fotos reais de evidencia, gondola, etiqueta, planilha privada ou export operacional.
- Fixtures devem usar `FICTICIO`, `EXEMPLO`, `example`, `placeholder`, `localhost` ou `00000000`.

Leituras obrigatorias:

- [docs/security/public-repo-safety.md](docs/security/public-repo-safety.md)
- [docs/security/threat-model-phase-01.md](docs/security/threat-model-phase-01.md)
- [docs/operations/free-pilot-limits.md](docs/operations/free-pilot-limits.md)
- [docs/testing/strategy.md](docs/testing/strategy.md)

Achados de seguranca `high` ou `critical` bloqueiam prontidao. Achados medios precisam virar risco aceito documentado ou backlog.

## Testes E TDD

Phase 1 tem smoke tests e checks de fixtures. A partir da Fase 2, regras criticas de dominio devem nascer com testes antes ou junto da implementacao. O Stryker ja esta configurado como superficie de mutacao para essas regras futuras, sem meta artificial enquanto elas ainda nao existem.

Use fixtures de `@validade-zero/test-utils` e estenda esse pacote antes de criar dados de exemplo soltos.

## CI

GitHub Actions executa install congelado, typecheck, lint, format check, tests, smoke tests, build e seguranca. Pull requests tambem rodam dependency review bloqueando achados `high` e `critical`. CodeQL cobre JavaScript/TypeScript.

Configuracao manual recomendada quando houver permissao no repositorio:

- Enable dependency graph.
- Enable Dependabot alerts.
- Enable secret scanning.
- Add branch protection requiring CI before merge.
