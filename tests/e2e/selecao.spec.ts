// F15: seleção com Ctrl+clique e Ctrl+A, setas movendo a cruz (docs/FOLHA-CHECKLIST.md S3, S5 e K4).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { CALC, dev, resultTexts, start } from './helpers';

const REGIONS = ['t1', 'entradas', 's', 'resultado', 'criterio', 'dv-por-secao'];

async function openString3(page: Page) {
  await start(page);
  await dev(page).open(`${CALC}/string-3.prsf`);
  await expect.poll(() => resultTexts(page)).toEqual(['3,2936V', '0,8234%']);
}
const selectedIds = (page: Page) => page.locator('[data-region][class*="regionOn"]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.region));
const sheet = (page: Page) => page.locator('[aria-label="Folha"]');

test('[F15-01] Ctrl+clique soma e tira regiões da seleção, também clicando no campo, sem entrar em edição', async ({ page }) => {
  await openString3(page);
  const s = (await page.locator('[data-region="s"]').boundingBox())!;
  await page.mouse.click(s.x + 1, s.y + 1);
  await page.locator('[data-region="entradas"] math-field').first().click({ modifiers: ['Control'] });
  await expect.poll(() => selectedIds(page).then((a) => a.sort())).toEqual(['entradas', 's']);
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('MATH-FIELD');
  await page.locator('[data-region="s"]').click({ modifiers: ['Control'], position: { x: 1, y: 1 } });
  await expect.poll(() => selectedIds(page)).toEqual(['entradas']);
  await page.keyboard.press('Delete');
  await expect(page.locator('[data-region="entradas"]')).toHaveCount(0);
  await expect(page.locator('[data-region="s"]')).toHaveCount(1);
});

test('[F15-02] Ctrl+A na folha seleciona todas as regiões; Delete apaga e Ctrl+Z devolve', async ({ page }) => {
  await openString3(page);
  const before = await dev(page).text();
  await sheet(page).click({ position: { x: 900, y: 1000 } });
  await page.keyboard.press('Control+A');
  await expect.poll(() => selectedIds(page).then((a) => a.sort())).toEqual([...REGIONS].sort());
  await expect(page.locator('[class*="cross"]')).toHaveCount(0);
  await page.keyboard.press('Delete');
  await expect(page.locator('[data-region]')).toHaveCount(0);
  await page.keyboard.press('Control+Z');
  await expect.poll(() => dev(page).text()).toBe(before);
});

test('[F15-03] setas movem a cruz um ponto da grade; a região nova nasce onde a cruz parou; a cruz não sai da página', async ({ page }) => {
  await openString3(page);
  await sheet(page).click({ position: { x: 600, y: 500 } });
  for (const k of ['ArrowRight', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'ArrowUp']) await page.keyboard.press(k);
  await page.keyboard.type('1');
  await expect.poll(() => dev(page).text()).toContain('```calc {#calc-1 x=640 y=480}');
  await page.keyboard.press('Escape');
  await sheet(page).click({ position: { x: 20, y: 1000 } });
  for (const k of ['ArrowLeft', 'ArrowLeft', 'ArrowLeft']) await page.keyboard.press(k);
  await page.keyboard.type('2');
  await expect.poll(() => dev(page).text()).toContain('```calc {#calc-2 x=0 y=1000}');
});
