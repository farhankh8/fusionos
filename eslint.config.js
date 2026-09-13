/**
 * FusionOS — ESLint 9 Flat Configuration
 *
 * Phase 28 (F-3): `npm run lint` was broken because ESLint 9 requires the
 * flat configuration format and the repository had none. This config reuses
 * the tooling already declared in the root package.json:
 *   - @eslint/js  (recommended base rules)
 *   - typescript-eslint  (TypeScript parser + recommended rules)
 *   - globals    (correct runtime globals per workspace)
 *
 * Deliberately NON-aggressive: correctness/security rules from the standard
 * `recommended` presets only. No stylistic rule farms, no type-aware lint
 * passes (the repo typechecks separately via tsc). Type-checked linting would
 * require per-workspace parserOptions.project wiring and is intentionally
 * out of scope — `npm run typecheck` already covers that signal.
 */

const js = require('@eslint/js');
const globals = require('globals');
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  {
    name: 'fusionos/global-ignores',
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
      '**/*.tsbuildinfo',
      '**/uploads/**',
      '**/test-results/**',
      '**/playwright-report/**',
      '**/.git/**',
      '**/*.min.js',
      '**/.turbo/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    name: 'fusionos/team-rules',
    rules: {
      // The recommended preset errors on explicit `any` (372 pre-existing uses
      // across 118 files). Typing all of them is a refactor, not a hardening
      // change — keep the rule VISIBLE as a warning so it is never silently
      // dropped, and drive the count down opportunistically.
      '@typescript-eslint/no-explicit-any': 'warn',
      // UI data loaders deliberately use `catch {}` (fire-and-forget refresh).
      // This is the standard-issue signal for "intentional swallow" — it keeps
      // no-empty active for genuine empty blocks (if/for/while) while allowing
      // the documented catch pattern.
      'no-empty': ['error', { allowEmptyCatch: true }],
      // Function parameters prefixed with `_` are intentionally unused (named
      // so for call-site clarity / API shape). Enforce the convention instead
      // of fighting it.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    name: 'fusionos/runtime-globals-node',
    files: ['**/*.{ts,tsx,js,mjs,cjs}'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
  },
  {
    name: 'fusionos/runtime-globals-web',
    files: ['apps/web/src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
);