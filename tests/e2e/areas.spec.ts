// F17: a área vale pela posição na tela, como o resto da folha (F3-05; checklist R2, R3 e R5; usuário, 19/11).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { dev, resultTexts, start } from './helpers';

const F = '```';
const FILE = 'C:/Users/voce/Documents/areas.prsf';
const sheetText = (body: string) => `---\ntipo: folha\ntitulo: Áreas\nbibliotecas: []\npagina: {largura: 1200, altura: 1600, grade: 20}\nversao_formato: 1\n---\n\n${body}`;
// "dentro" está escrita depois da área no arquivo, mas na tela fica entre as duas linhas
const BODY = (recolhida: boolean) =>
  `${F}area {#rms titulo="Valores RMS" y=100${recolhida ? ' recolhida' : ''}}\n${F}\n\n${F}fim-area {#rms y=220}\n${F}\n\n` +
  `${F}calc {#baixo x=40 y=260}\ny = ?\n${F}\n\n${F}calc {#dentro x=40 y=140}\ny := 3\n${F}\n`;

async function open(page: Page, recolhida = false) {
  await start(page);
  await dev(page).write(FILE, sheetText(BODY(recolhida)));
  await dev(page).open(FILE);
  await expect.poll(() => resultTexts(page)).toEqual(['3']); // a ordem de cálculo também é pela posição
}

test('[F17-03] região entre as linhas da área recolhe com ela, mesmo escrita fora da área no arquivo', async ({ page }) => {
  await open(page, true);
  await expect(page.locator('[data-region="dentro"]')).toHaveCount(0);
  await expect(page.locator('[data-region="baixo"]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Expandir área' }).click();
  await expect(page.locator('[data-region="dentro"]')).toHaveCount(1);
});

test('[F17-04] arrastar a linha de título leva a área e as regiões de dentro; as de fora ficam', async ({ page }) => {
  await open(page);
  const head = page.locator('[data-area="rms"] [class*="areaHead"]');
  const box = (await head.boundingBox())!;
  await page.mouse.move(box.x + box.width - 4, box.y + box.height / 2); // fora do botão de recolher
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 4, box.y + box.height / 2 + 50, { steps: 4 });
  await page.mouse.move(box.x + box.width - 4, box.y + box.height / 2 + 100, { steps: 4 });
  await page.mouse.up();
  await expect.poll(() => dev(page).text()).toContain(`${F}area {#rms titulo="Valores RMS" y=200}`);
  const text = await dev(page).text();
  expect(text).toContain(`${F}fim-area {#rms y=320}`);
  expect(text).toContain(`${F}calc {#dentro x=40 y=240}`);
  expect(text).toContain(`${F}calc {#baixo x=40 y=260}`); // estava fora da área: não se move
});

test('[F17-05] Desfazer área tira as duas linhas; as regiões ficam onde estavam', async ({ page }) => {
  await open(page);
  await page.locator('[data-area="rms"] [class*="areaHead"]').click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Desfazer área' }).click();
  await expect(page.locator('[data-area]')).toHaveCount(0);
  const text = await dev(page).text();
  expect(text).not.toContain('area {');
  expect(text).toContain(`${F}calc {#dentro x=40 y=140}`);
  expect(text).toContain(`${F}calc {#baixo x=40 y=260}`);
});
