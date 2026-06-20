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
            "apps/api/src/index.test.ts",
            "apps/mobile/src/App.test.tsx",
            "apps/mobile/src/capture/capture-contract.test.ts",
            "apps/mobile/src/capture/capture-repository.test.ts",
            "apps/mobile/src/capture/product-lookup.test.tsx",
            "apps/mobile/src/capture/lot-registration.test.tsx",
            "apps/mobile/src/capture/observation-composer.test.tsx",
            "apps/mobile/src/capture/presence-observation.test.ts",
            "apps/mobile/src/capture/reinforced-confirmation.test.ts",
            "apps/mobile/src/capture/camera-fallback.test.ts",
            "apps/mobile/src/capture/mobile-capture.accessibility.test.ts",
            "apps/mobile/src/capture/today-task-repository.test.ts",
            "apps/mobile/src/capture/today-screen.test.tsx",
            "apps/mobile/src/capture/today-task-fixtures.test.ts",
            "apps/web/e2e/smoke.spec.ts",
            "apps/web/src/App.test.tsx",
            "apps/web/vite.config.ts",
            "packages/config/src/index.test.ts",
            "packages/domain/src/commands.test.ts",
            "packages/domain/src/presence.test.ts",
            "packages/domain/src/profiles.test.ts",
            "packages/domain/src/risk.test.ts",
            "packages/domain/src/risk.scenarios.test.ts",
            "packages/domain/src/tasks.test.ts",
            "packages/domain/src/types.test.ts",
            "packages/contracts/src/tasks.test.ts",
            "packages/test-utils/src/fixtures.test.ts",
            "playwright.config.ts",
            "vitest.config.ts",
          ],
          maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 29,
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
