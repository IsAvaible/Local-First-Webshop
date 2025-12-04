import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";
import tseslint from "typescript-eslint";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      reactHooks.configs["recommended-latest"],
      reactRefresh.configs.vite,
      // Enable lint rules for React
      reactX.configs["recommended-typescript"],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
      // Disable ESLint rules that might conflict with Prettier
      eslintPluginPrettierRecommended
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname
      },
      ecmaVersion: 2020,
      globals: globals.browser
    },
    ignores: [
      "eslint.config.js",
      "commitlint.config.js",
      "drizzle.config.ts",
      "prettier.config.ts",
      "src/vite-plugin-caddy.ts"
    ],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_"
        }
      ],
      "@typescript-eslint/consistent-type-definitions": "off",
      "prefer-template": "error",
      "no-template-curly-in-string": "error",
      "@typescript-eslint/only-throw-error": [
        "error",
        {
          allow: [
            {
              // This tells the rule to allow throwing the 'Redirect'
              // type exported from '@tanstack/router-core'
              from: "package",
              package: "@tanstack/router-core",
              name: "Redirect"
            }
          ]
        }
      ],
      "@typescript-eslint/no-misused-promises": [
        "error",
        {
          checksVoidReturn: {
            attributes: false
          }
        }
      ]
    }
  },
  {
    // disable react-refresh/only-export-components for shadcn UI components
    // remove this once https://github.com/shadcn-ui/ui/issues/7736 is resolved
    // or vite switches to bundle mode in the dev server
    files: ["src/components/ui/**/*.tsx"],
    rules: {
      "react-refresh/only-export-components": "off"
    }
  }
]);
