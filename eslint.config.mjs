import js from '@eslint/js';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import prettier from 'eslint-config-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Flat ESLint config (ESLint 9).
 *
 * `eslint-config-next` (v16+) ships a native flat config array, so it's spread in
 * directly rather than bridged through `FlatCompat` (which only understands the
 * legacy `.eslintrc`-style shareable configs and errors on this package's native
 * export). `eslint-config-next/core-web-vitals` already includes the base `next`
 * rules plus Core Web Vitals checks.
 */
export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'coverage/**',
      'lib/supabase/types.gen.ts',
      'supabase/functions/**', // Deno runtime — linted separately
      'next-env.d.ts',
    ],
  },
  js.configs.recommended,
  // Next's flat config sets its own (Babel-based) parser for **/*.{js,jsx,mjs,ts,tsx,mts,cts}.
  // Spread it BEFORE `tseslint.configs.recommended` so the TS-strict parser (needed by
  // our type-aware rules below, e.g. `consistent-type-imports`) wins for every file.
  ...nextCoreWebVitals,
  ...tseslint.configs.recommended,
  {
    // Node-side files: build scripts, config, and Supabase tooling.
    files: ['**/*.mjs', '**/*.cjs', 'scripts/**/*.{js,ts}', '*.config.*'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // App Router + UI Kit: Server & Client Components alike run in the browser at
    // some point (RSC output hydrates client-side), so browser globals apply.
    files: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
    },
  },
  prettier,
);
