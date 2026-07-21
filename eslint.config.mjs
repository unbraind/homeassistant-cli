import globals from "globals";
import jsdoc from "eslint-plugin-jsdoc";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**"],
  },
  {
    files: ["src/**/*.ts", "tests/**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      jsdoc,
    },
    rules: {
      "no-debugger": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-import-type-side-effects": "error",
      "@typescript-eslint/no-require-imports": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { "fixStyle": "inline-type-imports" }],
      "no-restricted-syntax": [
        "error",
        { "selector": "ImportExpression", "message": "Dynamic imports are prohibited; use top-level imports." },
        { "selector": "TSImportType", "message": "Inline import types are prohibited; use top-level type imports." },
        { "selector": "TSEnumDeclaration", "message": "Enums require runtime emit; use const objects and unions." },
        { "selector": "TSModuleDeclaration", "message": "Namespaces and TypeScript modules are prohibited." },
        { "selector": "TSParameterProperty", "message": "Parameter properties are prohibited by erasable syntax." }
      ],
    },
  },
];
