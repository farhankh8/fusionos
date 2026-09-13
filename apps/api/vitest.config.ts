import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

/**
 * FusionOS API Vitest configuration.
 *
 * The SWC transform is REQUIRED: NestJS dependency injection relies on
 * `emitDecoratorMetadata` (design:paramtypes), which esbuild — vitest's
 * default transform — does not support. Without it, modules cannot boot
 * inside tests, which is why the application-layer E2E suite
 * (src/__tests__/e2e/application-layer-e2e.test.ts) needs this.
 */
export default defineConfig({
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        target: 'es2022',
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/__tests__/**',
        'src/main.ts',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
      ],
      thresholds: {
        statements: 35,
        branches: 50,
        functions: 15,
        lines: 35,
      },
    },
  },
});