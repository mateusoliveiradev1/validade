# Commands

This is the canonical command reference for Phase 1. Run commands from the repository root unless the command explicitly uses `--filter`.

## Install

| Command                          | Purpose                                       | CI-safe |
| -------------------------------- | --------------------------------------------- | ------- |
| `pnpm install --frozen-lockfile` | Install the exact workspace dependency graph. | Yes     |

## Root Scripts

| Script             | Command                 | Purpose                                                                        | CI-safe     |
| ------------------ | ----------------------- | ------------------------------------------------------------------------------ | ----------- |
| `dev`              | `pnpm dev`              | Run app dev tasks in parallel through Turbo.                                   | No          |
| `build`            | `pnpm build`            | Build or typecheck all workspace build targets.                                | Yes         |
| `typecheck`        | `pnpm typecheck`        | Run strict TypeScript checks across apps and packages.                         | Yes         |
| `lint`             | `pnpm lint`             | Run ESLint plus dependency-boundary scanner.                                   | Yes         |
| `format`           | `pnpm format`           | Write Prettier formatting changes.                                             | No          |
| `format:check`     | `pnpm format:check`     | Verify Prettier formatting.                                                    | Yes         |
| `test`             | `pnpm test`             | Run the root Vitest project matrix.                                            | Yes         |
| `test:smoke`       | `pnpm test:smoke`       | Run API, web, and mobile smoke projects only.                                  | Yes         |
| `test:e2e:web`     | `pnpm test:e2e:web`     | Run Playwright web smoke against the Vite app.                                 | Local setup |
| `test:e2e:mobile`  | `pnpm test:e2e:mobile`  | Run Maestro mobile smoke against a device or emulator.                         | Local setup |
| `test:mutation`    | `pnpm test:mutation`    | Run Stryker mutation testing for future critical rules.                        | Local setup |
| `security`         | `pnpm security`         | Run env, secret, data-safety, and package security gates.                      | Yes         |
| `security:env`     | `pnpm security:env`     | Validate `.env.example` required keys and fake values.                         | Yes         |
| `security:secrets` | `pnpm security:secrets` | Scan code, docs, workflows, root files, and `.env.example` for secrets.        | Yes         |
| `security:data`    | `pnpm security:data`    | Scan code, docs, and README for real-data-looking content.                     | Yes         |
| `check`            | `pnpm check`            | Run the full baseline: typecheck, lint, format, tests, smoke, build, security. | Yes         |

## App Dev Commands

| App    | Command                                   | Notes                                            |
| ------ | ----------------------------------------- | ------------------------------------------------ |
| API    | `pnpm --filter @validade-zero/api dev`    | Starts Wrangler dev for the Hono Worker surface. |
| Web    | `pnpm --filter @validade-zero/web dev`    | Starts Vite on `127.0.0.1`.                      |
| Mobile | `pnpm --filter @validade-zero/mobile dev` | Starts Expo.                                     |

## Package Test Commands

| Package/App | Command                                        |
| ----------- | ---------------------------------------------- |
| API         | `pnpm --filter @validade-zero/api test`        |
| Web         | `pnpm --filter @validade-zero/web test`        |
| Mobile      | `pnpm --filter @validade-zero/mobile test`     |
| Config      | `pnpm --filter @validade-zero/config test`     |
| Test utils  | `pnpm --filter @validade-zero/test-utils test` |

## Safety Notes

- Use `.env.example` as the only committed env contract.
- Keep local env files untracked.
- Use `@validade-zero/test-utils` fixtures instead of ad-hoc sample data.
- Do not commit real evidence photos or operational exports.
- Keep `pnpm check` green before moving between phase plans.
