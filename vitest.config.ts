import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      enabled: false,
      provider: "v8",
      reporter: ["text", "json-summary"],
    },
    projects: [
      {
        test: {
          name: "api",
          root: "apps/api",
          include: ["src/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          name: "web",
          root: "apps/web",
          include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
          environment: "jsdom",
        },
      },
      {
        test: {
          name: "mobile",
          root: "apps/mobile",
          include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
          environment: "node",
        },
      },
      {
        test: {
          name: "config",
          root: "packages/config",
          include: ["src/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          name: "domain",
          root: "packages/domain",
          include: ["src/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          name: "contracts",
          root: "packages/contracts",
          include: ["src/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          name: "database",
          root: "packages/database",
          include: ["src/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          name: "test-utils",
          root: "packages/test-utils",
          include: ["src/**/*.test.ts"],
          passWithNoTests: true,
          environment: "node",
        },
      },
    ],
  },
});
