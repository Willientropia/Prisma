// `test` dos testes de interface: com PRISMA_COVERAGE=1 (o verify liga), guarda a cobertura V8 do
// código de src/ que a página executou; scripts/coverage.ts soma com a do Vitest (C7.5).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test as base } from '@playwright/test';

export { expect } from '@playwright/test';

const OUT = join(import.meta.dirname, '../../test-results/coverage-e2e');

export const test = base.extend({
  page: async ({ page }, use, info) => {
    const on = !!process.env.PRISMA_COVERAGE;
    if (on) await page.coverage.startJSCoverage({ resetOnNavigation: false });
    await use(page);
    if (!on) return;
    const mine = (await page.coverage.stopJSCoverage()).filter((e) => /\/src\/.*\.tsx?(\?|$)/.test(e.url) && !e.url.includes('/src/dev/'));
    mkdirSync(OUT, { recursive: true });
    writeFileSync(join(OUT, `${info.testId}.json`), JSON.stringify(mine));
  },
});
