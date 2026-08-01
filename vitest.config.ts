import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.ts', '**/*.spec.ts', '**/*.test.tsx', '**/*.spec.tsx'],
    exclude: ['node_modules', '.next', 'scripts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // Explicit include (replacing the removed `all: true` option) so files
      // never imported by any test are reported as 0% instead of omitted.
      include: ['app/**/*.{ts,tsx}', 'lib/**/*.ts', 'middleware.ts'],
      exclude: ['node_modules', '.next', '**/*.config.*', 'scripts', '**/*.test.{ts,tsx}'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
