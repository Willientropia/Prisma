// Vitest (ADENDO 03, C1): projeto "unit" em Node e projeto "browser" no Edge do Windows (Chromium),
// para os componentes com MathLive e TipTap, que não funcionam em jsdom.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
  plugins: [react()],
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.d.ts', 'src/main.tsx', 'src/dev/**'],
      reporter: ['json', 'json-summary', 'text-summary'],
      reportsDirectory: 'test-results/coverage',
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts', 'tests/meta/**/*.test.ts'],
          exclude: ['src/**/*.browser.test.{ts,tsx}'],
        },
      },
      {
        extends: true,
        test: {
          name: 'browser',
          include: ['src/**/*.browser.test.{ts,tsx}'],
          browser: {
            enabled: true,
            headless: true,
            // Edge instalado (Chromium): o download do Chromium do Playwright passa por rede bloqueada
            provider: playwright({ launchOptions: { channel: 'msedge' } }),
            instances: [{ browser: 'chromium', viewport: { width: 1440, height: 900 } }],
          },
        },
      },
    ],
  },
});
