// F14: copiar, recortar e colar regiões da folha (docs/FOLHA-CHECKLIST.md C1, C2, C3, C6 e D2).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { CALC, dev, resultTexts, start } from './helpers';

const S = '```calc {#s x=230 y=76}\nS := 4 mm^2\n```';

async function openString3(page: Page) {
  await start(page);
  await dev(page).open(`${CALC}/string-3.prsf`);
  await expect.poll(() => resultTexts(page)).toEqual(['3,2936V', '0,8234%']);
}

/** Seleciona a região pela moldura, fora do campo, como no arrasto (F3-04). */
async function selectRegion(page: Page, id: string) {
  const box = (await page.locator(`[data-region="${id}"]`).boundingBox())!;
  await page.mouse.click(box.x + 1, box.y + 1);
  await expect(page.locator('[aria-label="Folha"]')).toBeFocused();
}

/** Clica num ponto vazio da folha: a cruz fica no ponto da grade mais próximo. */
const clickSheet = (page: Page, x: number, y: number) => page.locator('[aria-label="Folha"]').click({ position: { x, y } });

test('[F14-10] Ctrl+C numa região e Ctrl+V na cruz: cópia com id novo no ponto da cruz, selecionada; Ctrl+Z desfaz em um passo', async ({ page }) => {
  await openString3(page);
  const before = await dev(page).text();
  await selectRegion(page, 's');
  await page.keyboard.press('Control+C');
  await clickSheet(page, 600, 500);
  await page.keyboard.press('Control+V');
  await expect.poll(() => dev(page).text()).toContain('```calc {#s-1 x=600 y=500}\nS := 4 mm^2\n```');
  expect(await dev(page).text()).toContain(S); // a original continua no lugar
  await expect(page.locator('[data-region="s-1"]')).toHaveClass(/regionOn/);
  await expect(page.locator('[data-region="s"]')).not.toHaveClass(/regionOn/);
  await expect.poll(() => resultTexts(page)).toEqual(['3,2936V', '0,8234%']); // a cópia fica depois dos resultados
  await page.keyboard.press('Control+Z');
  await expect.poll(() => dev(page).text()).toBe(before);
});

test('[F14-11] Ctrl+X tira a região e Ctrl+V a devolve com o mesmo id; sem cruz, cola no canto superior esquerdo da página, como no SMath', async ({ page }) => {
  await openString3(page);
  await selectRegion(page, 's');
  await page.keyboard.press('Control+X');
  await expect(page.locator('[data-region="s"]')).toHaveCount(0);
  expect(await dev(page).text()).not.toContain('{#s ');
  await page.keyboard.press('Control+V');
  await expect(page.locator('[data-region="s"]')).toHaveCount(1);
  expect(await dev(page).text()).toContain('```calc {#s x=20 y=20}\nS := 4 mm^2\n```');
});

test('[F14-12] botão direito: Copiar na região e Colar na área vazia cola no ponto do clique; Apagar tira a região', async ({ page }) => {
  await openString3(page);
  await page.locator('[data-region="s"]').click({ button: 'right', position: { x: 1, y: 1 } });
  await page.getByRole('menuitem', { name: 'Copiar' }).click();
  await page.locator('[aria-label="Folha"]').click({ button: 'right', position: { x: 700, y: 900 } });
  await page.getByRole('menuitem', { name: 'Colar' }).click();
  await expect.poll(() => dev(page).text()).toContain('```calc {#s-1 x=700 y=900}\nS := 4 mm^2\n```');
  await page.locator('[data-region="s-1"]').click({ button: 'right', position: { x: 1, y: 1 } });
  await page.getByRole('menuitem', { name: 'Apagar' }).click();
  await expect(page.locator('[data-region="s-1"]')).toHaveCount(0);
  expect(await dev(page).text()).toContain(S);
});
