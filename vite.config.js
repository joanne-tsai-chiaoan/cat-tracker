import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',

  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    // Exclude Playwright E2E tests — those run via `npm run test:e2e`
    exclude: ['**/node_modules/**', '**/e2e/**', '**/*.spec.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['storage.js', 'auth.js', 'components/**/*.jsx'],
    },
  },
});
