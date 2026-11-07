// Testes de interface (ADENDO 02, B10) com teclado de verdade, no Edge instalado no Windows (sem baixar navegador).
// Rodam contra o modo navegador (npm run dev): disco em memória com resources/exemplos.
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 30_000,
  workers: 1,
  use: { channel: 'msedge', baseURL: 'http://localhost:1420', viewport: { width: 1440, height: 900 } },
  webServer: { command: 'npm run dev', url: 'http://localhost:1420', reuseExistingServer: true, timeout: 60_000 },
});
