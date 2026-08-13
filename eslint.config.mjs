import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Guardrail (nexa-docs/docs/PHASE-0.md Task 8): the API is reached only through
  // src/lib/api.ts — no raw fetch/axios anywhere else.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/api.ts"],
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: "Call the API only through src/lib/api.ts." },
      ],
      "no-restricted-imports": [
        "error",
        { paths: [{ name: "axios", message: "Use src/lib/api.ts, not axios." }] },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
