import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Flat ESLint config (ESLint 9).
 *
 * NOTE: Next.js-specific rules (`eslint-config-next`) are added in stage 0.3 when the
 * Next app is scaffolded. This base config covers TS strictness + import ordering so
 * the tooling (and pre-commit hooks) work from day one.
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
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Node-side files: build scripts, config, and Supabase tooling.
    files: ['**/*.mjs', '**/*.cjs', 'scripts/**/*.{js,ts}', '*.config.*'],
    languageOptions: {
      globals: globals.node,
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
