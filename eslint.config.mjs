import eslintComments from "@eslint-community/eslint-plugin-eslint-comments";
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

const typedTypeScriptConfigs = tseslint.configs.recommendedTypeChecked.map((config) => ({
  ...config,
  files: ["**/*.{ts,tsx,mts,cts}"],
}));

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/coverage/**",
      "**/node_modules/**",
      "**/.turbo/**",
      "**/.expo/**",
      "**/.wrangler/**",
      "**/.stryker-tmp/**",
      "**/playwright-report/**",
      ".agents/**",
      ".codex/**",
      ".planning/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  ...typedTypeScriptConfigs,
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: [
            "apps/api/src/alerts.test.ts",
            "apps/api/src/audit.test.ts",
            "apps/api/src/authorization.test.ts",
            "apps/api/src/evidence.test.ts",
            "apps/api/src/index.test.ts",
            "apps/api/src/memberships.test.ts",
            "apps/api/src/sync.test.ts",
            "apps/api/src/shift-close.test.ts",
            "apps/mobile/src/App.test.tsx",
            "apps/mobile/src/capture/alert-state.test.ts",
            "apps/mobile/src/capture/audit-timeline.test.tsx",
            "apps/mobile/src/capture/capture-contract.test.ts",
            "apps/mobile/src/capture/capture-repository.test.ts",
            "apps/mobile/src/capture/product-lookup.test.tsx",
            "apps/mobile/src/capture/lot-registration.test.tsx",
            "apps/mobile/src/capture/observation-composer.test.tsx",
            "apps/mobile/src/capture/presence-observation.test.ts",
            "apps/mobile/src/capture/reinforced-confirmation.test.ts",
            "apps/mobile/src/capture/camera-fallback.test.ts",
            "apps/mobile/src/capture/mobile-capture.accessibility.test.ts",
            "apps/mobile/src/capture/markdown-workflow.test.ts",
            "apps/mobile/src/capture/offline-sync.test.ts",
            "apps/mobile/src/capture/today-task-repository.test.ts",
            "apps/mobile/src/capture/today-screen.test.tsx",
            "apps/mobile/src/capture/today-task-fixtures.test.ts",
            "apps/mobile/src/capture/task-resolution.test.tsx",
            "apps/mobile/src/capture/today-accessibility.test.tsx",
            "apps/mobile/src/capture/push-alerts.test.tsx",
            "apps/mobile/src/capture/push-channel.test.ts",
            "apps/mobile/src/capture/sync-engine.test.ts",
            "apps/mobile/src/capture/shift-close.test.tsx",
            "apps/mobile/src/capture/evidence-status.test.tsx",
            "apps/mobile/src/capture/evidence-upload.test.ts",
            "apps/web/e2e/smoke.spec.ts",
            "apps/web/e2e/audit-roles-shift-close.spec.ts",
            "apps/web/src/App.test.tsx",
            "apps/web/src/audit/AuditWorkbench.test.tsx",
            "apps/web/src/audit/evidence-access.test.tsx",
            "apps/web/src/auth/current-scope.test.tsx",
            "apps/web/src/memberships/memberships.test.tsx",
            "apps/web/vite.config.ts",
            "packages/adapters/src/evidence.test.ts",
            "packages/config/src/index.test.ts",
            "packages/contracts/src/authorization.test.ts",
            "packages/contracts/src/alerts.test.ts",
            "packages/contracts/src/audit.test.ts",
            "packages/contracts/src/evidence.test.ts",
            "packages/contracts/src/markdown.test.ts",
            "packages/contracts/src/sync.test.ts",
            "packages/contracts/src/shift-close.test.ts",
            "packages/domain/src/alerts.test.ts",
            "packages/domain/src/authorization.test.ts",
            "packages/domain/src/commands.test.ts",
            "packages/domain/src/evidence.test.ts",
            "packages/domain/src/markdown.test.ts",
            "packages/domain/src/presence.test.ts",
            "packages/domain/src/profiles.test.ts",
            "packages/domain/src/risk.test.ts",
            "packages/domain/src/risk.scenarios.test.ts",
            "packages/domain/src/sync.test.ts",
            "packages/domain/src/shift-close.test.ts",
            "packages/domain/src/tasks.test.ts",
            "packages/domain/src/types.test.ts",
            "packages/contracts/src/tasks.test.ts",
            "packages/database/src/repositories.test.ts",
            "packages/database/src/schema.test.ts",
            "packages/test-utils/src/fixtures.test.ts",
            "playwright.config.ts",
            "vitest.config.ts",
          ],
          maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 80,
        },
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      "@eslint-community/eslint-comments": eslintComments,
    },
    rules: {
      "@eslint-community/eslint-comments/require-description": ["error", { ignore: [] }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../apps/*", "../../apps/*", "../../../apps/*"],
              message: "Shared packages must not import app code.",
            },
            {
              group: ["../packages/adapters/*", "../../packages/adapters/*"],
              message: "Protected packages must depend on contracts/config/domain, not adapters.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.test.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
    },
  },
  {
    files: ["packages/domain/src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@validade-zero/adapters",
                "@validade-zero/adapters/*",
                "apps/*",
                "react",
                "react-dom",
                "react-native",
                "expo",
                "hono",
                "wrangler",
                "drizzle-orm",
                "@neondatabase/*",
                "pg",
                "@cloudflare/*",
                "expo-notifications",
              ],
              message:
                "The domain package is a pure business boundary and cannot import UI, app, provider, database, or adapter layers.",
            },
          ],
        },
      ],
    },
  },
);
