import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Next.js compiles JSX itself (tsconfig keeps "preserve"); the test runner needs it transformed.
  esbuild: { jsx: 'automatic' },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
  },
});
