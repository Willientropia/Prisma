// Vitest (ADENDO 03, C1): projeto "unit" em Node e projeto "browser" no Edge do Windows (Chromium),
// para os componentes com MathLive e TipTap, que não funcionam em jsdom.
import { realpathSync } from 'node:fs';
import { searchForWorkspaceRoot } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // node_modules pode ser um atalho (junction) para outra pasta, como numa worktree: sem isto o Vite recusa servir
  // a cobertura e as fontes do MathLive aos testes de navegador, e a cobertura geral cai sem nenhum teste falhar
  server: { fs: { allow: [searchForWorkspaceRoot(process.cwd()), realpathSync('node_modules')] } },
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
          // no pre-commit (--mode commit) fica de fora o robustez.test.ts, que abre processos com prazo; ele roda no verify
          exclude: ['src/**/*.browser.test.{ts,tsx}', ...(mode === 'commit' ? ['src/engine/robustez.test.ts'] : [])],
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
            // Windows: Edge instalado (Chromium), porque o download do Chromium do Playwright passa por rede bloqueada.
            // Linux (VPS): o Chromium do Playwright (npx playwright install chromium)
            provider: playwright({ launchOptions: process.platform === 'win32' ? { channel: 'msedge' } : {} }),
            instances: [{ browser: 'chromium', viewport: { width: 1440, height: 900 } }],
          },
        },
      },
    ],
  },
}));
