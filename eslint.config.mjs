import js from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";
import globals from "globals";

export default [
  // ---- Global ignores ----
  {
    ignores: [
      "dist/**",
      "unpackage/**",
      "node_modules/**",
      "src/uni_modules/**",
      "src/js_sdk/**",
      "src/pkg/**",
      "scripts/**",
      ".hbuilderx/**",
      ".agents/**",
      "**/*.d.ts",
    ],
  },

  // ---- Base JS recommended (code-quality only) ----
  js.configs.recommended,

  // ---- TypeScript recommended (type-aware OFF to keep it fast) ----
  ...tseslint.configs.recommended,

  // ---- Vue 3 essential rules ----
  ...pluginVue.configs["flat/essential"],

  // ---- Project-wide settings ----
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2021,
        // uni-app globals
        uni: "readonly",
        wx: "readonly",
        plus: "readonly",
        getCurrentPages: "readonly",
        getApp: "readonly",
        UniApp: "readonly",
        UniHelper: "readonly",
        UniNamespace: "readonly",
        // Vue macros
        defineProps: "readonly",
        defineEmits: "readonly",
        defineExpose: "readonly",
        withDefaults: "readonly",
      },
    },
    rules: {
      // ---- Relax rules for gradual adoption ----

      // Allow unused vars prefixed with _ ; warn (not error) for others
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // Legacy code uses `any` extensively — warn only
      "@typescript-eslint/no-explicit-any": "warn",

      // Allow require() in legacy code
      "@typescript-eslint/no-require-imports": "off",

      // Allow empty functions (common in stubs / callbacks)
      "@typescript-eslint/no-empty-function": "off",

      // Allow non-null assertions (common in uni-app)
      "@typescript-eslint/no-non-null-assertion": "off",

      // Allow `@ts-ignore` / `@ts-nocheck` in legacy code — warn only
      "@typescript-eslint/ban-ts-comment": "warn",

      // Relax no-undef — TypeScript handles this better
      "no-undef": "off",

      // Allow console (needed for uni-app debugging)
      "no-console": "off",

      // Enforce single quotes to match existing codebase style
      quotes: ["warn", "single", { avoidEscape: true }],

      // Warn on debugger (should not ship)
      "no-debugger": "warn",

      // Vue: allow multi-word component names (uni-app pages are single-word)
      "vue/multi-word-component-names": "off",

      // Vue: allow v-html (common in rich-text rendering)
      "vue/no-v-html": "off",

      // Downgrade remaining rules for gradual adoption
      "@typescript-eslint/no-unused-expressions": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-unsafe-function-type": "warn",
      "no-empty": "warn",
      "no-useless-escape": "warn",
      "no-fallthrough": "warn",
      "no-case-declarations": "warn",
      "no-useless-assignment": "warn",
      "prefer-const": "warn",

      // Third-party rule that may exist in some configs
      "preserve-caught-error": "off",

      // Vue: downgrade to warn for legacy code
      "vue/require-valid-default-prop": "warn",
      "vue/no-deprecated-destroyed-lifecycle": "warn",
      "vue/no-reserved-keys": "warn",
      "vue/no-unused-vars": "warn",
    },
  },

  // ---- Vue SFC parser override ----
  {
    files: ["**/*.vue"],
    languageOptions: {
      parser: pluginVue.parser,
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
  },
];
