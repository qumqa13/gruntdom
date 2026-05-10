// ESLint 9 flat config for Gruntdom — F1-T9.
//
// Scope: the gruntdom/no-verifiable-without-provenance rule fires only on
// `src/data/__violation-fixture*.ts` for now. Widen to `src/data/**/*.ts`
// in F1-T11 once `plots.ts` carries real per-field provenance maps.
//
// `npm run lint` is intentionally narrowed to `src/data/` — full-`src/`
// lint requires installing `@next/eslint-plugin-next` (Next 16 dropped
// `next lint`), which is outside F1-T9 scope.
import tsParser from "@typescript-eslint/parser";
import noVerifiableWithoutProvenance from "./eslint-rules/no-verifiable-without-provenance.cjs";

export default [
  { ignores: [".next/**", "node_modules/**", "coverage/**", "public/**"] },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 2022, sourceType: "module", ecmaFeatures: { jsx: true } },
    },
  },
  {
    files: ["src/data/__violation-fixture*.ts"],
    plugins: { gruntdom: { rules: { "no-verifiable-without-provenance": noVerifiableWithoutProvenance } } },
    rules: { "gruntdom/no-verifiable-without-provenance": "error" },
  },
];
