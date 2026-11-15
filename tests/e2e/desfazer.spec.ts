// Desfazer do documento (pedido do usuário, 14/11): Ctrl+Z volta zoom do gráfico e região movida, na ordem; Ctrl+Y refaz.
import { expect, test } from './fixtures';
import { DOCS, dev, start } from './helpers';

const REF = `${DOCS}/referencia-integral-grafico.prsf`;

test('Ctrl+Z desfaz a região movida e depois o zoom do gráfico; Ctrl+Y refaz', async ({ page }) => {
  await start(page);
  await dev(page).open(REF);
  const original = await dev(page).text();
  const svg = page.locator('[data-grafico] svg[data-view]');
  await expect(svg).toHaveAttribute('data-view', /"x":\[0,3\]/);
  // 1) zoom no gráfico selecionado
  const g = (await svg.boundingBox())!;
  await svg.click({ position: { x: 150, y: 100 } });
  await page.mouse.move(g.x + 150, g.y + 100);
  await page.mouse.wheel(0, -100);
  await expect.poll(() => dev(page).text()).not.toContain('x: {min: 0, max: 3');
  const zoomed = await dev(page).text();
  await page.waitForTimeout(900); // passo separado do próximo
  // 2) mover a região da função pela moldura
  const region = page.locator('[data-region="F"]');
  const r = (await region.boundingBox())!;
  await page.mouse.move(r.x + 1, r.y + 1);
  await page.mouse.down();
  await page.mouse.move(r.x + 60, r.y + 1, { steps: 5 });
  await page.mouse.move(r.x + 81, r.y + 1, { steps: 3 });
  await page.mouse.up();
  await expect.poll(() => dev(page).text()).toContain('```calc {#F x=120 y=40}');
  const moved = await dev(page).text();
  await page.getByLabel('Folha').click({ position: { x: 900, y: 700 } }); // foco na folha, fora de campo
  await page.keyboard.press('Control+z');
  await expect.poll(() => dev(page).text()).toBe(zoomed); // a região volta, o zoom fica
  await page.keyboard.press('Control+z');
  await expect.poll(() => dev(page).text()).toBe(original); // o zoom também volta
  await expect(svg).toHaveAttribute('data-view', /"x":\[0,3\]/);
  await page.keyboard.press('Control+y');
  await page.keyboard.press('Control+y');
  await expect.poll(() => dev(page).text()).toBe(moved);
});

test('com o foco num campo, Ctrl+Z é o desfazer do campo e não mexe no documento', async ({ page }) => {
  await start(page);
  await dev(page).open(REF);
  const original = await dev(page).text();
  await page.locator('[data-region="F"] math-field').click();
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(300);
  expect(await dev(page).text()).toBe(original);
});
