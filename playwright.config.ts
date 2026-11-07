// Playwright (ADENDO 03, C1 e C4): interface com o Tauri simulado (src/dev/tauri-mock.ts) e um disco em
// memória, contra o servidor do Vite. Usa o Edge instalado no Windows (sem baixar navegador).
// retries 0: teste instável se corrige, não se repete (C7.6).
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  timeout: 30_000,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'test-results/playwright.json' }]],
  outputDir: 'test-results/playwright',
  snapshotPathTemplate: 'tests/visual/__snapshots__/{arg}{ext}',
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled', caret: 'hide' } },
  use: { channel: 'msedge', baseURL: 'http://localhost:1420', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' },
  projects: [
    { name: 'e2e', testMatch: ['e2e/**/*.spec.ts', 'regressao/**/*.spec.ts'] },
    { name: 'visual', testMatch: ['visual/**/*.spec.ts'] },
  ],
  webServer: { command: 'npm run dev', url: 'http://localhost:1420', reuseExistingServer: true, timeout: 60_000 },
});
