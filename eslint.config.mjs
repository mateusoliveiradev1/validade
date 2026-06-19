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
            "apps/web/src/App.test.tsx",
            "apps/web/vite.config.ts",
          ],
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
