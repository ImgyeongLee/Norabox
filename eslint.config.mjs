import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Every page is dynamic, so Next's default link prefetch costs a function run per visible link.
    rules: {
      "no-restricted-imports": ["error", {
        paths: [{ name: "next/link", message: "Use @/components/AppLink (prefetch off by default)." }],
      }],
    },
  },
  { files: ["src/components/AppLink.tsx"], rules: { "no-restricted-imports": "off" } },
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
