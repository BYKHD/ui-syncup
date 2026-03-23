import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Build artifacts — never lint compiled output
    "cli/dist/**",
    // Agent/skill utility scripts — not app code
    ".agents/**",
  ]),
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // Relax noisy rules while we stabilize CI
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "off",
      "react/no-unescaped-entities": "warn",
      "react-hooks/purity": "off",
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/rules-of-hooks": "warn",
      "@next/next/no-html-link-for-pages": "warn",
    },
  },
  {
    files: ["**/__tests__/**/*.{ts,tsx}", "tests/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);

export default eslintConfig;
